-- Behaviour tests for the pro's photos and certificates, and booking the same pro
-- again. Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Tenant bc0 at landlord bd0's flat, another customer bc9. Gas engineers ba1 (Sam,
-- who has worked for bc0 before, and is the furthest away) and ba2-ba4, all vetted.
-- Everyone is in east London, well away from the other tests' pros in Fulham.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000bc0'), ('00000000-0000-0000-0000-000000000bc9'),
  ('00000000-0000-0000-0000-000000000bd0'), ('00000000-0000-0000-0000-000000000ba1'),
  ('00000000-0000-0000-0000-000000000ba2'), ('00000000-0000-0000-0000-000000000ba3'),
  ('00000000-0000-0000-0000-000000000ba4');
insert into public.profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-000000000bc0', 'customer', 'Hannah Lee'),
  ('00000000-0000-0000-0000-000000000bc9', 'customer', 'Other Customer'),
  ('00000000-0000-0000-0000-000000000bd0', 'customer', 'Lisa Landlord'),
  ('00000000-0000-0000-0000-000000000ba1', 'pro', 'Sam Wilson'),
  ('00000000-0000-0000-0000-000000000ba2', 'pro', 'Pro Two'),
  ('00000000-0000-0000-0000-000000000ba3', 'pro', 'Pro Three'),
  ('00000000-0000-0000-0000-000000000ba4', 'pro', 'Pro Four');
insert into public.pros (id, trades, approved_at, is_online, last_seen_at, last_location) values
  ('00000000-0000-0000-0000-000000000ba1', '{heating}', now(), false, now(), 'SRID=4326;POINT(0.1300 51.5500)'),
  ('00000000-0000-0000-0000-000000000ba2', '{heating}', now(), true, now(), 'SRID=4326;POINT(0.1010 51.5500)'),
  ('00000000-0000-0000-0000-000000000ba3', '{heating}', now(), true, now(), 'SRID=4326;POINT(0.1050 51.5500)'),
  ('00000000-0000-0000-0000-000000000ba4', '{heating}', now(), true, now(), 'SRID=4326;POINT(0.1100 51.5500)');
insert into public.credentials (pro_id, type, expires_on, verified_at)
select p, t::public.credential_type, current_date + 100, now()
  from unnest(array['00000000-0000-0000-0000-000000000ba1', '00000000-0000-0000-0000-000000000ba2',
                    '00000000-0000-0000-0000-000000000ba3', '00000000-0000-0000-0000-000000000ba4']::uuid[]) p,
       unnest(array['gas_safe', 'public_liability']) t;
insert into public.properties (id, manager_id, name, postcode) values
  ('00000000-0000-0000-0000-000000000be1', '00000000-0000-0000-0000-000000000bd0', 'Flat 1, 2 Test Road', 'E15 1AA');
insert into public.property_tenants (property_id, tenant_id) values
  ('00000000-0000-0000-0000-000000000be1', '00000000-0000-0000-0000-000000000bc0');

-- Sam is on site at bc0's boiler service (bb1). bb2 is Sam's next job, not started yet.
insert into public.jobs (id, customer_id, property_id, trade, job_type_id, urgency, postcode, status, pro_id, accepted_at, arrived_at) values
  ('00000000-0000-0000-0000-000000000bb1', '00000000-0000-0000-0000-000000000bc0', '00000000-0000-0000-0000-000000000be1',
   'heating', 'boiler-service', 'booked', 'E15 1AA', 'on_site', '00000000-0000-0000-0000-000000000ba1', now() - interval '2 hours', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000bb2', '00000000-0000-0000-0000-000000000bc9', null,
   'heating', 'boiler-service', 'booked', 'E15 1AA', 'accepted', '00000000-0000-0000-0000-000000000ba1', now() - interval '1 hour', null);

-- Photos and certificates ------------------------------------------------------------

set role authenticated;

-- Sam adds an after-photo and the service record, each in the job's own folder.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000ba1';
insert into public.job_files (job_id, kind, storage_path, content_type) values
  ('00000000-0000-0000-0000-000000000bb1', 'photo', '00000000-0000-0000-0000-000000000bb1/photo-1.jpg', 'image/jpeg'),
  ('00000000-0000-0000-0000-000000000bb1', 'certificate', '00000000-0000-0000-0000-000000000bb1/certificate-1.pdf', 'application/pdf');
