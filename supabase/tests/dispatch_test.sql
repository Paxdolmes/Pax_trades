-- Behaviour tests for dispatch, reassignment after a no-show, and what gets charged.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Customer c0. Heating engineers h1-h4, all vetted and online, h1 nearest, h4 furthest.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000002c0'), ('00000000-0000-0000-0000-0000000002a1'), ('00000000-0000-0000-0000-0000000002a2'),
  ('00000000-0000-0000-0000-0000000002a3'), ('00000000-0000-0000-0000-0000000002a4');
insert into public.profiles (id, role, stripe_customer_id, stripe_payment_method_id) values
  ('00000000-0000-0000-0000-0000000002c0', 'customer', 'cus_test', 'pm_test');
insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-0000000002a1', 'pro'), ('00000000-0000-0000-0000-0000000002a2', 'pro'),
  ('00000000-0000-0000-0000-0000000002a3', 'pro'), ('00000000-0000-0000-0000-0000000002a4', 'pro');
insert into public.pros (id, trades, approved_at, is_online, last_location, commission_rate, stripe_account_id) values
  ('00000000-0000-0000-0000-0000000002a1', '{heating}', now(), true, 'SRID=4326;POINT(-0.1950 51.4750)', 0.10, 'acct_h1'),
  ('00000000-0000-0000-0000-0000000002a2', '{heating}', now(), true, 'SRID=4326;POINT(-0.1900 51.4750)', 0.15, null),
  ('00000000-0000-0000-0000-0000000002a3', '{heating}', now(), true, 'SRID=4326;POINT(-0.1850 51.4750)', 0.15, null),
  ('00000000-0000-0000-0000-0000000002a4', '{heating}', now(), true, 'SRID=4326;POINT(-0.1800 51.4750)', 0.15, null);
insert into public.credentials (pro_id, type, expires_on, verified_at)
select p, t::public.credential_type, current_date + 100, now()
  from unnest(array['00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002a2',
                    '00000000-0000-0000-0000-0000000002a3', '00000000-0000-0000-0000-0000000002a4']::uuid[]) p,
       unnest(array['gas_safe', 'public_liability']) t;

create function pg_temp.offered(p_job uuid) returns uuid[] language sql as $$
  select coalesce(array_agg(pro_id order by pro_id), '{}') from public.job_offers where job_id = p_job and status = 'pending'
$$;

-- Requesting a job offers it straight away to the 3 nearest.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000002c0';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location) values
  ('00000000-0000-0000-0000-0000000002b1', 'heating', 'no-heating', 'urgent', 'SW6 4EH', 'SRID=4326;POINT(-0.1960 51.4750)');
reset role;
do $$ begin
  if pg_temp.offered('00000000-0000-0000-0000-0000000002b1') <> array['00000000-0000-0000-0000-0000000002a1',
     '00000000-0000-0000-0000-0000000002a2', '00000000-0000-0000-0000-0000000002a3']::uuid[] then
    raise exception 'FAIL: first offers went to %', pg_temp.offered('00000000-0000-0000-0000-0000000002b1');
  end if;
end $$;

-- The app can't run the dispatcher itself.
set role authenticated;
do $$ begin
  perform public.dispatch_jobs();
  raise exception 'FAIL: app called dispatch_jobs';
exception when insufficient_privilege then null;
end $$;

-- h1 accepts, then doesn't turn up.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000002a1';
select public.accept_offer(o.id) from public.job_offers o
 where o.job_id = '00000000-0000-0000-0000-0000000002b1' and o.pro_id = '00000000-0000-0000-0000-0000000002a1' \gset ignored_
reset role;
update public.jobs set arrive_by = now() - interval '20 minutes' where id = '00000000-0000-0000-0000-0000000002b1';
select public.reassign_late_jobs() \gset ignored_

-- The job goes out again, to the next pro along only: never back to h1, and h2 and
-- h3 already had their chance.
do $$ begin
  if pg_temp.offered('00000000-0000-0000-0000-0000000002b1') <> array['00000000-0000-0000-0000-0000000002a4']::uuid[] then
    raise exception 'FAIL: reassigned offers went to %', pg_temp.offered('00000000-0000-0000-0000-0000000002b1');
  end if;
  if exists (select 1 from public.job_offers where job_id = '00000000-0000-0000-0000-0000000002b1'
              and pro_id = '00000000-0000-0000-0000-0000000002a1' and status <> 'expired') then
    raise exception 'FAIL: the late pro still holds the job';
  end if;
end $$;

-- When h4's offer runs out and nobody is left, the retry sends nothing and closes it.
update public.job_offers set expires_at = now() - interval '1 second'
 where job_id = '00000000-0000-0000-0000-0000000002b1' and status = 'pending';
do $$ begin
  if public.dispatch_jobs() <> 0 then raise exception 'FAIL: offered to someone again'; end if;
  if pg_temp.offered('00000000-0000-0000-0000-0000000002b1') <> '{}' then raise exception 'FAIL: stale offer still pending'; end if;
end $$;

-- What gets charged: work plus tip, commission on the work only, paid out to the pro.
insert into public.jobs (id, customer_id, trade, job_type_id, urgency, postcode, status, pro_id,
                         finished_at, confirmed_at, final_price_pence, tip_pence) values
  ('00000000-0000-0000-0000-0000000002b2', '00000000-0000-0000-0000-0000000002c0', 'heating', 'no-heating', 'booked', 'SW6 4EH',
   'completed', '00000000-0000-0000-0000-0000000002a1', now(), now(), 20000, 500);
do $$
declare r record;
begin
  select * into r from public.jobs_to_charge('00000000-0000-0000-0000-0000000002b2');
  if r.amount_pence <> 20500 or r.fee_pence <> 2000 or r.customer_id <> 'cus_test'
     or r.payment_method_id <> 'pm_test' or r.destination <> 'acct_h1' then
    raise exception 'FAIL: charge details wrong: %', row_to_json(r);
  end if;
  update public.jobs set payment_intent_id = 'pi_test' where id = '00000000-0000-0000-0000-0000000002b2';
  if exists (select 1 from public.jobs_to_charge('00000000-0000-0000-0000-0000000002b2')) then
    raise exception 'FAIL: job charged twice';
  end if;
end $$;
set role authenticated;
do $$ begin
  perform public.jobs_to_charge();
  raise exception 'FAIL: app read the charge list';
exception when insufficient_privilege then null;
end $$;
reset role;

-- The tests share one database: take these pros offline so later tests don't match them.
update public.pros set is_online = false where id::text like '00000000-0000-0000-0000-0000000002a_';

\echo All dispatch tests passed
