-- Behaviour tests for deleting an account. Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Customer ca1 with a paid job by pro ca2 and an open request; ca3 is mid-job.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2'), ('00000000-0000-0000-0000-0000000000c3');
insert into public.profiles (id, role, full_name, phone) values
  ('00000000-0000-0000-0000-0000000000c1', 'customer', 'Dee Leet', '07700900001'),
  ('00000000-0000-0000-0000-0000000000c2', 'pro', 'Pat Pro', '07700900002'),
  ('00000000-0000-0000-0000-0000000000c3', 'customer', 'Busy Customer', null);
insert into public.pros (id, trades, approved_at, is_online, last_seen_at, last_location, business_name) values
  ('00000000-0000-0000-0000-0000000000c2', '{plumbing}', now(), false, now(), 'SRID=4326;POINT(-0.5 51.0)', 'Pat Plumbing');
insert into public.credentials (pro_id, type, document_path) values
  ('00000000-0000-0000-0000-0000000000c2', 'public_liability', '00000000-0000-0000-0000-0000000000c2/insurance.pdf');
insert into public.push_tokens (user_id, token)
  values ('00000000-0000-0000-0000-0000000000c1', 'ExponentPushToken[test-c1]');
insert into public.jobs (id, customer_id, trade, job_type_id, urgency, postcode, status, pro_id, paid_at) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'plumbing', 'leak', 'urgent', 'TN1 1AA',
   'completed', '00000000-0000-0000-0000-0000000000c2', now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'plumbing', 'leak', 'urgent', 'TN1 1AA',
   'requested', null, null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3', 'plumbing', 'leak', 'urgent', 'TN1 1AA',
   'on_site', '00000000-0000-0000-0000-0000000000c2', null);

-- Nobody can call it from the app.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  perform public.forget_user('00000000-0000-0000-0000-0000000000c3');
  raise exception 'FAIL: app called forget_user';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Mid-job, it waits: for the customer, and for the pro on that job.
do $$ begin
  begin
    perform public.forget_user('00000000-0000-0000-0000-0000000000c3');
    raise exception 'FAIL: deleted an account with a job under way';
  exception when raise_exception then
    if sqlerrm not like 'You have a job under way%' then raise; end if;
  end;
  begin
    perform public.forget_user('00000000-0000-0000-0000-0000000000c2');
    raise exception 'FAIL: deleted a pro on a job';
  exception when raise_exception then
    if sqlerrm not like 'You have a job under way%' then raise; end if;
  end;
end $$;

-- The customer: name, phone and push tokens go; the open request is called off;
-- the paid job stays for the pro's records.
do $$ begin
  perform public.forget_user('00000000-0000-0000-0000-0000000000c1');
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'
              and (full_name is not null or phone is not null)) then
    raise exception 'FAIL: name or phone kept';
  end if;
  if exists (select 1 from public.push_tokens where user_id = '00000000-0000-0000-0000-0000000000c1') then
    raise exception 'FAIL: push tokens kept';
  end if;
  if (select status from public.jobs where id = '00000000-0000-0000-0000-0000000000d2') <> 'cancelled' then
    raise exception 'FAIL: open request not cancelled';
  end if;
  if (select status from public.jobs where id = '00000000-0000-0000-0000-0000000000d1') <> 'completed' then
    raise exception 'FAIL: finished job changed';
  end if;
end $$;

-- The pro, once the job is done and paid: no more jobs, documents returned for removal.
update public.jobs set status = 'completed', paid_at = now() where id = '00000000-0000-0000-0000-0000000000d3';
do $$
declare docs text[];
begin
  docs := public.forget_user('00000000-0000-0000-0000-0000000000c2');
  if docs <> array['00000000-0000-0000-0000-0000000000c2/insurance.pdf'] then
    raise exception 'FAIL: documents to remove were %', docs;
  end if;
  if exists (select 1 from public.credentials where pro_id = '00000000-0000-0000-0000-0000000000c2') then
    raise exception 'FAIL: credentials kept';
  end if;
  if exists (select 1 from public.pros where id = '00000000-0000-0000-0000-0000000000c2'
              and (approved_at is not null or last_location is not null or business_name is not null)) then
    raise exception 'FAIL: pro still approved or located';
  end if;
end $$;

select 'All account deletion tests passed' as result;