do $$ begin
  if not public.can_add_job_file_at('00000000-0000-0000-0000-000000000bb1/photo-2.jpg') then
    raise exception 'FAIL: the pro cannot upload to their job''s folder';
  end if;
  if public.can_add_job_file_at('00000000-0000-0000-0000-000000000bb2/photo-1.jpg') then
    raise exception 'FAIL: the pro can upload before arriving';
  end if;
  if public.can_add_job_file_at('not-a-job/photo-1.jpg') or public.can_add_job_file_at('photo-1.jpg') then
    raise exception 'FAIL: upload allowed outside a job folder';
  end if;
end $$;

-- A PDF isn't a photo, and a file can't point into another job's folder.
do $$ begin
  insert into public.job_files (job_id, kind, storage_path, content_type) values
    ('00000000-0000-0000-0000-000000000bb1', 'photo', '00000000-0000-0000-0000-000000000bb1/photo-x.pdf', 'application/pdf');
  raise exception 'FAIL: PDF saved as a photo';
exception when check_violation then null;
end $$;
do $$ begin
  insert into public.job_files (job_id, kind, storage_path, content_type) values
    ('00000000-0000-0000-0000-000000000bb1', 'photo', '00000000-0000-0000-0000-000000000bb2/photo-x.jpg', 'image/jpeg');
  raise exception 'FAIL: file outside the job''s folder';
exception when check_violation then null;
end $$;

-- Not before arriving, and the files can't be changed or removed.
do $$ begin
  insert into public.job_files (job_id, kind, storage_path, content_type) values
    ('00000000-0000-0000-0000-000000000bb2', 'photo', '00000000-0000-0000-0000-000000000bb2/photo-1.jpg', 'image/jpeg');
  raise exception 'FAIL: file added before arriving';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update public.job_files set kind = 'photo';
  raise exception 'FAIL: file changed';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  delete from public.job_files;
  raise exception 'FAIL: file removed';
exception when insufficient_privilege then null;
end $$;

-- Up to 6 photos.
insert into public.job_files (job_id, kind, storage_path, content_type)
select '00000000-0000-0000-0000-000000000bb1', 'photo', '00000000-0000-0000-0000-000000000bb1/photo-' || i || '.jpg', 'image/jpeg'
  from generate_series(2, 6) i;
do $$ begin
  insert into public.job_files (job_id, kind, storage_path, content_type) values
    ('00000000-0000-0000-0000-000000000bb1', 'photo', '00000000-0000-0000-0000-000000000bb1/photo-7.jpg', 'image/jpeg');
  raise exception 'FAIL: seventh photo added';
exception when raise_exception then
  if sqlerrm not like 'add up to 6 photos%' then raise; end if;
end $$;

-- Another pro and the customer can't add files.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000ba2';
do $$ begin
  insert into public.job_files (job_id, kind, storage_path, content_type) values
    ('00000000-0000-0000-0000-000000000bb1', 'certificate', '00000000-0000-0000-0000-000000000bb1/fake.pdf', 'application/pdf');
  raise exception 'FAIL: another pro added a file';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  if exists (select 1 from public.job_files) then raise exception 'FAIL: another pro sees the files'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc0';
do $$ begin
  insert into public.job_files (job_id, kind, storage_path, content_type) values
    ('00000000-0000-0000-0000-000000000bb1', 'certificate', '00000000-0000-0000-0000-000000000bb1/mine.pdf', 'application/pdf');
  raise exception 'FAIL: the customer added a file';
exception when insufficient_privilege then null;
end $$;

-- The customer and the landlord see them; another customer doesn't.
do $$ begin
  if (select count(*) from public.job_files) <> 7 then
    raise exception 'FAIL: the customer sees % files', (select count(*) from public.job_files);
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bd0';
do $$
declare files jsonb;
begin
  if (select count(*) from public.job_files) <> 7 then raise exception 'FAIL: the landlord can''t see the files'; end if;
  select m.files into files from public.manager_jobs() m where m.job_id = '00000000-0000-0000-0000-000000000bb1';
  if jsonb_array_length(files) <> 7 or files -> 0 ->> 'kind' <> 'certificate'
     or files -> 0 ->> 'path' <> '00000000-0000-0000-0000-000000000bb1/certificate-1.pdf' then
    raise exception 'FAIL: landlord''s history files wrong: %', files;
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc9';
do $$ begin
  if exists (select 1 from public.job_files) then raise exception 'FAIL: another customer sees the files'; end if;
end $$;
reset role;

-- Sam finishes the job.
update public.jobs set finished_at = now() where id = '00000000-0000-0000-0000-000000000bb1';

