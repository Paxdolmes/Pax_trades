-- Behaviour tests for the pilot trust features: guarantee, media, no-shows, chat,
-- reviews and the quote cap. Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Customers f0 and f9. Plumbers f1 and f2, both vetted. g1-g5 are extra plumbers for the quote cap.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000f0'), ('00000000-0000-0000-0000-0000000000f9'),
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2'),
  ('00000000-0000-0000-0000-0000000000a6'), ('00000000-0000-0000-0000-0000000000a7'),
  ('00000000-0000-0000-0000-0000000000a8'), ('00000000-0000-0000-0000-0000000000a9'),
  ('00000000-0000-0000-0000-0000000000aa');
insert into public.profiles (id, role, full_name, phone) values
  ('00000000-0000-0000-0000-0000000000f0', 'customer', 'Sophie Turner', '07700900001'),
  ('00000000-0000-0000-0000-0000000000f9', 'customer', 'Other Customer', null),
  ('00000000-0000-0000-0000-0000000000f1', 'pro', 'James Carter', '07700900002'),
  ('00000000-0000-0000-0000-0000000000f2', 'pro', 'Tomasz Nowak', null),
  ('00000000-0000-0000-0000-0000000000a6', 'pro', null, null), ('00000000-0000-0000-0000-0000000000a7', 'pro', null, null),
  ('00000000-0000-0000-0000-0000000000a8', 'pro', null, null), ('00000000-0000-0000-0000-0000000000a9', 'pro', null, null),
  ('00000000-0000-0000-0000-0000000000aa', 'pro', null, null);
insert into public.pros (id, trades, approved_at)
select id, '{plumbing}', now() from public.profiles where role = 'pro' and id::text ~ '-0000000000(f[12]|a[6-9a])$';
insert into public.credentials (pro_id, type, expires_on, verified_at)
select p, t::public.credential_type, case when t = 'public_liability' then current_date + 100 end, now()
  from unnest(array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2']::uuid[]) p,
       unnest(array['plumbing_nvq', 'public_liability']) t;

-- Jobs set up directly: j1 offered to f1, j2 with f2 and already late, j3 and j4 finished 49 hours ago.
insert into public.jobs (id, customer_id, trade, job_type_id, urgency, postcode, description) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f0', 'plumbing', 'leak', 'urgent', 'SW6 4EH', 'Leak under the sink');
insert into public.job_offers (id, job_id, pro_id) values
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1');
insert into public.jobs (id, customer_id, trade, job_type_id, urgency, postcode, status, pro_id, accepted_at, arrive_by, finished_at) values
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000f0', 'plumbing', 'leak', 'urgent', 'SW6 4EH', 'accepted',
   '00000000-0000-0000-0000-0000000000f2', now() - interval '2 hours', now() - interval '30 minutes', null),
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000000f0', 'plumbing', 'leak', 'booked', 'SW6 4EH', 'on_site',
   '00000000-0000-0000-0000-0000000000f2', now() - interval '3 days', null, now() - interval '49 hours'),
  ('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-0000000000f0', 'plumbing', 'leak', 'booked', 'SW6 4EH', 'on_site',
   '00000000-0000-0000-0000-0000000000f2', now() - interval '3 days', null, now() - interval '49 hours');
insert into public.problem_reports (job_id, customer_id, kind, description) values
  ('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-0000000000f0', 'not_fixed', 'Still dripping after the visit');

set role authenticated;

-- Accepting an urgent job starts a 60 minute arrival clock.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select public.accept_offer('00000000-0000-0000-0000-0000000001b1') \gset ignored_
do $$ begin
  if not exists (select 1 from public.jobs where id = '00000000-0000-0000-0000-0000000001a1'
                  and arrive_by between now() + interval '59 minutes' and now() + interval '61 minutes') then
    raise exception 'FAIL: urgent job has no 60 minute arrive-by';
  end if;
end $$;

-- Chat: contact details are hidden, and only the customer and pro on the job can chat.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0';
insert into public.messages (job_id, body) values
  ('00000000-0000-0000-0000-0000000001a1', 'Call me on 07700 900123 or email sophie@example.com, door code 4512');
do $$ begin
  if (select body from public.messages where job_id = '00000000-0000-0000-0000-0000000001a1')
     <> 'Call me on [number hidden] or email [email hidden], door code 4512' then
    raise exception 'FAIL: contact details not hidden: %', (select body from public.messages limit 1);
  end if;
  if public.mask_contact_details('+44 (0)20 7946 0958') <> '[number hidden] ' then
    raise exception 'FAIL: landline not hidden: %', public.mask_contact_details('+44 (0)20 7946 0958');
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  if (select count(*) from public.messages) <> 1 then raise exception 'FAIL: pro on the job cannot read chat'; end if;
  update public.messages set body = 'edited';
  raise exception 'FAIL: chat message edited';
