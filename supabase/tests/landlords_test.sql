-- Behaviour tests for landlords and letting agents.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Agent m1 (card saved), tenant t1, stranger s1, plumber p1 online in Fulham.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000007a1', 'agent@example.com'),
  ('00000000-0000-0000-0000-0000000007b1', 'tenant@example.com'),
  ('00000000-0000-0000-0000-0000000007c1', 'stranger@example.com'),
  ('00000000-0000-0000-0000-0000000007d1', 'plumber@example.com');
insert into public.profiles (id, role, full_name, company_name, stripe_customer_id, stripe_payment_method_id) values
  ('00000000-0000-0000-0000-0000000007a1', 'customer', 'Amira Khan', 'Fulham Lettings', 'cus_agent', null),
  ('00000000-0000-0000-0000-0000000007b1', 'customer', 'Tom Reed', null, 'cus_tenant', 'pm_tenant'),
  ('00000000-0000-0000-0000-0000000007c1', 'customer', 'Sid Vale', null, null, null),
  ('00000000-0000-0000-0000-0000000007d1', 'pro', 'Sam Okafor', null, null, null);
insert into public.pros (id, trades, approved_at, is_online, last_location, last_seen_at, stripe_account_id) values
  ('00000000-0000-0000-0000-0000000007d1', '{plumbing}', now(), true, 'SRID=4326;POINT(-0.2050 51.4800)', now(), 'acct_p1');
insert into public.credentials (pro_id, type, expires_on, verified_at) values
  ('00000000-0000-0000-0000-0000000007d1', 'plumbing_nvq', null, now()),
  ('00000000-0000-0000-0000-0000000007d1', 'public_liability', current_date + 100, now());

create function pg_temp.notified(p_user uuid, p_title text) returns boolean language sql as $$
  select exists (select 1 from public.notifications where user_id = p_user and title like p_title)
$$;
create function pg_temp.check(p_ok boolean, p_failure text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception '%', p_failure; end if;
end $$;
create function pg_temp.offers(p_job uuid) returns bigint language sql as $$
  select count(*) from public.job_offers where job_id = p_job
$$;

set role authenticated;

-- The agent adds a property; the database gives it a readable join code.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007a1';
insert into public.properties (name, postcode) values ('Flat 2, 14 Lettice Street', 'SW6 4EH');
select id as prop, join_code as code from public.properties \gset
select set_config('test.prop', :'prop', false) \gset ignored_
do $$ begin
  if (select join_code from public.properties) !~ '^[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'FAIL: join code not six readable characters';
  end if;
end $$;

-- Nobody can pick their own code or add a property for someone else.
do $$ begin
  insert into public.properties (name, postcode, join_code) values ('Mine', 'SW6 1AA', 'AAAAAA');
  raise exception 'FAIL: chose a join code';
exception when insufficient_privilege then null;
end $$;

-- A stranger can't see the property or book for it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007c1';
do $$ begin
  if exists (select 1 from public.properties) then raise exception 'FAIL: stranger sees property'; end if;
end $$;
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode, location, property_id)
    values ('plumbing', 'leak', 'urgent', 'SW6 4EH', 'SRID=4326;POINT(-0.2052 51.4801)',
            current_setting('test.prop')::uuid);
  raise exception 'FAIL: stranger booked for a property';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.jobs where customer_id = '00000000-0000-0000-0000-0000000007c1') then
    raise exception 'FAIL: stranger job saved';
  end if;
end $$;
set role authenticated;

-- The tenant joins with the code, typed loosely; the agent hears about it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007b1';
do $$ begin
  perform public.join_property('NOPE00');
  raise exception 'FAIL: wrong code accepted';
exception when raise_exception then
  if sqlerrm not like 'that code doesn''t match%' then raise; end if;
end $$;
select manager_name from public.join_property(lower(:'code') || ' ') \gset
select pg_temp.check((:'manager_name' = 'Fulham Lettings'),
  'FAIL: tenant should see the company name');
do $$ begin
  if (select name from public.my_property()) <> 'Flat 2, 14 Lettice Street' then
    raise exception 'FAIL: my_property';
  end if;
end $$;

-- A request to the landlord waits for approval: no pro is offered it.
insert into public.jobs (trade, job_type_id, urgency, postcode, location, scheduled_for, property_id)
  values ('plumbing', 'leak', 'booked', 'SW6 4EH', 'SRID=4326;POINT(-0.2052 51.4801)', now() + interval '1 day', :'prop')
  returning id as booked_job \gset
reset role;
do $$ begin
  if (select approval from public.jobs where property_id is not null order by created_at desc limit 1) <> 'pending' then
    raise exception 'FAIL: tenant request should wait for approval';
  end if;
end $$;
select pg_temp.check((pg_temp.offers(:'booked_job') = 0),
  'FAIL: pending request was offered to a pro');
select public.dispatch_jobs() \gset ignored_
select pg_temp.check((pg_temp.offers(:'booked_job') = 0 and pg_temp.notified('00000000-0000-0000-0000-0000000007a1', 'Approval needed:%')),
  'FAIL: dispatcher offered a pending request, or agent not told');
set role authenticated;

-- The tenant sees who it's waiting on.
do $$ begin
  if not exists (select 1 from public.customer_jobs() where approval = 'pending' and approver_name = 'Fulham Lettings') then
    raise exception 'FAIL: tenant can''t see the approval state';
  end if;
