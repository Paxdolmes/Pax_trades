-- Behaviour tests for tenants' "Get quotes" requests going to their landlord.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Agent m1 (no card yet), tenant t1, another customer s1, plumber p1.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000008a1', 'agent2@example.com'),
  ('00000000-0000-0000-0000-0000000008b1', 'tenant2@example.com'),
  ('00000000-0000-0000-0000-0000000008c1', 'other2@example.com'),
  ('00000000-0000-0000-0000-0000000008d1', 'plumber2@example.com');
insert into public.profiles (id, role, full_name, company_name, stripe_customer_id, stripe_payment_method_id) values
  ('00000000-0000-0000-0000-0000000008a1', 'customer', 'Amira Khan', 'Fulham Lettings', 'cus_agent2', null),
  ('00000000-0000-0000-0000-0000000008b1', 'customer', 'Tom Reed', null, 'cus_tenant2', 'pm_tenant2'),
  ('00000000-0000-0000-0000-0000000008c1', 'customer', 'Sid Vale', null, null, null),
  ('00000000-0000-0000-0000-0000000008d1', 'pro', 'Sam Okafor', null, null, null);
insert into public.pros (id, trades, approved_at, stripe_account_id) values
  ('00000000-0000-0000-0000-0000000008d1', '{plumbing}', now(), 'acct_p2');
insert into public.credentials (pro_id, type, expires_on, verified_at) values
  ('00000000-0000-0000-0000-0000000008d1', 'plumbing_nvq', null, now()),
  ('00000000-0000-0000-0000-0000000008d1', 'public_liability', current_date + 100, now());

create function pg_temp.notified(p_user uuid, p_title text) returns boolean language sql as $$
  select exists (select 1 from public.notifications where user_id = p_user and title like p_title)
