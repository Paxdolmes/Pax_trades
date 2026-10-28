-- Relay: trust features for the Fulham pilot.
--   1. Relay Guarantee: customers report a problem up to 30 days after a job.
--   2. Up to 3 photos or a short video on job and quote requests.
--   3. No-show protection: late pros lose the job to the next one, and a job only
--      counts as done once the customer confirms or 48 hours pass with no complaint.
--   4. In-app chat between customer and pro, with phone numbers and emails hidden.
--   5. Verified reviews, only from paid, finished jobs, with one reply from the pro.
--   6. Each Get quotes request takes at most 5 quotes, so pros aren't bidding against a crowd.

-- Settings in one place so the pilot can tune them.
create function public.relay_setting(p_key text) returns interval
language sql immutable as $$
  select case p_key
    when 'guarantee_window' then interval '30 days'
    when 'auto_confirm_after' then interval '48 hours'
    when 'late_grace' then interval '15 minutes'
    when 'urgent_eta' then interval '60 minutes'
  end;
$$;

-- Credit given to a customer when a pro doesn't turn up, in pence.
create function public.no_show_credit_pence() returns integer
language sql immutable as $$ select 1000 $$;

-- Job lifecycle ---------------------------------------------------------------

alter table public.jobs
  add column accepted_at timestamptz,
  add column arrive_by timestamptz, -- the pro must arrive by this time or the job is reassigned
  add column arrived_at timestamptz,
  add column finished_at timestamptz, -- the pro says the work is done
  add column confirmed_at timestamptz, -- the customer agreed, or 48 hours passed with no complaint
  add column paid_at timestamptz; -- set by the payment webhook

-- Accepting now also starts the arrival clock.
create or replace function public.accept_offer(p_offer uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  o public.job_offers;
  j public.jobs;
begin
  select * into o from public.job_offers where id = p_offer for update;
  if not found or o.pro_id is distinct from auth.uid() then
    raise exception 'offer not found';
  end if;
  if o.status <> 'pending' or o.expires_at < now() then
    raise exception 'offer is no longer available';
  end if;

  select * into j from public.jobs where id = o.job_id for update;
  if j.status <> 'requested' then
    raise exception 'job has already been taken';
  end if;
  if not public.pro_can_take(o.pro_id, j.job_type_id) then
    raise exception 'missing a required credential for this job';
  end if;

  update public.job_offers set status = 'accepted' where id = o.id;
  update public.job_offers set status = 'expired'
    where job_id = o.job_id and id <> o.id and status = 'pending';
  update public.jobs
     set status = 'accepted',
         pro_id = o.pro_id,
         accepted_at = now(),
         arrive_by = case
           when j.urgency = 'urgent' then now() + public.relay_setting('urgent_eta')
           else coalesce(j.scheduled_for, now()) + public.relay_setting('late_grace')
         end
   where id = o.job_id returning * into j;
  return j;
end;
$$;

create table public.no_shows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.customer_credits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  pence integer not null check (pence > 0),
  reason text not null,
  job_id uuid references public.jobs (id),
  created_at timestamptz not null default now()
);