exception when insufficient_privilege then null;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin
  if exists (select 1 from public.messages) then raise exception 'FAIL: another pro reads the chat'; end if;
  insert into public.messages (job_id, body) values ('00000000-0000-0000-0000-0000000001a1', 'hello');
  raise exception 'FAIL: another pro joined the chat';
exception when insufficient_privilege then null;
end $$;

-- Lifecycle: nobody edits jobs directly; only the job's pro marks arrival and finish;
-- only the customer confirms.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0';
do $$ begin
  update public.jobs set status = 'completed' where id = '00000000-0000-0000-0000-0000000001a1';
  raise exception 'FAIL: customer updated a job directly';
exception when insufficient_privilege then null;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin
  perform public.pro_arrived('00000000-0000-0000-0000-0000000001a1');
  raise exception 'FAIL: another pro marked arrival';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select public.pro_arrived('00000000-0000-0000-0000-0000000001a1') \gset ignored_
do $$ begin
  perform public.pro_finished('00000000-0000-0000-0000-0000000001a1', 0);
  raise exception 'FAIL: finished with a zero price';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select public.pro_finished('00000000-0000-0000-0000-0000000001a1', 20300) \gset ignored_
do $$ begin
  perform public.confirm_job('00000000-0000-0000-0000-0000000001a1');
  raise exception 'FAIL: pro confirmed their own job';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0';
select public.confirm_job('00000000-0000-0000-0000-0000000001a1', 500) \gset ignored_
do $$ begin
  if not exists (select 1 from public.jobs where id = '00000000-0000-0000-0000-0000000001a1'
                  and status = 'completed' and final_price_pence = 20300 and tip_pence = 500) then
    raise exception 'FAIL: confirmed job missing price or tip';
  end if;
end $$;

-- Reviews: only once the job is paid, only by its customer, once; the pro replies once.
do $$ begin
  insert into public.reviews (job_id, pro_id, rating, body) values
    ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 5, 'Great');
  raise exception 'FAIL: reviewed an unpaid job';
exception when insufficient_privilege then null;
end $$;
reset role;
update public.jobs set paid_at = now() where id = '00000000-0000-0000-0000-0000000001a1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f9';
do $$ begin
  insert into public.reviews (job_id, pro_id, rating) values
    ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 1);
  raise exception 'FAIL: someone else reviewed the job';
exception when insufficient_privilege then null;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0';
insert into public.reviews (id, job_id, pro_id, rating, body) values
  ('00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 5, 'Fixed it in 20 minutes');
do $$ begin
  insert into public.reviews (job_id, pro_id, rating) values
    ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 4);
  raise exception 'FAIL: job reviewed twice';
exception when unique_violation then null;
end $$;
do $$ begin
  perform public.reply_to_review('00000000-0000-0000-0000-0000000001c1', 'My reply as the customer');
  raise exception 'FAIL: customer replied as the pro';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select public.reply_to_review('00000000-0000-0000-0000-0000000001c1', 'Thanks Sophie!') \gset ignored_
do $$ begin
  perform public.reply_to_review('00000000-0000-0000-0000-0000000001c1', 'Second reply');
  raise exception 'FAIL: pro replied twice';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- The public profile shows first name and initial, rating and job count, nothing private.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f9';
do $$
declare p record;
begin
  select * into p from public.pro_public_profiles where id = '00000000-0000-0000-0000-0000000000f1';
  if p.display_name <> 'James C' or p.rating <> 5 or p.review_count <> 1 or p.completed_jobs <> 1
     or p.verified_credentials <> '{plumbing_nvq,public_liability}' then
    raise exception 'FAIL: public profile wrong: %', row_to_json(p);
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'pro_public_profiles'
              and column_name in ('phone', 'full_name', 'last_location')) then
    raise exception 'FAIL: public profile exposes private columns';
  end if;
end $$;

-- Guarantee: the customer can report a problem within 30 days of the job, not after.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0';
insert into public.problem_reports (id, job_id, kind, description) values
  ('00000000-0000-0000-0000-0000000001d1', '00000000-0000-0000-0000-0000000001a1', 'not_fixed', 'Leaking again the next day');
do $$ begin
  insert into public.problem_reports (job_id, kind, description, status) values
    ('00000000-0000-0000-0000-0000000001a1', 'other', 'Trying to self-resolve', 'refunded');
  raise exception 'FAIL: customer set report status';
exception when insufficient_privilege then null;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f9';
do $$ begin
  insert into public.problem_reports (job_id, kind, description) values
    ('00000000-0000-0000-0000-0000000001a1', 'damage', 'Not my job at all');
  raise exception 'FAIL: someone else reported a problem';
exception when insufficient_privilege then null;
end $$;
reset role;
update public.jobs set confirmed_at = now() - interval '31 days' where id = '00000000-0000-0000-0000-0000000001a1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0';
do $$ begin
  insert into public.problem_reports (job_id, kind, description) values
    ('00000000-0000-0000-0000-0000000001a1', 'not_fixed', 'Leaking a month later');
  raise exception 'FAIL: reported a problem after 30 days';
