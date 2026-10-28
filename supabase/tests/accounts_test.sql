-- Behaviour tests for sign-up: profiles and pro applications.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000003c1'), ('00000000-0000-0000-0000-0000000003b1');

set role authenticated;

-- A new customer adds their name; their profile is created as a customer.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000003c1';
do $$ begin
  perform public.complete_profile('customer', ' ');
  raise exception 'FAIL: blank name accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select public.complete_profile('customer', '  Sophie Turner ') \gset ignored_
do $$ begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'customer' and full_name = 'Sophie Turner') then
    raise exception 'FAIL: customer profile not created';
  end if;
end $$;

-- Nobody can make themselves an admin, or switch role later.
do $$ begin
  perform public.complete_profile('admin', 'Sneaky');
  raise exception 'FAIL: became admin';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select public.complete_profile('pro', 'Sophie T') \gset ignored_
do $$ begin
  if (select role from public.profiles where id = auth.uid()) <> 'customer' then
    raise exception 'FAIL: role changed after sign-up';
  end if;
end $$;

-- Customers can't start a pro application.
do $$ begin
  perform public.start_pro_application('{plumbing}');
  raise exception 'FAIL: customer applied as a pro';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- A tradesperson signs up, applies, and can change trades until approved.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000003b1';
select public.complete_profile('pro', 'Tom Haskins') \gset ignored_
do $$ begin
  perform public.start_pro_application('{}');
  raise exception 'FAIL: applied with no trades';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select public.start_pro_application('{plumbing}') \gset ignored_
select public.start_pro_application('{plumbing,heating}') \gset ignored_
do $$ begin
  if not exists (select 1 from public.pros where id = auth.uid() and trades = '{plumbing,heating}' and approved_at is null) then
    raise exception 'FAIL: application not saved unapproved';
  end if;
end $$;
reset role;
update public.pros set approved_at = now() where id = '00000000-0000-0000-0000-0000000003b1';
set role authenticated;
do $$ begin
  perform public.start_pro_application('{electrical}');
  raise exception 'FAIL: approved trades changed';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- Signed-out callers get nothing.
reset role;
set role anon;
do $$ begin
  perform public.complete_profile('customer', 'Anon');
  raise exception 'FAIL: anon created a profile';
exception when insufficient_privilege then null;
end $$;
reset role;

\echo All account tests passed
