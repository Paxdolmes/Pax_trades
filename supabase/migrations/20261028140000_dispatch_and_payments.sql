-- Relay: dispatch, scheduled jobs and payments.
--   * New and reassigned jobs are offered to the 3 nearest eligible pros; a pro who
--     didn't turn up is never offered that job again.
--   * pg_cron runs the dispatcher, the late-pro check, the 48-hour auto-confirm and
--     the charge for confirmed jobs (through the charge-jobs Edge Function).
--   * Stripe ids for customers' saved cards and each job's payment.

-- Payments ---------------------------------------------------------------------

alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_payment_method_id text; -- the card saved when the customer first requests

alter table public.jobs
  add column payment_intent_id text unique,
  add column payment_failed_at timestamptz;


-- Dispatch ---------------------------------------------------------------------

-- Same as before, plus: never a pro who was a no-show on this job.
create or replace function public.nearest_eligible_pros(
  p_job uuid,
  p_limit integer default 5,
  p_radius_m double precision default 8000
) returns table (pro_id uuid, distance_m double precision)
language sql stable security definer set search_path = '' as $$
  select p.id, extensions.st_distance(p.last_location, j.location)
  from public.jobs j
  join public.pros p
    on j.trade = any (p.trades)
   and p.approved_at is not null
   and p.is_online
   and p.last_location is not null
   and extensions.st_dwithin(p.last_location, j.location, p_radius_m)
  where j.id = p_job
    and public.pro_can_take(p.id, j.job_type_id)
    and not exists (
      select 1 from public.job_offers o where o.job_id = j.id and o.pro_id = p.id
    )
    and not exists (
      select 1 from public.no_shows n where n.job_id = j.id and n.pro_id = p.id
    )
  order by extensions.st_distance(p.last_location, j.location)
  limit p_limit;
$$;

-- Offers a job still looking for a pro to the next nearest pros, unless offers are
-- already live. The first to accept gets it. Returns how many offers went out.
create function public.dispatch_job(p_job uuid, p_batch integer default 3) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  perform 1 from public.jobs where id = p_job and status = 'requested' and location is not null for update;
  if not found then
    return 0;
  end if;
  if exists (select 1 from public.job_offers where job_id = p_job and status = 'pending' and expires_at > now()) then
    return 0;
  end if;
  update public.job_offers set status = 'expired' where job_id = p_job and status = 'pending';
  insert into public.job_offers (job_id, pro_id)
  select p_job, e.pro_id from public.nearest_eligible_pros(p_job, p_batch) e
  on conflict (job_id, pro_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Server job: retries every open job whose offers have run out.
create function public.dispatch_jobs() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  j record;
  n integer := 0;
begin
  for j in select id from public.jobs where status = 'requested' and created_at > now() - interval '1 day' loop
    n := n + public.dispatch_job(j.id);
  end loop;
  return n;
end;
$$;

-- Offer a job the moment it's requested, and again when a late pro loses it.
create function public.dispatch_on_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'requested' and (tg_op = 'INSERT' or old.status is distinct from 'requested') then
    perform public.dispatch_job(new.id);
  end if;
  return null;
end;
$$;

create trigger jobs_dispatch after insert or update of status on public.jobs
  for each row execute function public.dispatch_on_change();

-- The late pro's accepted offer is closed when the job is taken off them.
create or replace function public.reassign_late_jobs() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  n integer := 0;
begin
  for j in
    select * from public.jobs
     where status in ('accepted', 'en_route') and arrived_at is null
       and arrive_by + public.relay_setting('late_grace') < now()
     for update skip locked
  loop
    insert into public.no_shows (job_id, pro_id) values (j.id, j.pro_id);
    insert into public.customer_credits (customer_id, pence, reason, job_id)
      values (j.customer_id, public.no_show_credit_pence(), 'Your pro did not arrive in time', j.id);
    update public.job_offers set status = 'expired' where job_id = j.id and pro_id = j.pro_id;
    update public.jobs
       set status = 'requested', pro_id = null, accepted_at = null, arrive_by = null
     where id = j.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Confirmed jobs waiting to be charged, for the charge-jobs Edge Function.
create function public.jobs_to_charge(p_job uuid default null)
returns table (
  job_id uuid,
  amount_pence integer,
  fee_pence integer,
  customer_id text,
  payment_method_id text,
  destination text
)
language sql stable security definer set search_path = '' as $$
  select j.id,
         j.final_price_pence + j.tip_pence,
         round(j.final_price_pence * p.commission_rate)::integer, -- commission on the work, never the tip
         c.stripe_customer_id,
         c.stripe_payment_method_id,
         p.stripe_account_id
    from public.jobs j
    join public.pros p on p.id = j.pro_id
    join public.profiles c on c.id = j.customer_id
   where j.status = 'completed' and j.paid_at is null and j.payment_intent_id is null
     and j.payment_failed_at is null and j.final_price_pence is not null
     and (p_job is null or j.id = p_job);
$$;

revoke execute on function public.dispatch_job(uuid, integer) from public, anon, authenticated;
revoke execute on function public.dispatch_jobs() from public, anon, authenticated;
revoke execute on function public.jobs_to_charge(uuid) from public, anon, authenticated;
revoke execute on function public.reassign_late_jobs() from public, anon, authenticated;

-- Schedules ------------------------------------------------------------------
-- Only where pg_cron is available (Supabase); the plain Postgres used by the SQL
-- tests skips this. The charge call reads its URL and secret from Vault, so it does
-- nothing until those are added (see docs/going-live.md).

do $outer$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    return;
  end if;
  create extension if not exists pg_cron;
  perform cron.schedule('relay-dispatch', '30 seconds', 'select public.dispatch_jobs()');
  perform cron.schedule('relay-reassign-late', '*/2 * * * *', 'select public.reassign_late_jobs()');
  perform cron.schedule('relay-auto-confirm', '*/15 * * * *', 'select public.auto_confirm_jobs()');

  if exists (select 1 from pg_available_extensions where name = 'pg_net')
     and exists (select 1 from pg_namespace where nspname = 'vault') then
    create extension if not exists pg_net;
    perform cron.schedule('relay-charge-jobs', '*/5 * * * *', $cmd$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'relay_project_url') || '/functions/v1/charge-jobs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-relay-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'relay_cron_secret')
        ),
        body := '{}'::jsonb
      )
      where exists (select 1 from vault.decrypted_secrets where name = 'relay_project_url')
    $cmd$);
  end if;
end
$outer$;
