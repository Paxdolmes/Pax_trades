-- Relay: when each pro's documents were checked, email for people without the
-- app, and a sign-up-to-completed funnel for the admin screen.

-- 1. Public profiles show when each document was checked ----------------------

-- Same as before, plus the date each current document was checked and the date
-- the pro was approved, so customers see the checks are recent.
create or replace view public.pro_public_profiles as
select
  p.id,
  trim(split_part(coalesce(pr.full_name, ''), ' ', 1) || ' ' ||
       left(nullif(split_part(coalesce(pr.full_name, ''), ' ', 2), ''), 1)) as display_name,
  p.trades,
  p.is_founding,
  (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.pro_id = p.id) as rating,
  (select count(*) from public.reviews r where r.pro_id = p.id) as review_count,
  (select count(*) from public.jobs j where j.pro_id = p.id and j.status = 'completed') as completed_jobs,
  array(
    select distinct c.type from public.credentials c
     where c.pro_id = p.id and c.verified_at is not null
       and (c.expires_on is null or c.expires_on >= current_date)
     order by c.type
  ) as verified_credentials,
  coalesce((
    select jsonb_agg(jsonb_build_object('type', x.type, 'checked_on', x.checked_on) order by x.type)
      from (
        select c.type, max(c.verified_at)::date as checked_on from public.credentials c
         where c.pro_id = p.id and c.verified_at is not null
           and (c.expires_on is null or c.expires_on >= current_date)
         group by c.type
      ) x
  ), '[]'::jsonb) as checks,
  p.approved_at::date as approved_on
from public.pros p
join public.profiles pr on pr.id = p.id
where p.approved_at is not null;

-- 2. Email when there's no phone to push to ------------------------------------

alter table public.notifications add column emailed_at timestamptz;

-- Asks the notify-email Edge Function to email one notification. Needs pg_net and
-- the two vault secrets the charging job already uses; without them it does nothing.
create function public.email_notification(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  secret text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'net')
     or not exists (select 1 from pg_namespace where nspname = 'vault') then
    return;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into base using 'relay_project_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into secret using 'relay_cron_secret';
  if base is null or secret is null then
    return;
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using base || '/functions/v1/notify-email', jsonb_build_object('id', p_id),
          jsonb_build_object('Content-Type', 'application/json', 'x-relay-cron-secret', secret);
end;
$$;

-- Same as before, but someone with no phone registered for push (the web version,
-- or the app not installed yet) gets an email instead. Chat messages and job offers
-- stay in the app: one would flood the inbox, the other expires within a minute.
create or replace function public.notify(p_user uuid, p_title text, p_body text, p_url text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  messages jsonb;
  nid uuid;
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, title, body, url) values (p_user, p_title, p_body, p_url)
  returning id into nid;
  select jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', p_title, 'body', p_body, 'sound', 'default',
           'priority', 'high', 'data', jsonb_build_object('url', p_url)))
    into messages
    from public.push_tokens t where t.user_id = p_user;
  if not exists (select 1 from pg_namespace where nspname = 'net') then
    return;
  end if;
  if messages is not null then
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using 'https://exp.host/--/api/v2/push/send', messages,
            '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb;
  elsif coalesce(p_url, '') !~ '^/(chat|pro-chat|offer)/' then
    perform public.email_notification(nid);
  end if;
end;
$$;

revoke execute on function public.email_notification(uuid) from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text) from public, anon, authenticated;

-- 3. Where people drop off ------------------------------------------------------

-- For the admin screen: how many people reached each step in the last p_days.
-- Customers count once per step, whether they booked a fixed job or asked for quotes.
create function public.admin_funnel(p_days integer default 30)
returns table (step text, people bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  perform public.require_admin();
  return query
  with asked as (
    select customer_id, id as job_id, null::uuid as request_id from public.jobs where created_at >= since
    union all
    select customer_id, null, id from public.quote_requests where created_at >= since
  )
  select x.step, x.people from (
    select 1 as ord, 'Signed up' as step,
           (select count(*) from public.profiles where role = 'customer' and created_at >= since) as people
    union all
    select 2, 'Asked for a job or quotes', (select count(distinct customer_id) from asked)
    union all
    select 3, 'Got a pro or a quote', (
      select count(distinct a.customer_id) from asked a
       where exists (select 1 from public.jobs j where j.id = a.job_id and j.pro_id is not null)
          or exists (select 1 from public.quotes q where q.request_id = a.request_id))
    union all
    select 4, 'Booked', (
      select count(distinct a.customer_id) from asked a
       where exists (select 1 from public.jobs j where j.id = a.job_id and j.status not in ('requested', 'cancelled'))
          or exists (select 1 from public.quote_requests r where r.id = a.request_id and r.status = 'accepted'))
    union all
    select 5, 'Job completed', (
      select count(distinct j.customer_id) from public.jobs j where j.created_at >= since and j.status = 'completed')
    union all
    select 6, 'Pros applied', (select count(*) from public.pros where created_at >= since)
    union all
    select 7, 'Pros approved', (select count(*) from public.pros where approved_at >= since)
  ) x
  order by x.ord;
end;
$$;

revoke execute on function public.admin_funnel(integer) from public, anon;
grant execute on function public.admin_funnel(integer) to authenticated;
