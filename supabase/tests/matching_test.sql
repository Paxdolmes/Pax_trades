-- Behaviour tests for vetting, matching and accepting offers.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- One customer and three gas engineers around Fulham.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000a3');
insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-00000000000c', 'customer'),
  ('00000000-0000-0000-0000-0000000000a1', 'pro'),
  ('00000000-0000-0000-0000-0000000000a2', 'pro'),
  ('00000000-0000-0000-0000-0000000000a3', 'pro');

-- a1: vetted, a few hundred metres away. a2: closest, but Gas Safe expired yesterday.
-- a3: vetted, about 1 km away.
insert into public.pros (id, trades, approved_at, is_online, last_location) values
  ('00000000-0000-0000-0000-0000000000a1', '{heating}', now(), true, 'SRID=4326;POINT(-0.2010 51.4760)'),
  ('00000000-0000-0000-0000-0000000000a2', '{heating}', now(), true, 'SRID=4326;POINT(-0.1982 51.4746)'),
  ('00000000-0000-0000-0000-0000000000a3', '{heating,plumbing}', now(), true, 'SRID=4326;POINT(-0.1850 51.4780)');
insert into public.credentials (pro_id, type, expires_on, verified_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'gas_safe', current_date + 200, now()),
  ('00000000-0000-0000-0000-0000000000a1', 'public_liability', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000000a2', 'gas_safe', current_date - 1, now()),
  ('00000000-0000-0000-0000-0000000000a2', 'public_liability', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000000a3', 'gas_safe', current_date + 200, now()),
  ('00000000-0000-0000-0000-0000000000a3', 'public_liability', current_date + 100, now());

-- The customer requests an urgent heating job, through RLS.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, description)
values ('00000000-0000-0000-0000-0000000000b1', 'heating', 'no-heating', 'urgent', 'SW6 4HJ',
        'SRID=4326;POINT(-0.1980 51.4745)', 'Boiler fault');

-- A customer cannot assign a pro or set a price themselves.
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode, status, pro_id)
  values ('heating', 'no-heating', 'urgent', 'SW6 4HJ', 'accepted', '00000000-0000-0000-0000-0000000000a1');
  raise exception 'FAIL: customer assigned a pro';
exception when insufficient_privilege then null;
end $$;

-- Urgent booking is refused for job types that are booked only.
do $$ begin
  insert into public.jobs (trade, job_type_id, urgency, postcode) values ('heating', 'cp12', 'urgent', 'SW6 4HJ');
  raise exception 'FAIL: urgent CP12 accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- A customer cannot promote themselves.
do $$ begin
  update public.profiles set role = 'admin' where id = auth.uid();
  raise exception 'FAIL: role changed';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Matching: the expired engineer is skipped even though closest; nearest vetted first.
do $$
declare ids uuid[];
begin
  select array_agg(pro_id order by distance_m) into ids from public.nearest_eligible_pros('00000000-0000-0000-0000-0000000000b1');
  if ids is distinct from array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3']::uuid[] then
    raise exception 'FAIL: unexpected match order %', ids;
  end if;
end $$;

insert into public.job_offers (id, job_id, pro_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a3');

set role authenticated;

-- A pro cannot accept someone else's offer.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
do $$ begin
  perform public.accept_offer('00000000-0000-0000-0000-0000000000f1');
  raise exception 'FAIL: accepted another pro''s offer';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- The offered pro can see the job before accepting.
do $$ begin
  if not exists (select 1 from public.jobs where id = '00000000-0000-0000-0000-0000000000b1') then
    raise exception 'FAIL: offered pro cannot see the job';
  end if;
end $$;

-- a1 accepts; a3's pending offer expires and a3 can no longer take it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select status, pro_id from public.accept_offer('00000000-0000-0000-0000-0000000000f1');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
do $$ begin
  perform public.accept_offer('00000000-0000-0000-0000-0000000000f3');
  raise exception 'FAIL: second pro took an assigned job';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- A pro cannot mark their own credential as verified.
do $$ begin
  insert into public.credentials (pro_id, type, verified_at) values (auth.uid(), 'unvented_g3', now());
  raise exception 'FAIL: self-verified credential';
exception when insufficient_privilege then null;
end $$;
reset role;

do $$ begin
  if (select status from public.job_offers where id = '00000000-0000-0000-0000-0000000000f3') <> 'expired' then
    raise exception 'FAIL: other offer not expired';
  end if;
end $$;

\echo 'All database tests passed'