exception when insufficient_privilege then null;
end $$;

-- Media: up to 3 photos, or one video of 30 seconds or less.
insert into public.request_media (job_id, kind, storage_path)
select '00000000-0000-0000-0000-0000000001a1', 'photo', 'f0/photo-' || n || '.jpg' from generate_series(1, 3) n;
do $$ begin
  insert into public.request_media (job_id, kind, storage_path) values ('00000000-0000-0000-0000-0000000001a1', 'photo', 'f0/photo-4.jpg');
  raise exception 'FAIL: fourth photo accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
insert into public.request_media (problem_report_id, kind, storage_path, duration_seconds) values
  ('00000000-0000-0000-0000-0000000001d1', 'video', 'f0/leak.mp4', 20);
do $$ begin
  insert into public.request_media (problem_report_id, kind, storage_path) values ('00000000-0000-0000-0000-0000000001d1', 'photo', 'f0/extra.jpg');
  raise exception 'FAIL: photo added after a video';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
do $$ begin
  insert into public.request_media (job_id, kind, storage_path, duration_seconds) values ('00000000-0000-0000-0000-0000000001a3', 'video', 'f0/long.mp4', 90);
  raise exception 'FAIL: 90 second video accepted';
exception when check_violation then null;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f9';
do $$ begin
  if exists (select 1 from public.request_media) then raise exception 'FAIL: another customer sees photos'; end if;
  insert into public.request_media (job_id, kind, storage_path) values ('00000000-0000-0000-0000-0000000001a3', 'photo', 'f9/x.jpg');
  raise exception 'FAIL: photo added to someone else''s job';
exception when insufficient_privilege then null;
end $$;

-- Server jobs aren't callable from the app.
do $$ begin
  perform public.reassign_late_jobs();
  raise exception 'FAIL: app called reassign_late_jobs';
exception when insufficient_privilege then null;
end $$;

-- No-shows: the late job goes back out, the pro is recorded and the customer gets a credit.
reset role;
do $$ begin
  if public.reassign_late_jobs() <> 1 then raise exception 'FAIL: late job not reassigned'; end if;
  if not exists (select 1 from public.jobs where id = '00000000-0000-0000-0000-0000000001a2' and status = 'requested' and pro_id is null) then
    raise exception 'FAIL: late job still assigned';
  end if;
  if not exists (select 1 from public.no_shows where job_id = '00000000-0000-0000-0000-0000000001a2' and pro_id = '00000000-0000-0000-0000-0000000000f2') then
    raise exception 'FAIL: no-show not recorded';
  end if;
  if (select sum(pence) from public.customer_credits where customer_id = '00000000-0000-0000-0000-0000000000f0') <> 1000 then
    raise exception 'FAIL: no-show credit missing';
  end if;
  if public.reassign_late_jobs() <> 0 then raise exception 'FAIL: reassigned twice'; end if;
end $$;
-- The customer can still report the no-show.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0';
insert into public.problem_reports (job_id, kind, description) values
  ('00000000-0000-0000-0000-0000000001a2', 'no_show', 'Nobody came');

-- After 48 hours an undisputed job is confirmed; one with an open report waits.
reset role;
do $$ begin
  if public.auto_confirm_jobs() <> 1 then raise exception 'FAIL: auto-confirm count'; end if;
  if not exists (select 1 from public.jobs where id = '00000000-0000-0000-0000-0000000001a3' and status = 'completed' and confirmed_at is not null) then
    raise exception 'FAIL: undisputed job not confirmed';
  end if;
  if not exists (select 1 from public.jobs where id = '00000000-0000-0000-0000-0000000001a4' and status = 'on_site') then
    raise exception 'FAIL: disputed job confirmed';
  end if;
end $$;

-- Quote cap: a request takes 5 quotes, then closes to new pros.
insert into public.quote_requests (id, customer_id, postcode, description, trades) values
  ('00000000-0000-0000-0000-0000000001e1', '00000000-0000-0000-0000-0000000000f0', 'SW6 4EH', 'Box in the pipes in the kitchen', '{plumbing}');
insert into public.quotes (request_id, pro_id, trade, price_pence)
select '00000000-0000-0000-0000-0000000001e1', id, 'plumbing', 15000 from public.pros
 where id in ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8',
              '00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000f2');
do $$ begin
  insert into public.quotes (request_id, pro_id, trade, price_pence) values
    ('00000000-0000-0000-0000-0000000001e1', '00000000-0000-0000-0000-0000000000aa', 'plumbing', 12000);
  raise exception 'FAIL: sixth quote accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  if exists (select 1 from public.quote_requests where id = '00000000-0000-0000-0000-0000000001e1') then
    raise exception 'FAIL: full request still shown to new pros';
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin
  if not exists (select 1 from public.quote_requests where id = '00000000-0000-0000-0000-0000000001e1') then
    raise exception 'FAIL: pro who quoted lost sight of the request';
  end if;
end $$;
reset role;

\echo All pilot trust tests passed