$$;
create function pg_temp.check(p_ok boolean, p_failure text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception '%', p_failure; end if;
end $$;

set role authenticated;

-- The agent adds a flat; the tenant joins it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008a1';
insert into public.properties (name, postcode) values ('Flat 1, 9 Bishops Road', 'SW6 7AB');
select id as prop, join_code as code from public.properties where name = 'Flat 1, 9 Bishops Road' \gset
select set_config('test.prop', :'prop', false) \gset ignored_
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008b1';
select name from public.join_property(:'code') \gset ignored_

-- Someone who isn't the tenant can't ask for quotes for the flat.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008c1';
do $$ begin
  insert into public.quote_requests (postcode, description, property_id)
    values ('SW6 7AB', 'Replace the bathroom extractor fan', current_setting('test.prop')::uuid);
  raise exception 'FAIL: stranger asked for quotes for a property';
exception when raise_exception then
  if sqlerrm <> 'property not found' then raise; end if;
end $$;

-- The tenant asks for quotes for the flat; the agent hears about it and can see it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008b1';
insert into public.quote_requests (id, postcode, description, timing, property_id)
values ('00000000-0000-0000-0000-0000000008e1', 'SW6 7AB', 'Replace the bathroom extractor fan, it rattles', 'this_week', :'prop');
reset role;
select pg_temp.check(pg_temp.notified('00000000-0000-0000-0000-0000000008a1', 'Quotes requested:%'),
  'FAIL: agent not told about the quote request');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008a1';
do $$ begin
  if not exists (select 1 from public.quote_requests where id = '00000000-0000-0000-0000-0000000008e1') then
    raise exception 'FAIL: agent can''t see their tenant''s request';
  end if;
  if (select count(*) from public.manager_quote_requests()) <> 1
     or (select tenant_name from public.manager_quote_requests()) <> 'Tom Reed' then
    raise exception 'FAIL: manager_quote_requests';
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008c1';
do $$ begin
  if exists (select 1 from public.quote_requests where id = '00000000-0000-0000-0000-0000000008e1')
     or exists (select 1 from public.quote_request_details('00000000-0000-0000-0000-0000000008e1')) then
    raise exception 'FAIL: another customer sees the request';
  end if;
end $$;

-- Two quotes come in. The agent hears about each; the tenant isn't asked to pick.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008d1';
insert into public.quotes (id, request_id, trade, price_pence, earliest_at)
values ('00000000-0000-0000-0000-0000000008f1', '00000000-0000-0000-0000-0000000008e1', 'plumbing', 14500, now() + interval '2 days');
reset role;
select pg_temp.check((pg_temp.notified('00000000-0000-0000-0000-0000000008a1', 'New quote: Flat 1%')
        and not pg_temp.notified('00000000-0000-0000-0000-0000000008b1', 'New quote%')),
  'FAIL: the agent, not the tenant, should hear about the quote');
set role authenticated;

-- The tenant sees the quote and who picks, but can't accept it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008b1';
do $$ begin
  if not exists (select 1 from public.quote_request_details('00000000-0000-0000-0000-0000000008e1')
                  where manager_name = 'Fulham Lettings' and not you_accept) then
    raise exception 'FAIL: tenant should see the agent picks';
  end if;
  perform public.accept_quote('00000000-0000-0000-0000-0000000008f1');
  raise exception 'FAIL: tenant accepted a quote on a property request';
exception when raise_exception then
  if sqlerrm not like 'Fulham Lettings picks the quote%' then raise; end if;
end $$;

-- The agent sees the quote, needs a card, then accepts it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008a1';
do $$ begin
  if not exists (select 1 from public.quotes where id = '00000000-0000-0000-0000-0000000008f1') then
    raise exception 'FAIL: agent can''t see the quote';
  end if;
  if not (select you_accept from public.quote_request_details('00000000-0000-0000-0000-0000000008e1')) then
    raise exception 'FAIL: agent should be the one to accept';
  end if;
  perform public.accept_quote('00000000-0000-0000-0000-0000000008f1');
  raise exception 'FAIL: accepted without a card';
exception when raise_exception then
  if sqlerrm not like 'add a card first%' then raise; end if;
end $$;
reset role;
update public.profiles set stripe_payment_method_id = 'pm_agent2' where id = '00000000-0000-0000-0000-0000000008a1';
set role authenticated;
select id as job, customer_id as job_customer, property_id as job_property, approval as job_approval
  from public.accept_quote('00000000-0000-0000-0000-0000000008f1') \gset
select pg_temp.check((:'job_customer' = '00000000-0000-0000-0000-0000000008b1' and :'job_property' = :'prop' and :'job_approval' = 'approved'),
  'FAIL: accepted quote should be the tenant''s job, for the flat, already approved');
reset role;
select pg_temp.check((pg_temp.notified('00000000-0000-0000-0000-0000000008b1', 'Quote accepted:%')
        and pg_temp.notified('00000000-0000-0000-0000-0000000008d1', 'Your quote was accepted')
        and not pg_temp.notified('00000000-0000-0000-0000-0000000008a1', 'Approval needed:%')
        and not pg_temp.notified('00000000-0000-0000-0000-0000000008a1', 'Emergency sent:%')),
  'FAIL: tenant and pro should be told, and the agent not asked to approve their own choice');

-- When it's done, the agent pays, and it shows in the flat's history and spend.
update public.jobs set status = 'completed', confirmed_at = now() where id = :'job';
select customer_id as charged_to, amount_pence from public.jobs_to_charge(:'job') \gset
select pg_temp.check((:'charged_to' = 'cus_agent2' and :amount_pence = 14500),
  'FAIL: quoted property job should be charged to the agent');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008a1';
do $$ begin
  if (select spend_pence from public.manager_properties() where name = 'Flat 1, 9 Bishops Road') <> 14500 then
    raise exception 'FAIL: quoted job missing from spend';
  end if;
  if (select status from public.manager_quote_requests()) <> 'accepted' then
    raise exception 'FAIL: request should show as accepted';
  end if;
end $$;

-- The agent can turn a request down; the tenant is told.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008b1';
insert into public.quote_requests (id, postcode, description, property_id)
values ('00000000-0000-0000-0000-0000000008e2', 'SW6 7AB', 'Paint the hallway and landing', :'prop');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008c1';
do $$ begin
  perform public.cancel_quote_request('00000000-0000-0000-0000-0000000008e2');
  raise exception 'FAIL: stranger cancelled the request';
exception when raise_exception then
  if sqlerrm not like 'request not found%' then raise; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008a1';
select public.cancel_quote_request('00000000-0000-0000-0000-0000000008e2') \gset ignored_
reset role;
select pg_temp.check(((select status from public.quote_requests where id = '00000000-0000-0000-0000-0000000008e2') = 'cancelled'
        and pg_temp.notified('00000000-0000-0000-0000-0000000008b1', 'Not going ahead:%')),
  'FAIL: agent declining a quote request');

-- An ordinary customer still accepts their own quotes.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008c1';
insert into public.quote_requests (id, postcode, description) values ('00000000-0000-0000-0000-0000000008e3', 'SW6 7AB', 'Fit a new outside tap please');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008d1';
insert into public.quotes (id, request_id, trade, price_pence) values ('00000000-0000-0000-0000-0000000008f3', '00000000-0000-0000-0000-0000000008e3', 'plumbing', 9000);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000008c1';
select property_id is null as own_job from public.accept_quote('00000000-0000-0000-0000-0000000008f3') \gset
select pg_temp.check(:'own_job', 'FAIL: own quote should not be a property job');
reset role;

\echo 'landlord quotes: ok'
