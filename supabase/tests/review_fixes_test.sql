-- Behaviour tests for the pre-launch review fixes.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Customer c1, heating engineer p1 (online, checked in just now), p2 (online but
-- last seen 5 hours ago), both in Fulham.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000005c1', 'olivia@example.com'),
  ('00000000-0000-0000-0000-0000000005a1', 'sam@example.com'),
  ('00000000-0000-0000-0000-0000000005a2', 'ravi@example.com');
insert into public.profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-0000000005c1', 'customer', 'Olivia Hart'),
  ('00000000-0000-0000-0000-0000000005a1', 'pro', 'Sam Okafor'),
  ('00000000-0000-0000-0000-0000000005a2', 'pro', 'Ravi Shah');
insert into public.pros (id, trades, approved_at, is_online, last_location, last_seen_at) values
  ('00000000-0000-0000-0000-0000000005a1', '{heating}', now(), true, 'SRID=4326;POINT(-0.2050 51.4800)', now()),
  ('00000000-0000-0000-0000-0000000005a2', '{heating}', now(), true, 'SRID=4326;POINT(-0.2051 51.4800)', now() - interval '5 hours');
insert into public.credentials (pro_id, type, expires_on, verified_at) values
  ('00000000-0000-0000-0000-0000000005a1', 'gas_safe', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000005a1', 'public_liability', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000005a2', 'gas_safe', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000005a2', 'public_liability', current_date + 100, now());

create function pg_temp.notified(p_user uuid, p_title text) returns boolean language sql as $$
  select exists (select 1 from public.notifications where user_id = p_user and title like p_title)
$$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005c1';

-- A customer can't send a request that's already finished or paid.
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode, paid_at)
    values ('heating', 'no-heating', 'urgent', 'SW6 1AA', now());
  raise exception 'FAIL: customer set paid_at';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode, payment_failed_at)
    values ('heating', 'no-heating', 'urgent', 'SW6 1AA', now());
  raise exception 'FAIL: customer set payment_failed_at';
exception when insufficient_privilege then null;
end $$;

-- A booked job needs a slot, in the next 30 days.
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode) values ('heating', 'cp12', 'booked', 'SW6 1AA');
  raise exception 'FAIL: booked job without a slot';
exception when raise_exception then
  if sqlerrm not like 'pick a time slot%' then raise; end if;
end $$;
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode, scheduled_for)
    values ('heating', 'cp12', 'booked', 'SW6 1AA', now() - interval '1 day');
  raise exception 'FAIL: booked job in the past';
exception when raise_exception then
  if sqlerrm not like 'pick a time slot%' then raise; end if;
end $$;

-- A booked CP12 tomorrow at 8am goes only to the pro who checked in recently.
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, scheduled_for) values
  ('00000000-0000-0000-0000-0000000005e1', 'heating', 'cp12', 'booked', 'SW6 1AA',
   'SRID=4326;POINT(-0.2060 51.4800)', date_trunc('day', now()) + interval '1 day 8 hours');
reset role;
do $$ begin
  if exists (select 1 from public.job_offers where job_id = '00000000-0000-0000-0000-0000000005e1'
              and pro_id = '00000000-0000-0000-0000-0000000005a2') then
    raise exception 'FAIL: offered to a pro who has not checked in for 5 hours';
  end if;
end $$;

-- p1 accepts and has until the end of the 2-hour slot.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005a1';
select public.accept_offer(offer_id) from public.my_offers() where job_id = '00000000-0000-0000-0000-0000000005e1' \gset ignored_
reset role;
do $$ begin
  if (select arrive_by from public.jobs where id = '00000000-0000-0000-0000-0000000005e1')
     <> date_trunc('day', now()) + interval '1 day 10 hours' then
    raise exception 'FAIL: arrive by %', (select arrive_by from public.jobs where id = '00000000-0000-0000-0000-0000000005e1');
  end if;
end $$;

-- On the day: the fixed price is charged whatever the pro enters.
set role authenticated;
select public.pro_arrived('00000000-0000-0000-0000-0000000005e1') \gset ignored_
select public.pro_finished('00000000-0000-0000-0000-0000000005e1', 99999) \gset ignored_
reset role;
do $$ begin
  if (select final_price_pence from public.jobs where id = '00000000-0000-0000-0000-0000000005e1') <> 9500 then
    raise exception 'FAIL: fixed price job priced at %', (select final_price_pence from public.jobs where id = '00000000-0000-0000-0000-0000000005e1');
  end if;
end $$;