-- Booking Sam again ---------------------------------------------------------------------

create function pg_temp.offered(p_job uuid) returns uuid[] language sql as $$
  select coalesce(array_agg(pro_id order by pro_id), '{}') from public.job_offers where job_id = p_job and status = 'pending'
$$;

-- bc0 books Sam again for tomorrow. Sam is offline, but a booking still goes to him
-- first, on his own, for an hour.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc0';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, scheduled_for, preferred_pro_id) values
  ('00000000-0000-0000-0000-000000000bb3', 'heating', 'boiler-service', 'booked', 'E15 1AA', 'SRID=4326;POINT(0.1000 51.5500)',
   date_trunc('day', now()) + interval '1 day 10 hours', '00000000-0000-0000-0000-000000000ba1');
reset role;
do $$ begin
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb3') <> array['00000000-0000-0000-0000-000000000ba1']::uuid[] then
    raise exception 'FAIL: the rebooking went to %', pg_temp.offered('00000000-0000-0000-0000-000000000bb3');
  end if;
  if not exists (select 1 from public.job_offers where job_id = '00000000-0000-0000-0000-000000000bb3'
                  and expires_at between now() + interval '59 minutes' and now() + interval '61 minutes') then
    raise exception 'FAIL: Sam doesn''t have an hour to answer';
  end if;
  if not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000ba1'
                  and title = 'Hannah L. asked for you again' and body = 'Boiler service in E15. Tap to see it.') then
    raise exception 'FAIL: Sam wasn''t told it''s him they want';
  end if;
  -- While Sam decides, the retry sends it to nobody else.
  perform public.dispatch_jobs();
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb3') <> array['00000000-0000-0000-0000-000000000ba1']::uuid[] then
    raise exception 'FAIL: offered to others while Sam decides';
  end if;
end $$;

-- Sam sees it was asked for by name; the customer sees who they asked for.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000ba1';
do $$ begin
  if not (select asked_for_you from public.my_offers() where job_id = '00000000-0000-0000-0000-000000000bb3') then
    raise exception 'FAIL: Sam''s offer isn''t marked as asked for';
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc0';
do $$ begin
  if (select preferred_pro_name from public.customer_jobs('00000000-0000-0000-0000-000000000bb3')) <> 'Sam W' then
    raise exception 'FAIL: customer doesn''t see who they asked for';
  end if;
end $$;

-- Another pro can't decline Sam's offer. When Sam says no, the 3 nearest hear at once.
reset role;
select id as sam_offer from public.job_offers where job_id = '00000000-0000-0000-0000-000000000bb3' \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000ba2';
select public.decline_offer(:'sam_offer') \gset ignored_
reset role;
do $$ begin
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb3') <> array['00000000-0000-0000-0000-000000000ba1']::uuid[] then
    raise exception 'FAIL: another pro declined Sam''s offer';
  end if;
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000ba1';
select public.decline_offer(:'sam_offer') \gset ignored_
reset role;
do $$ begin
  if not exists (select 1 from public.job_offers where job_id = '00000000-0000-0000-0000-000000000bb3'
                  and pro_id = '00000000-0000-0000-0000-000000000ba1' and status = 'declined') then
    raise exception 'FAIL: Sam''s offer isn''t declined';
  end if;
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb3') <> array['00000000-0000-0000-0000-000000000ba2',
     '00000000-0000-0000-0000-000000000ba3', '00000000-0000-0000-0000-000000000ba4']::uuid[] then
    raise exception 'FAIL: after Sam said no it went to %', pg_temp.offered('00000000-0000-0000-0000-000000000bb3');
  end if;
end $$;

-- A booking soon gives Sam less time: here the visit is in 2.5 hours, so 30 minutes.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc0';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, scheduled_for, preferred_pro_id) values
  ('00000000-0000-0000-0000-000000000bb4', 'heating', 'boiler-service', 'booked', 'E15 1AA', 'SRID=4326;POINT(0.1000 51.5500)',
   now() + interval '150 minutes', '00000000-0000-0000-0000-000000000ba1');
reset role;
do $$ begin
  if not exists (select 1 from public.job_offers where job_id = '00000000-0000-0000-0000-000000000bb4'
                  and pro_id = '00000000-0000-0000-0000-000000000ba1'
                  and expires_at between now() + interval '29 minutes' and now() + interval '31 minutes') then
    raise exception 'FAIL: a booking soon didn''t give Sam 30 minutes';
  end if;
end $$;