end $$;

-- Only the agent can approve, and only once they've saved a card.
do $$ begin
  perform public.approve_job((select job_id from public.customer_jobs() limit 1));
  raise exception 'FAIL: tenant approved their own request';
exception when raise_exception then
  if sqlerrm <> 'request not found' then raise; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007a1';
do $$ begin
  perform public.approve_job((select job_id from public.manager_jobs() limit 1));
  raise exception 'FAIL: approved without a card';
exception when raise_exception then
  if sqlerrm not like 'add a card first%' then raise; end if;
end $$;
reset role;
update public.profiles set stripe_payment_method_id = 'pm_agent' where id = '00000000-0000-0000-0000-0000000007a1';
set role authenticated;
select status from public.approve_job(:'booked_job') \gset
reset role;
select pg_temp.check((pg_temp.offers(:'booked_job') = 1 and pg_temp.notified('00000000-0000-0000-0000-0000000007b1', 'Approved:%')),
  'FAIL: approved request not sent to the pro, or tenant not told');
set role authenticated;
do $$ begin
  perform public.approve_job((select job_id from public.manager_jobs() limit 1));
  raise exception 'FAIL: approved twice';
exception when raise_exception then
  if sqlerrm not like 'this request has already been answered' then raise; end if;
end $$;

-- An emergency goes straight out now the agent has a card, and the agent is told.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007b1';
insert into public.jobs (trade, job_type_id, urgency, postcode, location, property_id)
  values ('plumbing', 'blocked-toilet', 'urgent', 'SW6 4EH', 'SRID=4326;POINT(-0.2052 51.4801)', :'prop')
  returning id as urgent_job \gset
reset role;
select pg_temp.check((pg_temp.offers(:'urgent_job') = 1
        and (select approval from public.jobs where id = :'urgent_job') = 'approved'
        and pg_temp.notified('00000000-0000-0000-0000-0000000007a1', 'Emergency sent:%')),
  'FAIL: emergency should skip approval');

-- With emergencies switched off, they wait too; the agent can decline with a reason.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007a1';
update public.properties set auto_approve_urgent = false where id = :'prop';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007b1';
insert into public.jobs (trade, job_type_id, urgency, postcode, location, property_id)
  values ('plumbing', 'leak', 'urgent', 'SW6 4EH', 'SRID=4326;POINT(-0.2052 51.4801)', :'prop')
  returning id as declined_job \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007a1';
select status from public.decline_job(:'declined_job', 'Our own plumber is coming on Friday') \gset
reset role;
select pg_temp.check(((select status from public.jobs where id = :'declined_job') = 'cancelled'
        and (select approval from public.jobs where id = :'declined_job') = 'declined'
        and pg_temp.offers(:'declined_job') = 0
        and pg_temp.notified('00000000-0000-0000-0000-0000000007b1', 'Not approved:%')),
  'FAIL: decline');

-- The job is done and confirmed: it's charged to the agent's card, and counts as spend.
update public.jobs set status = 'completed', pro_id = '00000000-0000-0000-0000-0000000007d1',
  final_price_pence = 12000, confirmed_at = now() where id = :'booked_job';
insert into public.customer_credits (customer_id, pence, reason)
  values ('00000000-0000-0000-0000-0000000007b1', 1000, 'test credit');
select customer_id as charged_to, payment_method_id as card, amount_pence, credit_pence from public.jobs_to_charge(:'booked_job') \gset
select pg_temp.check((:'charged_to' = 'cus_agent' and :'card' = 'pm_agent' and :amount_pence = 12000 and :credit_pence = 0),
  'FAIL: property job should be charged to the agent, without the tenant''s credit');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007a1';
do $$ begin
  if (select spend_pence from public.manager_properties()) <> 12000
     or (select jobs from public.manager_properties()) <> 2
     or (select tenants from public.manager_properties()) <> '{Tom Reed}' then
    raise exception 'FAIL: dashboard totals';
  end if;
  if (select count(*) from public.manager_jobs()) <> 3 then
    raise exception 'FAIL: history should list all three requests';
  end if;
end $$;

-- The agent's own booking needs no approval.
insert into public.jobs (trade, job_type_id, urgency, postcode, location, scheduled_for, property_id)
  values ('plumbing', 'leak', 'booked', 'SW6 4EH', 'SRID=4326;POINT(-0.2052 51.4801)', now() + interval '2 days', :'prop')
  returning approval as own_approval \gset
select pg_temp.check((:'own_approval' = 'approved'),
  'FAIL: agent booking should be approved');

-- The agent removes the tenant, who can then no longer book for the flat.
select public.remove_tenant(:'prop', '00000000-0000-0000-0000-0000000007b1') \gset ignored_
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000007b1';
do $$ begin
  if exists (select 1 from public.my_property()) then raise exception 'FAIL: tenant not removed'; end if;
end $$;
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode, location, property_id)
    values ('plumbing', 'leak', 'urgent', 'SW6 4EH', 'SRID=4326;POINT(-0.2052 51.4801)',
            current_setting('test.prop')::uuid);
  raise exception 'FAIL: removed tenant booked';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
reset role;

\echo 'landlords: ok'