-- The customer reports a problem; the pro is going back. Two days on, it isn't auto-confirmed.
insert into public.problem_reports (job_id, customer_id, kind, description, status) values
  ('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-0000000005c1', 'not_fixed', 'Boiler still not certified', 'pro_returning');
update public.jobs set finished_at = now() - interval '3 days' where id = '00000000-0000-0000-0000-0000000005e1';
select public.auto_confirm_jobs() \gset ignored_
do $$ begin
  if (select status from public.jobs where id = '00000000-0000-0000-0000-0000000005e1') <> 'on_site' then
    raise exception 'FAIL: auto-confirmed while the pro is going back';
  end if;
end $$;

-- An urgent job cancelled while it's still looking: the offers are withdrawn.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005c1';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, scheduled_for) values
  ('00000000-0000-0000-0000-0000000005e2', 'heating', 'no-heating', 'urgent', 'SW6 1AA',
   'SRID=4326;POINT(-0.2060 51.4800)', now() + interval '3 days');
select public.cancel_job('00000000-0000-0000-0000-0000000005e2') \gset ignored_
reset role;
do $$ begin
  if (select status from public.jobs where id = '00000000-0000-0000-0000-0000000005e2') <> 'cancelled'
     or exists (select 1 from public.job_offers where job_id = '00000000-0000-0000-0000-0000000005e2' and status = 'pending') then
    raise exception 'FAIL: cancelled job still looking for a pro';
  end if;
  if (select scheduled_for from public.jobs where id = '00000000-0000-0000-0000-0000000005e2') is not null then
    raise exception 'FAIL: urgent job kept a slot';
  end if;
end $$;

-- Once the pro has arrived it can't be cancelled; before that the pro is told.
set role authenticated;
do $$ begin
  perform public.cancel_job('00000000-0000-0000-0000-0000000005e1');
  raise exception 'FAIL: cancelled after the pro arrived';
exception when raise_exception then
  if sqlerrm not like 'your pro has already arrived%' then raise; end if;
end $$;
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location) values
  ('00000000-0000-0000-0000-0000000005e3', 'heating', 'no-heating', 'urgent', 'SW6 1AA', 'SRID=4326;POINT(-0.2060 51.4800)');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005a1';
select public.accept_offer(offer_id) from public.my_offers() where job_id = '00000000-0000-0000-0000-0000000005e3' \gset ignored_
-- Someone else can't cancel it.
do $$ begin
  perform public.cancel_job('00000000-0000-0000-0000-0000000005e3');
  raise exception 'FAIL: pro cancelled the customer''s job';
exception when raise_exception then
  if sqlerrm <> 'job not found' then raise; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005c1';
select public.cancel_job('00000000-0000-0000-0000-0000000005e3') \gset ignored_
reset role;
do $$ begin
  if not pg_temp.notified('00000000-0000-0000-0000-0000000005a1', 'Job cancelled') then
    raise exception 'FAIL: pro not told the job was cancelled';
  end if;
end $$;

-- Quotes: the pro hears when theirs is accepted.
insert into public.quote_requests (id, customer_id, trades, postcode, description) values
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005c1', '{heating}', 'SW6 1AA', 'Move a radiator to the other wall');
insert into public.quotes (id, request_id, pro_id, trade, price_pence) values
  ('00000000-0000-0000-0000-0000000005f2', '00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005a1', 'heating', 32000);
set role authenticated;
select public.accept_quote('00000000-0000-0000-0000-0000000005f2') \gset ignored_
reset role;
do $$ begin
  if not exists (
    select 1 from public.notifications n join public.quote_requests r on n.url = '/trip/' || r.job_id
     where n.user_id = '00000000-0000-0000-0000-0000000005a1' and n.title = 'Your quote was accepted'
       and r.id = '00000000-0000-0000-0000-0000000005f1'
  ) then
    raise exception 'FAIL: pro not told the quote was accepted';
  end if;
end $$;

-- And a quoted job is charged at the quote.
update public.jobs set status = 'on_site', arrived_at = now()
 where id = (select job_id from public.quote_requests where id = '00000000-0000-0000-0000-0000000005f1');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005a1';
select public.pro_finished(job_id, 50000) from public.quote_requests where id = '00000000-0000-0000-0000-0000000005f1' \gset ignored_
reset role;
do $$ begin
  if (select j.final_price_pence from public.jobs j join public.quote_requests r on r.job_id = j.id
       where r.id = '00000000-0000-0000-0000-0000000005f1') <> 32000 then
    raise exception 'FAIL: quoted job not charged at the quote';
  end if;
end $$;

-- The tests share one database: take these pros offline so later tests don't match them.
update public.pros set is_online = false where id::text like '00000000-0000-0000-0000-0000000005a_';

\echo All review fix tests passed
