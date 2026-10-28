-- Behaviour tests for the live screens' functions, notifications and admin.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Customer c1, approved heating engineer p1 (online in Fulham), admin a1, and n1,
-- a tradesperson who has just signed up.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000004c1', 'sophie@example.com'),
  ('00000000-0000-0000-0000-0000000004a1', 'james@example.com'),
  ('00000000-0000-0000-0000-0000000004d1', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000004b1', 'nina@example.com');
insert into public.profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-0000000004c1', 'customer', 'Sophie Turner'),
  ('00000000-0000-0000-0000-0000000004a1', 'pro', 'James Carter'),
  ('00000000-0000-0000-0000-0000000004d1', 'admin', 'Relay Admin'),
  ('00000000-0000-0000-0000-0000000004b1', 'pro', 'Nina Patel');
insert into public.pros (id, trades, approved_at, is_online, last_location, commission_rate) values
  ('00000000-0000-0000-0000-0000000004a1', '{heating}', now(), true, 'SRID=4326;POINT(-0.1950 51.4750)', 0.10);
insert into public.credentials (pro_id, type, expires_on, verified_at) values
  ('00000000-0000-0000-0000-0000000004a1', 'gas_safe', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000004a1', 'public_liability', current_date + 100, now());

create function pg_temp.notified(p_user uuid, p_title text) returns boolean language sql as $$
  select exists (select 1 from public.notifications where user_id = p_user and title like p_title)
$$;

-- A new job is offered to p1, who is told about it.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c1';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, description) values
  ('00000000-0000-0000-0000-0000000004e1', 'heating', 'no-heating', 'urgent', 'SW6 4EH',
   'SRID=4326;POINT(-0.1960 51.4750)', 'Boiler showing F28');
reset role;
do $$ begin
  if not exists (
    select 1 from public.notifications n join public.job_offers o on n.url = '/offer/' || o.id
     where n.user_id = '00000000-0000-0000-0000-0000000004a1' and n.title = 'Urgent job nearby'
       and n.body = 'No heating or hot water in SW6. Tap to see it.'
       and o.job_id = '00000000-0000-0000-0000-0000000004e1'
  ) then
    raise exception 'FAIL: pro not told about the offer';
  end if;
end $$;

-- p1 sees the offer with only the district and the customer's short name.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004a1';
do $$
declare o record;
begin
  select * into strict o from public.my_offers();
  if o.district <> 'SW6' or o.customer_name <> 'Sophie T.' or o.description <> 'Boiler showing F28'
     or o.distance_m not between 50 and 100 then
    raise exception 'FAIL: offer shown as %', o;
  end if;
end $$;
-- Nobody else sees it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004b1';
do $$ begin
  if exists (select 1 from public.my_offers()) then raise exception 'FAIL: another pro sees the offer'; end if;
end $$;

-- p1 accepts; the customer hears, and sees their pro.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004a1';
select public.accept_offer(offer_id) from public.my_offers() \gset ignored_
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c1';
do $$
declare j record;
begin
  if not pg_temp.notified('00000000-0000-0000-0000-0000000004c1', 'James C. accepted your job') then
    raise exception 'FAIL: customer not told the job was accepted';
  end if;
  select * into strict j from public.customer_jobs('00000000-0000-0000-0000-0000000004e1');
  if j.status <> 'accepted' or j.pro_name <> 'James C' or j.pro_credentials <> '{gas_safe,public_liability}' then
    raise exception 'FAIL: customer sees job as %', j;
  end if;
  -- A customer only reads their own notifications.
  if exists (select 1 from public.notifications where user_id <> auth.uid()) then
    raise exception 'FAIL: read someone else''s notifications';
  end if;
end $$;

-- Chat messages notify the other side, with contact details still hidden.
insert into public.messages (job_id, body) values ('00000000-0000-0000-0000-0000000004e1', 'Call me on 07700 900123');
reset role;
do $$ begin
  if not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000004a1'
                 and title = 'Sophie T.' and url = '/pro-chat/00000000-0000-0000-0000-0000000004e1'
                 and body not like '%07700%') then
    raise exception 'FAIL: pro not told about the message';
  end if;
end $$;

-- Arrives, finishes at £200, the customer confirms, Stripe pays: each step is told.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004a1';
select public.pro_arrived('00000000-0000-0000-0000-0000000004e1') \gset ignored_
select public.pro_finished('00000000-0000-0000-0000-0000000004e1', 20000) \gset ignored_
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c1';
select public.confirm_job('00000000-0000-0000-0000-0000000004e1', 500) \gset ignored_
reset role;
update public.jobs set paid_at = now() where id = '00000000-0000-0000-0000-0000000004e1';
do $$ begin
  if not pg_temp.notified('00000000-0000-0000-0000-0000000004c1', 'James C. has arrived')
     or not pg_temp.notified('00000000-0000-0000-0000-0000000004c1', 'James C. says the job is done')
     or not pg_temp.notified('00000000-0000-0000-0000-0000000004a1', 'You''ve been paid') then
    raise exception 'FAIL: missing a job update notification';
  end if;
end $$;

-- p1 takes home £200 less 10%, plus the £5 tip.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004a1';
do $$ begin
  if (select payout_pence from public.pro_jobs('00000000-0000-0000-0000-0000000004e1')) <> 18500 then
    raise exception 'FAIL: payout %', (select payout_pence from public.pro_jobs('00000000-0000-0000-0000-0000000004e1'));
  end if;
  if exists (select 1 from public.pro_jobs() where customer_name <> 'Sophie T.') then
    raise exception 'FAIL: customer name not shortened';
  end if;
end $$;

-- Push tokens: only real Expo tokens, never readable by the apps.
do $$ begin
  perform public.save_push_token('not-a-token');
  raise exception 'FAIL: bad token saved';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select public.save_push_token('ExponentPushToken[abc123]') \gset ignored_
do $$ begin
  perform 1 from public.push_tokens;
  raise exception 'FAIL: app read push tokens';
exception when insufficient_privilege then null;
end $$;
-- The same phone signing in to another account moves the token.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004b1';
select public.save_push_token('ExponentPushToken[abc123]') \gset ignored_
reset role;
do $$ begin
  if (select user_id from public.push_tokens where token = 'ExponentPushToken[abc123]') <> '00000000-0000-0000-0000-0000000004b1' then
    raise exception 'FAIL: token not moved';
  end if;
end $$;

-- Admin: nobody else can use the admin functions.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004a1';
do $$ begin
  perform public.admin_pros_to_review();
  raise exception 'FAIL: pro used admin functions';
exception when insufficient_privilege then null;
end $$;

-- n1 applies; the admin is told and sees them with their email.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004b1';
select public.start_pro_application('{heating}') \gset ignored_
insert into public.credentials (pro_id, type, reference, expires_on) values
  ('00000000-0000-0000-0000-0000000004b1', 'gas_safe', '512345', current_date + 300),
  ('00000000-0000-0000-0000-0000000004b1', 'public_liability', 'PL-1', current_date + 300);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004d1';
do $$
declare r record;
begin
  if not pg_temp.notified(auth.uid(), 'New pro application') then
    raise exception 'FAIL: admin not told about the application';
  end if;
  select * into strict r from public.admin_pros_to_review() where pro_id = '00000000-0000-0000-0000-0000000004b1';
  if r.email <> 'nina@example.com' or jsonb_array_length(r.credentials) <> 2 then
    raise exception 'FAIL: application shown as %', r;
  end if;
  -- Not approvable until the documents are checked.
  begin
    perform public.admin_approve_pro('00000000-0000-0000-0000-0000000004b1');
    raise exception 'FAIL: approved without checked documents';
  exception when raise_exception then
    if sqlerrm not like 'still needs a verified gas_safe, public_liability' then raise; end if;
  end;
end $$;

-- The admin rejects the blurry insurance photo; n1 is asked for another.
do $$ begin
  perform public.admin_check_credential(id, true) from public.credentials
   where pro_id = '00000000-0000-0000-0000-0000000004b1' and type = 'gas_safe';
  perform public.admin_check_credential(id, false) from public.credentials
   where pro_id = '00000000-0000-0000-0000-0000000004b1' and type = 'public_liability';
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.credentials where pro_id = '00000000-0000-0000-0000-0000000004b1' and type = 'public_liability')
     or not pg_temp.notified('00000000-0000-0000-0000-0000000004b1', 'Please upload that document again') then
    raise exception 'FAIL: rejected document not removed or pro not told';
  end if;
