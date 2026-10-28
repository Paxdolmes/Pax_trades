-- Relay: fixes from the pre-launch code review.
--   1. A pro only gets offers while their app has checked in within the last 4 hours.
--   2. Customers can only set the details of a request, never its status, price or payment.
--   3. Booked jobs need a slot in the next 30 days, and the pro has until the end of
--      the 2-hour slot to arrive.
--   4. Fixed-price and quoted jobs are charged at the agreed price.
--   5. A job isn't auto-confirmed while its problem report is still being sorted out.
--   6. Customer credits come off the next charge.
--   7. Customers can cancel before the pro arrives.
--   8. Pros hear when their quote is accepted.

-- 1. Online pros must have checked in recently --------------------------------

alter table public.pros alter column last_seen_at set default now();

create or replace function public.relay_setting(p_key text) returns interval
language sql immutable as $$
  select case p_key
    when 'guarantee_window' then interval '30 days'
    when 'auto_confirm_after' then interval '48 hours'
    when 'late_grace' then interval '15 minutes'
    when 'urgent_eta' then interval '60 minutes'
    when 'booked_slot' then interval '2 hours'
    when 'online_timeout' then interval '4 hours'
  end;
$$;

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
   and p.last_seen_at > now() - public.relay_setting('online_timeout')
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

-- 2. Customers set only what they asked for ------------------------------------
-- Before this a request could arrive already marked as paid, finished or failed.

revoke insert on public.jobs from anon, authenticated;
grant insert (id, trade, job_type_id, urgency, postcode, location, description, scheduled_for)
  on public.jobs to authenticated;

-- 3. Booked slots ----------------------------------------------------------------

create function public.check_job_schedule() returns trigger
language plpgsql as $$
begin
  -- Jobs made from an accepted quote take the pro's start date instead.
  if new.status <> 'requested' then
    return new;
  end if;
  if new.urgency = 'urgent' then
    new.scheduled_for := null;
  elsif new.scheduled_for is null
     or new.scheduled_for < now() - interval '5 minutes'
     or new.scheduled_for > now() + interval '30 days' then
    raise exception 'pick a time slot in the next 30 days';
  end if;
  return new;
end;
$$;

create trigger jobs_check_schedule before insert on public.jobs
  for each row execute function public.check_job_schedule();

