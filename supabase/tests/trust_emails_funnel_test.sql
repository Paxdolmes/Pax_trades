-- Behaviour tests for check dates on profiles, email fallback and the admin funnel.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Customer c1, approved plumber p1 with two checked documents, admin a1.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009c1', 'olivia@example.com'),
  ('00000000-0000-0000-0000-0000000009a1', 'dan@example.com'),
  ('00000000-0000-0000-0000-0000000009d1', 'boss@example.com');
insert into public.profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-0000000009c1', 'customer', 'Olivia Green'),
  ('00000000-0000-0000-0000-0000000009a1', 'pro', 'Dan Evans'),
  ('00000000-0000-0000-0000-0000000009d1', 'admin', 'Relay Boss');
insert into public.pros (id, trades, approved_at, commission_rate) values
  ('00000000-0000-0000-0000-0000000009a1', '{plumbing}', '2026-10-01', 0.10);
insert into public.credentials (pro_id, type, expires_on, verified_at) values
  ('00000000-0000-0000-0000-0000000009a1', 'plumbing_nvq', null, '2026-10-02 10:00'),
  ('00000000-0000-0000-0000-0000000009a1', 'public_liability', current_date + 100, '2026-10-03 09:00'),
  ('00000000-0000-0000-0000-0000000009a1', 'gas_safe', current_date - 1, '2026-09-01'); -- expired: not shown

-- Customers see when each current document was checked, and when the pro joined.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000009c1';
do $$
declare p record;
begin
  select * into strict p from public.pro_public_profiles where id = '00000000-0000-0000-0000-0000000009a1';
  if p.checks <> '[{"type": "plumbing_nvq", "checked_on": "2026-10-02"}, {"type": "public_liability", "checked_on": "2026-10-03"}]'::jsonb
     or p.approved_on <> '2026-10-01' then
    raise exception 'FAIL: profile checks shown as % / %', p.checks, p.approved_on;
  end if;
end $$;

-- Customers can't see whether a notification was emailed, or send one.
do $$ begin
  perform public.email_notification(gen_random_uuid());
  raise exception 'FAIL: customer called email_notification';
exception when insufficient_privilege then null;
end $$;
reset role;

-- With no phone registered, a notification is still stored (the email goes out
-- through pg_net, which the tests don't have).
select public.notify('00000000-0000-0000-0000-0000000009c1', 'New quote', 'A plumber quoted £120', '/quotes/x');
do $$ begin
  if not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000009c1'
                  and title = 'New quote' and emailed_at is null) then
    raise exception 'FAIL: notification not stored';
  end if;
end $$;

-- c1 asks for quotes and books a fixed job that gets done.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000009c1';
insert into public.quote_requests (id, trades, postcode, location, description) values
  ('00000000-0000-0000-0000-0000000009f1', '{plumbing}', 'SW6 4EH', 'SRID=4326;POINT(-0.1960 51.4750)', 'Move a radiator');
reset role;
insert into public.jobs (id, customer_id, trade, job_type_id, urgency, postcode, status, pro_id, accepted_at, arrive_by, finished_at) values
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000009c1', 'plumbing', 'leak', 'urgent', 'SW6 4EH',
   'completed', '00000000-0000-0000-0000-0000000009a1', now() - interval '3 hours', now() - interval '2 hours', now() - interval '1 hour');

-- Only admins see the funnel; c1 counts once at each step they reached.
set role authenticated;
do $$ begin
  perform public.admin_funnel();
  raise exception 'FAIL: customer saw the funnel';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000009d1';
do $$
declare
  f jsonb;
begin
  select jsonb_object_agg(step, people) into f from public.admin_funnel(30);
  if (f ->> 'Signed up')::int < 1 or (f ->> 'Asked for a job or quotes')::int < 1
     or (f ->> 'Job completed')::int < 1 or (f ->> 'Booked')::int < (f ->> 'Job completed')::int
     or (select count(*) from public.admin_funnel(30)) <> 7 then
    raise exception 'FAIL: funnel was %', f;
  end if;
end $$;
reset role;

\echo 'All trust, email and funnel tests passed'