end $$;

-- n1 uploads it again; it's accepted and n1 approved as a founding pro.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004b1';
insert into public.credentials (pro_id, type, reference, expires_on) values
  ('00000000-0000-0000-0000-0000000004b1', 'public_liability', 'PL-2', current_date + 300);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004d1';
select public.admin_check_credential(id, true) from public.credentials
 where pro_id = '00000000-0000-0000-0000-0000000004b1' and verified_at is null \gset ignored_
select public.admin_approve_pro('00000000-0000-0000-0000-0000000004b1') \gset ignored_
reset role;
do $$ begin
  if not exists (select 1 from public.pros where id = '00000000-0000-0000-0000-0000000004b1'
                 and approved_at is not null and is_founding and commission_rate = 0.10)
     or not pg_temp.notified('00000000-0000-0000-0000-0000000004b1', 'You''re approved') then
    raise exception 'FAIL: pro not approved or not told';
  end if;
end $$;

-- The customer reports a problem; the admin credits them £10 and closes it.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c1';
insert into public.problem_reports (job_id, kind, description) values
  ('00000000-0000-0000-0000-0000000004e1', 'not_fixed', 'Boiler stopped again overnight');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004d1';
do $$
declare r record;
begin
  select * into strict r from public.admin_open_reports();
  if r.job_label <> 'No heating or hot water' or r.pro_name <> 'James Carter' or r.paid_pence <> 20500 then
    raise exception 'FAIL: report shown as %', r;
  end if;
  perform public.admin_resolve_report(r.report_id, 'credited', 'Sorry about that. £10 off your next job.', 1000);
  if exists (select 1 from public.admin_open_reports()) then
    raise exception 'FAIL: resolved report still open';
  end if;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.customer_credits where customer_id = '00000000-0000-0000-0000-0000000004c1'
                 and pence = 1000 and reason = 'Relay Guarantee')
     or not pg_temp.notified('00000000-0000-0000-0000-0000000004c1', 'Update on your problem report')
     or not pg_temp.notified('00000000-0000-0000-0000-0000000004d1', 'New problem report') then
    raise exception 'FAIL: credit or report notifications missing';
  end if;
end $$;

-- Leave these pros offline so later test files don't offer them jobs.
update public.pros set is_online = false where id in ('00000000-0000-0000-0000-0000000004a1', '00000000-0000-0000-0000-0000000004b1');

select 'All live, push and admin tests passed' as result;