-- Sam takes it from the notification, still offline.
select id as soon_offer from public.job_offers where job_id = '00000000-0000-0000-0000-000000000bb4' \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000ba1';
select (public.accept_offer(:'soon_offer')).status as soon_status \gset
reset role;
do $$ begin
  if (select pro_id from public.jobs where id = '00000000-0000-0000-0000-000000000bb4')
     is distinct from '00000000-0000-0000-0000-000000000ba1' then
    raise exception 'FAIL: an offline Sam couldn''t take the booking he was asked for';
  end if;
end $$;

-- An emergency only waits for Sam if he's online nearby: offline, it goes straight out.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc0';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, preferred_pro_id) values
  ('00000000-0000-0000-0000-000000000bb5', 'heating', 'no-heating', 'urgent', 'E15 1AA', 'SRID=4326;POINT(0.1000 51.5500)',
   '00000000-0000-0000-0000-000000000ba1');
reset role;
do $$ begin
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb5') <> array['00000000-0000-0000-0000-000000000ba2',
     '00000000-0000-0000-0000-000000000ba3', '00000000-0000-0000-0000-000000000ba4']::uuid[] then
    raise exception 'FAIL: an emergency waited for an offline pro: %', pg_temp.offered('00000000-0000-0000-0000-000000000bb5');
  end if;
end $$;

-- Online, Sam gets 2 minutes. Then it goes to the 3 nearest.
update public.pros set is_online = true where id = '00000000-0000-0000-0000-000000000ba1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc0';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, preferred_pro_id) values
  ('00000000-0000-0000-0000-000000000bb6', 'heating', 'no-heating', 'urgent', 'E15 1AA', 'SRID=4326;POINT(0.1000 51.5500)',
   '00000000-0000-0000-0000-000000000ba1');
reset role;
do $$ begin
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb6') <> array['00000000-0000-0000-0000-000000000ba1']::uuid[]
     or not exists (select 1 from public.job_offers where job_id = '00000000-0000-0000-0000-000000000bb6'
                     and expires_at between now() + interval '119 seconds' and now() + interval '121 seconds') then
    raise exception 'FAIL: an emergency didn''t give an online Sam 2 minutes';
  end if;
end $$;
update public.job_offers set expires_at = now() - interval '1 second'
 where job_id = '00000000-0000-0000-0000-000000000bb6' and status = 'pending';
select public.dispatch_jobs() \gset ignored_
do $$ begin
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb6') <> array['00000000-0000-0000-0000-000000000ba2',
     '00000000-0000-0000-0000-000000000ba3', '00000000-0000-0000-0000-000000000ba4']::uuid[] then
    raise exception 'FAIL: after Sam''s 2 minutes it went to %', pg_temp.offered('00000000-0000-0000-0000-000000000bb6');
  end if;
end $$;

-- Only a pro who has worked for you can be asked for: bc9 never had Sam on a
-- finished job, so their request goes out as usual.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bc9';
insert into public.jobs (id, trade, job_type_id, urgency, postcode, location, scheduled_for, preferred_pro_id) values
  ('00000000-0000-0000-0000-000000000bb7', 'heating', 'boiler-service', 'booked', 'E15 1AA', 'SRID=4326;POINT(0.1000 51.5500)',
   date_trunc('day', now()) + interval '1 day 10 hours', '00000000-0000-0000-0000-000000000ba1');
reset role;
do $$ begin
  if (select preferred_pro_id from public.jobs where id = '00000000-0000-0000-0000-000000000bb7') is not null then
    raise exception 'FAIL: asked for a pro who never worked for them';
  end if;
  if pg_temp.offered('00000000-0000-0000-0000-000000000bb7') <> array['00000000-0000-0000-0000-000000000ba2',
     '00000000-0000-0000-0000-000000000ba3', '00000000-0000-0000-0000-000000000ba4']::uuid[] then
    raise exception 'FAIL: their request went to %', pg_temp.offered('00000000-0000-0000-0000-000000000bb7');
  end if;
end $$;

-- The app can't pick the asked-for pro itself.
set role authenticated;
do $$ begin
  perform public.preferred_pro('00000000-0000-0000-0000-000000000bb3');
  raise exception 'FAIL: app called preferred_pro';
exception when insufficient_privilege then null;
end $$;
reset role;

-- The tests share one database: take these pros offline so later tests don't match them.
update public.pros set is_online = false where id::text like '00000000-0000-0000-0000-000000000ba_';

\echo All job files and rebooking tests passed
