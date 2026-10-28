-- Pax Trades: initial schema.
-- Customers request jobs, vetted pros receive time-limited offers and accept them.
-- A pro can only be offered a job type when every credential it requires is verified and in date.

create extension if not exists postgis with schema extensions;

-- Enums ---------------------------------------------------------------------

create type public.app_role as enum ('customer', 'pro', 'admin');
create type public.trade as enum ('plumbing', 'electrical', 'heating');
create type public.credential_type as enum (
  'gas_safe',
  'competent_person_scheme', -- NICEIC, NAPIT or ELECSA (Part P self-certification)
  'plumbing_nvq',
  'unvented_g3',
  'public_liability'
);
create type public.job_urgency as enum ('urgent', 'booked');
create type public.job_status as enum (
  'requested', 'accepted', 'en_route', 'on_site', 'completed', 'cancelled'
);
create type public.offer_status as enum ('pending', 'accepted', 'declined', 'expired');

-- Helpers -------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tables --------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create table public.pros (
  id uuid primary key references public.profiles (id) on delete cascade,
  trades public.trade[] not null default '{}',
  business_name text,
  is_founding boolean not null default false,
  commission_rate numeric(4, 3) not null default 0.150
    check (commission_rate >= 0 and commission_rate < 1),
  approved_at timestamptz, -- set by an admin after vetting; null = cannot receive jobs
  is_online boolean not null default false,
  last_location extensions.geography(point, 4326),
  last_seen_at timestamptz,
  stripe_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pros_last_location_idx on public.pros using gist (last_location);

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros (id) on delete cascade,
  type public.credential_type not null,
  reference text, -- e.g. Gas Safe licence number, scheme membership number, policy number
  document_path text, -- storage path of the uploaded certificate
  expires_on date, -- null if it never expires (e.g. an NVQ)
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index credentials_pro_idx on public.credentials (pro_id, type);

create table public.job_types (
  id text primary key,
  trade public.trade not null,
  label text not null,
  requires public.credential_type[] not null,
  urgent_allowed boolean not null,
  fixed_price_pence integer check (fixed_price_pence > 0) -- null = callout rates apply
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles (id),
  trade public.trade not null,
  job_type_id text not null references public.job_types (id),
  urgency public.job_urgency not null,
  status public.job_status not null default 'requested',
  postcode text not null,
  location extensions.geography(point, 4326),
  description text not null default '',
  scheduled_for timestamptz,
  pro_id uuid references public.pros (id),
  final_price_pence integer check (final_price_pence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assigned_jobs_have_a_pro check (
    status in ('requested', 'cancelled') or pro_id is not null
  )
);

create index jobs_customer_idx on public.jobs (customer_id, created_at desc);
create index jobs_pro_idx on public.jobs (pro_id, created_at desc);

create table public.job_offers (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  status public.offer_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '60 seconds',
  created_at timestamptz not null default now(),
  unique (job_id, pro_id)
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger pros_updated_at before update on public.pros
  for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- Every job must match its job type's trade, and urgent requests only where allowed.
create function public.check_job_type() returns trigger
language plpgsql set search_path = '' as $$
declare
  jt public.job_types;
begin
  select * into jt from public.job_types where id = new.job_type_id;
  if jt.trade <> new.trade then
    raise exception 'job type % is not a % job', new.job_type_id, new.trade;
  end if;
  if new.urgency = 'urgent' and not jt.urgent_allowed then
    raise exception 'job type % cannot be booked as urgent', new.job_type_id;
  end if;
  return new;
end;
$$;

create trigger jobs_check_job_type before insert or update of job_type_id, trade, urgency
  on public.jobs for each row execute function public.check_job_type();

-- Matching ------------------------------------------------------------------

-- True when the pro holds every credential the job type requires, verified and in date.
create function public.pro_can_take(p_pro uuid, p_job_type text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.job_types where id = p_job_type)
    and not exists (
      select 1
      from public.job_types jt, unnest(jt.requires) as needed
      where jt.id = p_job_type
        and not exists (
          select 1 from public.credentials c
          where c.pro_id = p_pro
            and c.type = needed
            and c.verified_at is not null
            and (c.expires_on is null or c.expires_on >= current_date)
        )
    );
$$;

-- Approved, online, qualified pros for a job, nearest first, within p_radius_m.
create function public.nearest_eligible_pros(
  p_job uuid,
  p_limit integer default 5,
  p_radius_m double precision default 8000
) returns table (pro_id uuid, distance_m double precision)
language sql stable security definer set search_path = '' as $$
  select p.id, extensions.st_distance(p.last_location, j.location)
  from public.jobs j
  join public.pros p
    on j.trade = any (p.trades)
   and p.approved_at is not null
   and p.is_online
   and p.last_location is not null
   and extensions.st_dwithin(p.last_location, j.location, p_radius_m)
  where j.id = p_job
    and public.pro_can_take(p.id, j.job_type_id)
    and not exists (
      select 1 from public.job_offers o where o.job_id = j.id and o.pro_id = p.id
    )
  order by extensions.st_distance(p.last_location, j.location)
  limit p_limit;
$$;

-- Called by the signed-in pro. Assigns the job if the offer is still live and the job is free.
create function public.accept_offer(p_offer uuid) returns public.jobs
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
  update public.jobs set status = 'accepted', pro_id = o.pro_id
    where id = o.job_id returning * into j;
  return j;
end;
$$;

-- Called by the signed-in pro to go on or offline and share location while online.
create function public.set_availability(p_online boolean, p_lng double precision, p_lat double precision)
returns void
language sql security definer set search_path = '' as $$
  update public.pros
     set is_online = p_online,
         last_location = case
           when p_online then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
           else null
         end,
         last_seen_at = now()
   where id = auth.uid();
$$;

-- Row level security --------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.pros enable row level security;
alter table public.credentials enable row level security;
alter table public.job_types enable row level security;
alter table public.jobs enable row level security;
alter table public.job_offers enable row level security;

create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Users may edit their name and phone, never their role.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy "read own pro record" on public.pros
  for select using (id = auth.uid() or public.is_admin());
create policy "admins manage pros" on public.pros
  for all using (public.is_admin()) with check (public.is_admin());

create policy "read own credentials" on public.credentials
  for select using (pro_id = auth.uid() or public.is_admin());
create policy "upload own unverified credentials" on public.credentials
  for insert with check (pro_id = auth.uid() and verified_at is null and verified_by is null);
create policy "admins verify credentials" on public.credentials
  for update using (public.is_admin()) with check (public.is_admin());

create policy "anyone signed in reads job types" on public.job_types
  for select to authenticated using (true);

create policy "customers read own jobs" on public.jobs
  for select using (customer_id = auth.uid());
create policy "pros read assigned or offered jobs" on public.jobs
  for select using (
    pro_id = auth.uid()
    or exists (select 1 from public.job_offers o where o.job_id = jobs.id and o.pro_id = auth.uid())
  );
create policy "admins read all jobs" on public.jobs
  for select using (public.is_admin());
create policy "customers request jobs" on public.jobs
  for insert with check (
    customer_id = auth.uid() and status = 'requested' and pro_id is null and final_price_pence is null
  );

create policy "pros read own offers" on public.job_offers
  for select using (pro_id = auth.uid() or public.is_admin());

-- Functions run as their owner; only signed-in users may call the pro actions.
revoke execute on function public.accept_offer(uuid) from public, anon;
revoke execute on function public.set_availability(boolean, double precision, double precision) from public, anon;
revoke execute on function public.nearest_eligible_pros(uuid, integer, double precision) from public, anon, authenticated;
revoke execute on function public.pro_can_take(uuid, text) from public, anon;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.set_availability(boolean, double precision, double precision) to authenticated;

-- Live job status for the customer's tracking screen.
alter publication supabase_realtime add table public.jobs;

-- Launch catalogue (mirrors mobile/src/domain/catalog.ts) ---------------------

insert into public.job_types (id, trade, label, requires, urgent_allowed, fixed_price_pence) values
  ('leak', 'plumbing', 'Leak or burst pipe', '{plumbing_nvq,public_liability}', true, null),
  ('blocked-toilet', 'plumbing', 'Blocked toilet or drain', '{plumbing_nvq,public_liability}', true, null),
  ('unvented-cylinder', 'plumbing', 'Unvented hot water cylinder', '{plumbing_nvq,unvented_g3,public_liability}', true, null),
  ('power-fault', 'electrical', 'Power cut or tripping fuse', '{competent_person_scheme,public_liability}', true, null),
  ('socket-replace', 'electrical', 'Replace a socket or switch', '{competent_person_scheme,public_liability}', false, 9500),
  ('eicr-small', 'electrical', 'EICR, flat up to 2 bedrooms', '{competent_person_scheme,public_liability}', false, 26000),
  ('no-heating', 'heating', 'No heating or hot water', '{gas_safe,public_liability}', true, null),
  ('boiler-service', 'heating', 'Boiler service', '{gas_safe,public_liability}', false, 11900),
  ('cp12', 'heating', 'Landlord gas safety certificate (CP12)', '{gas_safe,public_liability}', false, 9500),
  ('boiler-service-cp12', 'heating', 'Boiler service plus CP12', '{gas_safe,public_liability}', false, 14900);
