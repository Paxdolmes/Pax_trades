-- Relay: what the pro leaves behind, and booking the same pro again.
--   * The pro adds after-photos and certificates (a gas safety record, a service
--     record, an EICR) to the job. The customer keeps them with the job, and a
--     landlord or agent sees them for their property's jobs.
--   * "Book Sam again": a customer can ask for a pro who has finished a job for them,
--     or at the same property. That pro is offered the job first, on their own: for
--     up to an hour on a booking, or 2 minutes in an emergency if they're online
--     nearby. If they say no or don't answer, it goes out as usual.
--   * A pro can say no to an offer, so the next pro hears about it straight away.

-- Same as before, plus how long an asked-for pro has to answer.
create or replace function public.relay_setting(p_key text) returns interval
language sql immutable as $$
  select case p_key
    when 'guarantee_window' then interval '30 days'
    when 'auto_confirm_after' then interval '48 hours'
    when 'late_grace' then interval '15 minutes'
    when 'urgent_eta' then interval '60 minutes'
    when 'booked_slot' then interval '0 minutes'
    when 'online_timeout' then interval '4 hours'
    when 'repeat_offer' then interval '1 hour'
    when 'repeat_offer_urgent' then interval '2 minutes'
  end;
$$;

-- Photos and certificates from the pro ------------------------------------------

create type public.job_file_kind as enum ('photo', 'certificate');

create table public.job_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  kind public.job_file_kind not null,
  storage_path text not null unique, -- in the job-files bucket, under the job's id
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/heic', 'application/pdf')),
  created_at timestamptz not null default now(),
  constraint job_files_in_the_jobs_folder check (split_part(storage_path, '/', 1) = job_id::text),
  constraint photos_are_pictures check (kind = 'certificate' or content_type <> 'application/pdf')
);

create index job_files_job_idx on public.job_files (job_id, created_at);

-- The job's pro adds files from arriving until the guarantee runs out, so a
-- certificate written up that evening can still go on.
create function public.can_add_job_file(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs
     where id = p_job and pro_id = auth.uid() and arrived_at is not null and status <> 'cancelled'
       and coalesce(finished_at, now()) > now() - public.relay_setting('guarantee_window')
  );
$$;

-- For the storage policy: each file goes in the folder named after its job.
create function public.can_add_job_file_at(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when split_part(p_path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_add_job_file(split_part(p_path, '/', 1)::uuid)
    else false
  end;
$$;

-- The customer, the pro, the property's landlord or agent, and the Relay team.
create function public.can_see_job_files(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.jobs j
      left join public.properties p on p.id = j.property_id
     where j.id = p_job and auth.uid() in (j.customer_id, j.pro_id, p.manager_id)
  );
$$;

-- Up to 6 photos and 4 certificate files (a photo of each page counts as one) a job.
create function public.check_job_file_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.job_files where job_id = new.job_id and kind = new.kind)
     >= (case new.kind when 'photo' then 6 else 4 end) then
    raise exception 'add up to 6 photos and 4 certificates to a job';
  end if;
  return new;
end;
$$;

create trigger job_files_limit before insert on public.job_files
  for each row execute function public.check_job_file_limit();

alter table public.job_files enable row level security;

create policy "the job's pro adds files" on public.job_files
  for insert with check (uploaded_by = auth.uid() and public.can_add_job_file(job_id));
create policy "people on the job see its files" on public.job_files
  for select using (public.can_see_job_files(job_id));

-- Files are kept as they were added.
revoke all on public.job_files from anon;
revoke insert, update, delete on public.job_files from authenticated;
grant insert (job_id, kind, storage_path, content_type) on public.job_files to authenticated;

-- The bucket, private. Skipped where Supabase Storage isn't installed (the plain
-- Postgres used by the SQL tests).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('job-files', 'job-files', false, 20971520,
            array['image/jpeg', 'image/png', 'image/heic', 'application/pdf'])
    on conflict (id) do nothing;
    execute $p$
      create policy "pros upload files to their jobs" on storage.objects
        for insert to authenticated
        with check (bucket_id = 'job-files' and public.can_add_job_file_at(name))
    $p$;
    execute $p$
      create policy "people on the job read its files" on storage.objects
        for select to authenticated
        using (bucket_id = 'job-files' and exists (
          select 1 from public.job_files f where f.storage_path = name))
    $p$;
  end if;
end $$;

-- Booking a pro again ---------------------------------------------------------------

alter table public.jobs add column preferred_pro_id uuid references public.pros (id);
grant insert (preferred_pro_id) on public.jobs to authenticated;