-- Called by the assigned pro on arrival.
create function public.pro_arrived(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  update public.jobs set status = 'on_site', arrived_at = now()
   where id = p_job and pro_id = auth.uid() and status in ('accepted', 'en_route')
  returning * into j;
  if not found then
    raise exception 'job not found or not on its way';
  end if;
  return j;
end;
$$;

-- Called by the assigned pro when the work is done. The customer then confirms.
create function public.pro_finished(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  update public.jobs set finished_at = now()
   where id = p_job and pro_id = auth.uid() and status = 'on_site' and finished_at is null
  returning * into j;
  if not found then
    raise exception 'job not found or not on site';
  end if;
  return j;
end;
$$;

-- Called by the customer: the work is done and they're happy for the pro to be paid.
create function public.confirm_job(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  update public.jobs set status = 'completed', confirmed_at = now()
   where id = p_job and customer_id = auth.uid() and finished_at is not null and status = 'on_site'
  returning * into j;
  if not found then
    raise exception 'job not found or not finished yet';
  end if;
  return j;
end;
$$;

-- Server job, every few minutes: hands late jobs to the next pro, with a credit for
-- the customer. The dispatcher sends new offers for jobs back in 'requested'.
create function public.reassign_late_jobs() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  n integer := 0;
begin
  for j in
    select * from public.jobs
     where status in ('accepted', 'en_route') and arrived_at is null
       and arrive_by + public.relay_setting('late_grace') < now()
     for update skip locked
  loop
    insert into public.no_shows (job_id, pro_id) values (j.id, j.pro_id);
    insert into public.customer_credits (customer_id, pence, reason, job_id)
      values (j.customer_id, public.no_show_credit_pence(), 'Your pro did not arrive in time', j.id);
    update public.jobs
       set status = 'requested', pro_id = null, accepted_at = null, arrive_by = null
     where id = j.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Server job, hourly: confirms finished jobs the customer hasn't disputed within 48 hours.
create function public.auto_confirm_jobs() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.jobs j set status = 'completed', confirmed_at = now()
   where j.status = 'on_site'
     and j.finished_at < now() - public.relay_setting('auto_confirm_after')
     and not exists (select 1 from public.problem_reports r where r.job_id = j.id and r.status = 'open');
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Relay Guarantee ------------------------------------------------------------

create type public.problem_kind as enum ('not_fixed', 'damage', 'no_show', 'overcharged', 'other');
create type public.problem_status as enum ('open', 'pro_returning', 'refunded', 'credited', 'closed');

create table public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  customer_id uuid not null default auth.uid() references public.profiles (id),
  kind public.problem_kind not null,
  description text not null check (char_length(description) between 5 and 2000),
  status public.problem_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index problem_reports_job_idx on public.problem_reports (job_id);

-- True when the customer may still report a problem on the job: from the moment
-- the pro has been assigned, until 30 days after the job was confirmed.
create function public.can_report_problem(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs
     where id = p_job and customer_id = auth.uid()
       and (pro_id is not null or exists (select 1 from public.no_shows n where n.job_id = p_job))
       and (confirmed_at is null or confirmed_at > now() - public.relay_setting('guarantee_window'))
  );
$$;

create function public.is_job_party(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.jobs where id = p_job and (customer_id = auth.uid() or pro_id = auth.uid()));
$$;

-- Media on requests ----------------------------------------------------------

create type public.media_kind as enum ('photo', 'video');

create table public.request_media (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete cascade,
  quote_request_id uuid references public.quote_requests (id) on delete cascade,
  problem_report_id uuid references public.problem_reports (id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  kind public.media_kind not null,
  storage_path text not null, -- path in the request-media bucket
  duration_seconds integer check (duration_seconds between 1 and 30), -- videos only
  created_at timestamptz not null default now(),
  constraint media_belongs_to_one_thing check (num_nonnulls(job_id, quote_request_id, problem_report_id) = 1),
  constraint videos_have_a_duration check ((kind = 'video') = (duration_seconds is not null))
);

-- At most 3 items on anything, and a video counts as all three.
create function public.check_media_limit() returns trigger
language plpgsql set search_path = '' as $$
declare
  items integer;
  videos integer;
begin
  select count(*), count(*) filter (where kind = 'video') into items, videos
    from public.request_media
   where job_id is not distinct from new.job_id
     and quote_request_id is not distinct from new.quote_request_id
     and problem_report_id is not distinct from new.problem_report_id;
  if items >= 3 or videos > 0 or (new.kind = 'video' and items > 0) then
    raise exception 'add up to 3 photos or one short video';
  end if;
  return new;
end;
$$;

create trigger request_media_limit before insert on public.request_media
  for each row execute function public.check_media_limit();

-- Chat -----------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_job_idx on public.messages (job_id, created_at);

-- Phone numbers and emails are hidden so every booking stays in the app. Mirrors
-- maskContactDetails in mobile/src/domain/rules.ts.
create function public.mask_contact_details(p_body text) returns text
language sql immutable as $$
  select regexp_replace(
    regexp_replace(p_body, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email hidden]', 'g'),
    '(\+?\d[\s().-]*){10,}', '[number hidden] ', 'g'
  );
$$;

create function public.mask_message() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.body := rtrim(public.mask_contact_details(new.body));
  return new;
end;
$$;

create trigger messages_mask before insert or update of body on public.messages
  for each row execute function public.mask_message();

-- Reviews --------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs (id) on delete cascade,
  customer_id uuid not null default auth.uid() references public.profiles (id),
  pro_id uuid not null references public.pros (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  pro_reply text check (char_length(pro_reply) between 1 and 1000),
  pro_replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index reviews_pro_idx on public.reviews (pro_id, created_at desc);

-- Only the customer of a paid, confirmed job may review it, and only its pro.
create function public.can_review(p_job uuid, p_pro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs
     where id = p_job and customer_id = auth.uid() and pro_id = p_pro
       and status = 'completed' and paid_at is not null
  );
$$;

-- Called by the pro, once per review.
create function public.reply_to_review(p_review uuid, p_reply text) returns public.reviews
language plpgsql security definer set search_path = '' as $$
declare r public.reviews;
begin
  update public.reviews set pro_reply = p_reply, pro_replied_at = now()
   where id = p_review and pro_id = auth.uid() and pro_reply is null
  returning * into r;
  if not found then
    raise exception 'review not found or already replied to';
  end if;
  return r;
end;
$$;

-- What customers see about a pro: first name and initial, rating, finished jobs and
-- checked documents. Runs as its owner so it can count across all jobs, and shows
-- nothing private.
create view public.pro_public_profiles as
select
  p.id,
  trim(split_part(coalesce(pr.full_name, ''), ' ', 1) || ' ' ||
       left(nullif(split_part(coalesce(pr.full_name, ''), ' ', 2), ''), 1)) as display_name,
  p.trades,
  p.is_founding,
  (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.pro_id = p.id) as rating,
  (select count(*) from public.reviews r where r.pro_id = p.id) as review_count,
  (select count(*) from public.jobs j where j.pro_id = p.id and j.status = 'completed') as completed_jobs,
  array(
    select distinct c.type from public.credentials c
     where c.pro_id = p.id and c.verified_at is not null
       and (c.expires_on is null or c.expires_on >= current_date)
     order by c.type
  ) as verified_credentials
from public.pros p
join public.profiles pr on pr.id = p.id
where p.approved_at is not null;

-- Quote cap ------------------------------------------------------------------

create function public.max_quotes_per_request() returns integer
language sql immutable as $$ select 5 $$;

-- Same as before, plus: the request stops taking quotes once it has 5.
create or replace function public.can_quote(p_pro uuid, p_request uuid, p_trade public.trade) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.quote_requests r
    join public.pros p on p.id = p_pro
    where r.id = p_request
      and r.status = 'open'
      and r.expires_at > now()
      and (cardinality(r.trades) = 0 or p_trade = any (r.trades))
      and p.approved_at is not null
      and p_trade = any (p.trades)
      and public.pro_can_take(p_pro, 'custom-' || p_trade::text)
      and (select count(*) from public.quotes q where q.request_id = r.id) < public.max_quotes_per_request()
  );
$$;

-- The policy check above can race when two pros quote at once, so the insert also
-- locks the request and counts again.
create function public.check_quote_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.quote_requests where id = new.request_id for update;
  if (select count(*) from public.quotes where request_id = new.request_id) >= public.max_quotes_per_request() then
    raise exception 'this request already has enough quotes';
  end if;
  return new;
end;
$$;

create trigger quotes_limit before insert on public.quotes
  for each row execute function public.check_quote_limit();

-- Row level security --------------------------------------------------------

alter table public.no_shows enable row level security;
alter table public.customer_credits enable row level security;
alter table public.problem_reports enable row level security;
alter table public.request_media enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

create policy "admins read no-shows" on public.no_shows for select using (public.is_admin());
create policy "pros read own no-shows" on public.no_shows for select using (pro_id = auth.uid());

create policy "customers read own credits" on public.customer_credits for select using (customer_id = auth.uid());
create policy "admins manage credits" on public.customer_credits for all using (public.is_admin()) with check (public.is_admin());

create policy "customers report problems" on public.problem_reports
  for insert with check (customer_id = auth.uid() and status = 'open' and public.can_report_problem(job_id));
create policy "job parties read problem reports" on public.problem_reports
  for select using (customer_id = auth.uid() or public.is_job_party(job_id) or public.is_admin());
create policy "admins resolve problem reports" on public.problem_reports
  for update using (public.is_admin()) with check (public.is_admin());

create policy "customers add media to their own requests" on public.request_media
  for insert with check (
    uploaded_by = auth.uid() and (
      (job_id is not null and exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid()))
      or (quote_request_id is not null and public.owns_request(quote_request_id))
      or (problem_report_id is not null and exists (
            select 1 from public.problem_reports r where r.id = problem_report_id and r.customer_id = auth.uid()))
    )
  );
create policy "people on the job see its media" on public.request_media
  for select using (
    uploaded_by = auth.uid()
    or (job_id is not null and exists (select 1 from public.jobs j where j.id = job_id))
    or (quote_request_id is not null and exists (select 1 from public.quote_requests q where q.id = quote_request_id))
    or public.is_admin()
  );

create policy "job parties chat" on public.messages
  for insert with check (sender_id = auth.uid() and public.is_job_party(job_id));
create policy "job parties read chat" on public.messages
  for select using (public.is_job_party(job_id) or public.is_admin());

create policy "customers review finished paid jobs" on public.reviews
  for insert with check (customer_id = auth.uid() and pro_reply is null and public.can_review(job_id, pro_id));
create policy "anyone signed in reads reviews" on public.reviews
  for select to authenticated using (true);

-- Writes outside these policies go through the functions above.
revoke update, delete on public.messages, public.reviews, public.request_media from anon, authenticated;
revoke insert on public.problem_reports from anon, authenticated;
grant insert (id, job_id, customer_id, kind, description) on public.problem_reports to authenticated;
revoke insert on public.reviews from anon, authenticated;
grant insert (id, job_id, customer_id, pro_id, rating, body) on public.reviews to authenticated;
revoke insert, update, delete on public.no_shows, public.customer_credits from anon, authenticated;
-- Customers and pros update jobs only through the lifecycle functions.
revoke update on public.jobs from anon, authenticated;
revoke all on public.pro_public_profiles from anon;
grant select on public.pro_public_profiles to authenticated;

revoke execute on function public.reassign_late_jobs() from public, anon, authenticated;
revoke execute on function public.auto_confirm_jobs() from public, anon, authenticated;
revoke execute on function public.pro_arrived(uuid) from public, anon;
revoke execute on function public.pro_finished(uuid) from public, anon;
revoke execute on function public.confirm_job(uuid) from public, anon;
revoke execute on function public.reply_to_review(uuid, text) from public, anon;
revoke execute on function public.can_report_problem(uuid) from public, anon;
revoke execute on function public.is_job_party(uuid) from public, anon;
revoke execute on function public.can_review(uuid, uuid) from public, anon;

-- Chat arrives live.
alter publication supabase_realtime add table public.messages;

-- Storage bucket for request photos and videos, private. Skipped where Supabase
-- Storage isn't installed (the plain Postgres used by the SQL tests).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('request-media', 'request-media', false, 52428800,
            array['image/jpeg', 'image/png', 'image/heic', 'video/mp4', 'video/quicktime'])
    on conflict (id) do nothing;
    execute $p$
      create policy "users upload request media to their own folder" on storage.objects
        for insert to authenticated
        with check (bucket_id = 'request-media' and (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
    execute $p$
      create policy "people who can see the media row read the file" on storage.objects
        for select to authenticated
        using (bucket_id = 'request-media' and exists (
          select 1 from public.request_media m where m.storage_path = name))
    $p$;
  end if;
end $$;