-- Same as before, except a booked pro has until the end of the slot.
create or replace function public.accept_offer(p_offer uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  o public.job_offers;
  j public.jobs;
begin
  select * into o from public.job_offers where id = p_offer for update;
  if not found or o.pro_id is distinct from auth.uid() then
    raise exception 'offer not found';
  end if;
  if o.status <> 'pending' or o.expires_at < now() then
    raise exception 'offer is no longer available';
  end if;

  select * into j from public.jobs where id = o.job_id for update;
  if j.status <> 'requested' then
    raise exception 'job has already been taken';
  end if;
  if not public.pro_can_take(o.pro_id, j.job_type_id) then
    raise exception 'missing a required credential for this job';
  end if;

  update public.job_offers set status = 'accepted' where id = o.id;
  update public.job_offers set status = 'expired'
    where job_id = o.job_id and id <> o.id and status = 'pending';
  update public.jobs
     set status = 'accepted',
         pro_id = o.pro_id,
         accepted_at = now(),
         arrive_by = case
           when j.urgency = 'urgent' then now() + public.relay_setting('urgent_eta')
           else greatest(coalesce(j.scheduled_for, now()) + public.relay_setting('booked_slot'),
                         now() + public.relay_setting('urgent_eta'))
         end
   where id = o.job_id returning * into j;
  return j;
end;
$$;

-- 4. Agreed prices ----------------------------------------------------------------
-- Only callouts are priced by the pro (time on the job plus parts). Extra work on a
-- fixed-price or quoted job is agreed in chat and added by the Relay team for now.

create or replace function public.pro_finished(p_job uuid, p_final_price_pence integer) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  agreed integer;
begin
  select * into j from public.jobs
   where id = p_job and pro_id = auth.uid() and status = 'on_site' and finished_at is null
   for update;
  if not found then
    raise exception 'job not found or not on site';
  end if;
  select t.fixed_price_pence into agreed from public.job_types t where t.id = j.job_type_id;
  if agreed is null and j.job_type_id like 'custom-%' then
    agreed := j.final_price_pence; -- the accepted quote
  end if;
  if agreed is null and (p_final_price_pence is null or p_final_price_pence not between 100 and 500000) then
    raise exception 'final price must be between £1 and £5,000';
  end if;
  update public.jobs set finished_at = now(), final_price_pence = coalesce(agreed, p_final_price_pence)
   where id = j.id
  returning * into j;
  return j;
end;
$$;

-- 5. Auto-confirm waits for problem reports in progress -------------------------

create or replace function public.auto_confirm_jobs() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.jobs j set status = 'completed', confirmed_at = now()
   where j.status = 'on_site'
     and j.finished_at < now() - public.relay_setting('auto_confirm_after')
     and not exists (
       select 1 from public.problem_reports r
        where r.job_id = j.id and r.status in ('open', 'pro_returning')
     );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 6. Credits come off the next charge ------------------------------------------
-- Relay pays for credits out of its commission, so a job uses at most its fee in
-- credit and the rest carries over to the next job.

alter table public.jobs add column credit_pence integer not null default 0 check (credit_pence >= 0);

create function public.available_credit_pence(p_customer uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(0,
    coalesce((select sum(c.pence) from public.customer_credits c where c.customer_id = p_customer), 0)
    - coalesce((select sum(j.credit_pence) from public.jobs j where j.customer_id = p_customer), 0)
  )::integer;
$$;

-- The signed-in customer's unused credit, for the app.
create function public.my_credit_pence() returns integer
language sql stable security definer set search_path = '' as $$
  select public.available_credit_pence(auth.uid());
$$;

drop function public.jobs_to_charge(uuid);

-- Confirmed jobs waiting to be charged, for the charge-jobs Edge Function. Sets
-- aside each job's credit the first time it's listed, so a retry charges the same.
create function public.jobs_to_charge(p_job uuid default null)
returns table (
  job_id uuid,
  amount_pence integer,
  fee_pence integer,
  credit_pence integer,
  customer_id text,
  payment_method_id text,
  destination text
)
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  fee integer;
  credit integer;
begin
  for r in
    select j.id, j.customer_id as cust, j.final_price_pence as price, j.tip_pence as tip,
           j.credit_pence as held, p.commission_rate as rate,
           c.stripe_customer_id as stripe_customer, c.stripe_payment_method_id as card,
           p.stripe_account_id as account
      from public.jobs j
      join public.pros p on p.id = j.pro_id
      join public.profiles c on c.id = j.customer_id
     where j.status = 'completed' and j.paid_at is null and j.payment_intent_id is null
       and j.payment_failed_at is null and j.final_price_pence is not null
       and (p_job is null or j.id = p_job)
     order by j.confirmed_at
       for update of j skip locked
  loop
    fee := round(r.price * r.rate)::integer; -- commission on the work, never the tip
    credit := r.held;
    if credit = 0 then
      perform 1 from public.profiles x where x.id = r.cust for update; -- one job takes the credit at a time
      credit := least(public.available_credit_pence(r.cust), fee);
      if credit > 0 then
        update public.jobs x set credit_pence = credit where x.id = r.id;
      end if;
    end if;
    job_id := r.id;
    amount_pence := r.price + r.tip - credit;
    fee_pence := fee - credit;
    credit_pence := credit;
    customer_id := r.stripe_customer;
    payment_method_id := r.card;
    destination := r.account;
    return next;
  end loop;
end;
$$;

revoke execute on function public.jobs_to_charge(uuid) from public, anon, authenticated;
revoke execute on function public.available_credit_pence(uuid) from public, anon, authenticated;
revoke execute on function public.my_credit_pence() from public, anon;
grant execute on function public.my_credit_pence() to authenticated;

-- 7. Customers cancel before the pro arrives -----------------------------------

create function public.cancel_job(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
begin
  select * into j from public.jobs where id = p_job and customer_id = auth.uid() for update;
  if not found then
    raise exception 'job not found';
  end if;
  if j.status not in ('requested', 'accepted', 'en_route') or j.arrived_at is not null then
    raise exception 'your pro has already arrived, so this job can no longer be cancelled';
  end if;
  update public.job_offers set status = 'expired' where job_id = j.id and status = 'pending';
  update public.jobs set status = 'cancelled' where id = j.id returning * into j;
  if j.pro_id is not null then
    perform public.notify(j.pro_id, 'Job cancelled',
      public.job_type_label(j.job_type_id) || ' in ' || split_part(j.postcode, ' ', 1)
      || ' was cancelled by the customer.', '/dashboard');
  end if;
  return j;
end;
$$;

revoke execute on function public.cancel_job(uuid) from public, anon;
grant execute on function public.cancel_job(uuid) to authenticated;

-- 8. Pros hear when their quote is accepted --------------------------------------

create function public.notify_quote_accepted() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  pro uuid;
begin
  select q.pro_id into pro from public.quotes q where q.request_id = new.id and q.status = 'accepted';
  if pro is not null then
    perform public.notify(pro, 'Your quote was accepted',
      left(new.description, 80) || '. Message the customer to arrange the day.', '/trip/' || new.job_id);
  end if;
  return null;
end;
$$;

create trigger quote_requests_notify_accepted after update of status on public.quote_requests
  for each row when (new.status = 'accepted' and old.status is distinct from 'accepted')
  execute function public.notify_quote_accepted();

revoke execute on function public.notify_quote_accepted() from public, anon, authenticated;