-- Only a pro who has finished a job for this customer, or at this property, can be
-- asked for. Anyone else is dropped and the job goes out as usual.
create function public.check_preferred_pro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.preferred_pro_id is not null and not exists (
    select 1 from public.jobs j
     where j.pro_id = new.preferred_pro_id and j.finished_at is not null
       and (j.customer_id = new.customer_id or (new.property_id is not null and j.property_id = new.property_id))
  ) then
    new.preferred_pro_id := null;
  end if;
  return new;
end;
$$;

create trigger jobs_check_preferred_pro before insert on public.jobs
  for each row execute function public.check_preferred_pro();

-- The asked-for pro, if they can take the job: vetted, qualified, not the pro who
-- failed to turn up for it, and for an emergency, online nearby.
create function public.preferred_pro(p_job uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id
    from public.jobs j
    join public.pros p on p.id = j.preferred_pro_id
   where j.id = p_job
     and j.trade = any (p.trades)
     and p.approved_at is not null
     and public.pro_can_take(p.id, j.job_type_id)
     and not exists (select 1 from public.no_shows n where n.job_id = j.id and n.pro_id = p.id)
     and (j.urgency = 'booked' or (
           p.is_online
           and p.last_seen_at > now() - public.relay_setting('online_timeout')
           and extensions.st_dwithin(p.last_location, j.location, 8000)
         ));
$$;

-- Same as before, except a job asked for by name goes to that pro first, on their
-- own. A booking gives them up to an hour, ending 2 hours before the visit where
-- it can. Once they say no or the offer runs out, it goes to the nearest pros.
create or replace function public.dispatch_job(p_job uuid, p_batch integer default 3) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  asked uuid;
  n integer;
begin
  select * into j from public.jobs
   where id = p_job and status = 'requested' and location is not null
     and coalesce(approval, 'approved') = 'approved'
     for update;
  if not found then
    return 0;
  end if;
  if exists (select 1 from public.job_offers where job_id = p_job and status = 'pending' and expires_at > now()) then
    return 0;
  end if;
  update public.job_offers set status = 'expired' where job_id = p_job and status = 'pending';
  asked := public.preferred_pro(p_job);
  if asked is not null then
    insert into public.job_offers (job_id, pro_id, expires_at)
    values (p_job, asked, case
      when j.urgency = 'urgent' then now() + public.relay_setting('repeat_offer_urgent')
      else greatest(now() + public.relay_setting('repeat_offer_urgent'),
                    least(now() + public.relay_setting('repeat_offer'), j.scheduled_for - interval '2 hours'))
    end)
    on conflict (job_id, pro_id) do nothing;
    get diagnostics n = row_count;
    if n > 0 then
      return n;
    end if;
  end if;
  insert into public.job_offers (job_id, pro_id)
  select p_job, e.pro_id from public.nearest_eligible_pros(p_job, p_batch) e
  on conflict (job_id, pro_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A pro says no: the offer closes and the job goes to the next pro straight away.
create function public.decline_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.job_offers;
begin
  update public.job_offers set status = 'declined'
   where id = p_offer and pro_id = auth.uid() and status = 'pending'
  returning * into o;
  if found then
    perform public.dispatch_job(o.job_id);
  end if;
end;
$$;

-- The asked-for pro hears it's them the customer wants.
create or replace function public.notify_offer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  place text;
begin
  select * into j from public.jobs where id = new.job_id;
  place := public.job_type_label(j.job_type_id) || ' in ' || split_part(upper(trim(j.postcode)), ' ', 1);
  if new.pro_id = j.preferred_pro_id then
    perform public.notify(
      new.pro_id,
      coalesce((select public.short_name(full_name) from public.profiles where id = j.customer_id), 'A customer')
        || ' asked for you again',
      place || '. Tap to see it.',
      '/offer/' || new.id
    );
  else
    perform public.notify(
      new.pro_id,
      case when j.urgency = 'urgent' then 'Urgent job nearby' else 'New job nearby' end,
      place || '. Tap to see it.',
      '/offer/' || new.id
    );
  end if;
  return null;
end;
$$;

-- The pro's open offers, now saying which were asked for by name.
drop function public.my_offers();

create function public.my_offers()
returns table (
  offer_id uuid,
  job_id uuid,
  job_type_id text,
  urgency public.job_urgency,
  district text,
  description text,
  customer_name text,
  distance_m double precision,
  scheduled_for timestamptz,
  expires_at timestamptz,
  asked_for_you boolean
)
language sql stable security definer set search_path = '' as $$
  select o.id, j.id, j.job_type_id, j.urgency,
         split_part(upper(trim(j.postcode)), ' ', 1),
         j.description, public.short_name(c.full_name),
         extensions.st_distance(p.last_location, j.location),
         j.scheduled_for, o.expires_at,
         o.pro_id is not distinct from j.preferred_pro_id
    from public.job_offers o
    join public.jobs j on j.id = o.job_id
    join public.pros p on p.id = o.pro_id
    left join public.profiles c on c.id = j.customer_id
   where o.pro_id = auth.uid() and o.status = 'pending' and o.expires_at > now()
     and j.status = 'requested'
   order by o.created_at desc;
$$;

-- Customers' own jobs, now with the pro they asked for.
drop function public.customer_jobs(uuid);

create function public.customer_jobs(p_job uuid default null)
returns table (
  job_id uuid,
  job_type_id text,
  urgency public.job_urgency,
  status public.job_status,
  postcode text,
  description text,
  created_at timestamptz,
  scheduled_for timestamptz,
  arrive_by timestamptz,
  arrived_at timestamptz,
  finished_at timestamptz,
  confirmed_at timestamptz,
  paid_at timestamptz,
  final_price_pence integer,
  tip_pence integer,
  pro_id uuid,
  pro_name text,
  pro_rating numeric,
  pro_reviews bigint,
  pro_completed_jobs bigint,
  pro_credentials public.credential_type[],
  property_id uuid,
  property_name text,
  approval text,
  approver_name text,
  decline_reason text,
  preferred_pro_name text
)
language sql stable security definer set search_path = '' as $$
  select j.id, j.job_type_id, j.urgency, j.status, j.postcode, j.description, j.created_at,
         j.scheduled_for, j.arrive_by, j.arrived_at, j.finished_at, j.confirmed_at, j.paid_at,
         j.final_price_pence, j.tip_pence, j.pro_id, pp.display_name, pp.rating, pp.review_count,
         pp.completed_jobs, pp.verified_credentials,
         j.property_id, p.name, j.approval, public.manager_name(p.manager_id), j.decline_reason,
         asked.display_name
    from public.jobs j
    left join public.pro_public_profiles pp on pp.id = j.pro_id
    left join public.pro_public_profiles asked on asked.id = j.preferred_pro_id
    left join public.properties p on p.id = j.property_id
   where j.customer_id = auth.uid() and (p_job is null or j.id = p_job)
   order by j.created_at desc
   limit 200;
$$;

-- The manager's request history, now with each job's photos and certificates.
drop function public.manager_jobs(uuid);

create function public.manager_jobs(p_property uuid default null)
returns table (
  job_id uuid,
  property_id uuid,
  property_name text,
  tenant_name text,
  booked_by_manager boolean,
  job_type_id text,
  urgency public.job_urgency,
  status public.job_status,
  approval text,
  description text,
  created_at timestamptz,
  scheduled_for timestamptz,
  finished_at timestamptz,
  confirmed_at timestamptz,
  paid_at timestamptz,
  final_price_pence integer,
  pro_name text,
  decline_reason text,
  files jsonb
)
language sql stable security definer set search_path = '' as $$
  select j.id, p.id, p.name, coalesce(c.full_name, 'Tenant'), j.customer_id = p.manager_id,
         j.job_type_id, j.urgency, j.status, j.approval, j.description, j.created_at,
         j.scheduled_for, j.finished_at, j.confirmed_at, j.paid_at, j.final_price_pence,
         pp.display_name, j.decline_reason,
         coalesce((select jsonb_agg(jsonb_build_object('path', f.storage_path, 'kind', f.kind, 'type', f.content_type)
                                    order by f.kind desc, f.created_at)
                     from public.job_files f where f.job_id = j.id), '[]'::jsonb)
    from public.jobs j
    join public.properties p on p.id = j.property_id
    join public.profiles c on c.id = j.customer_id
    left join public.pro_public_profiles pp on pp.id = j.pro_id
   where p.manager_id = auth.uid() and (p_property is null or p.id = p_property)
   order by j.created_at desc
   limit 500;
$$;

-- Functions run as their owner; only signed-in users may call these.
revoke execute on function public.can_add_job_file(uuid) from public, anon;
revoke execute on function public.can_add_job_file_at(text) from public, anon;
revoke execute on function public.can_see_job_files(uuid) from public, anon;
revoke execute on function public.preferred_pro(uuid) from public, anon, authenticated;
revoke execute on function public.decline_offer(uuid) from public, anon;
revoke execute on function public.my_offers() from public, anon;
revoke execute on function public.customer_jobs(uuid) from public, anon;
revoke execute on function public.manager_jobs(uuid) from public, anon;
grant execute on function public.can_add_job_file(uuid) to authenticated;
grant execute on function public.can_add_job_file_at(text) to authenticated;
grant execute on function public.can_see_job_files(uuid) to authenticated;
grant execute on function public.decline_offer(uuid) to authenticated;
grant execute on function public.my_offers() to authenticated;
grant execute on function public.customer_jobs(uuid) to authenticated;
grant execute on function public.manager_jobs(uuid) to authenticated;
