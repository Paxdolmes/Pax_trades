-- Relay for landlords and letting agents.
--   * A landlord or agent (the "manager") adds their properties. Each property has a
--     join code the manager gives the tenant.
--   * A tenant who has joined a property can send a request to their landlord. No pro
--     sees it until the manager approves it; then it goes out like any other job.
--     Emergencies can skip the wait (on by default for each property).
--   * The pro deals with the tenant directly, and the bill goes to the manager's card.
--   * The manager's dashboard: every property, its requests and what it has cost.

-- Accounts ------------------------------------------------------------------------

-- The name tenants see, e.g. "Fulham Lettings". Falls back to the person's name.
alter table public.profiles add column company_name text check (length(company_name) <= 80);
grant update (company_name) on public.profiles to authenticated;

create function public.manager_name(p_manager uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(btrim(company_name), ''), full_name, 'Your landlord') from public.profiles where id = p_manager;
$$;

-- Properties ----------------------------------------------------------------------

-- Six letters and numbers that are easy to read out: no 0/O or 1/I.
create function public.new_join_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  letters constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(letters, 1 + floor(random() * length(letters))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.properties where join_code = code);
  end loop;
  return code;
end;
$$;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120), -- e.g. "Flat 2, 14 Lettice Street"
  postcode text not null check (length(btrim(postcode)) between 5 and 8),
  join_code text not null unique default public.new_join_code(),
  auto_approve_urgent boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index properties_manager_idx on public.properties (manager_id, created_at);

create table public.property_tenants (
  property_id uuid not null references public.properties (id) on delete cascade,
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (property_id, tenant_id)
);

create index property_tenants_tenant_idx on public.property_tenants (tenant_id);

alter table public.properties enable row level security;
alter table public.property_tenants enable row level security;

create policy "managers read own properties" on public.properties
  for select using (manager_id = auth.uid() or public.is_admin());
create policy "managers add properties" on public.properties
  for insert with check (manager_id = auth.uid());
create policy "managers edit own properties" on public.properties
  for update using (manager_id = auth.uid()) with check (manager_id = auth.uid());
-- The join code and owner are set by the database; properties are archived, not deleted.
revoke insert, update, delete on public.properties from anon, authenticated;
grant insert (name, postcode, auto_approve_urgent) on public.properties to authenticated;
grant update (name, postcode, auto_approve_urgent, archived_at) on public.properties to authenticated;

create policy "tenants and their managers read tenancies" on public.property_tenants
  for select using (
    tenant_id = auth.uid()
    or exists (select 1 from public.properties p where p.id = property_id and p.manager_id = auth.uid())
  );
-- Joining and leaving go through join_property, leave_property and remove_tenant.
revoke insert, update, delete on public.property_tenants from anon, authenticated;

-- Jobs for a property -----------------------------------------------------------

alter table public.jobs
  add column property_id uuid references public.properties (id),
  add column approval text check (approval in ('pending', 'approved', 'declined')), -- null: not a property job
  add column approved_at timestamptz,
  add column decline_reason text check (length(decline_reason) <= 300);

create index jobs_property_idx on public.jobs (property_id, created_at desc) where property_id is not null;

grant insert (property_id) on public.jobs to authenticated;

-- Only the property's tenant or its manager can book for it. The manager's own
-- bookings need no approval; so do a tenant's emergencies when the property allows
-- it and the manager has a card saved.
create function public.check_job_property() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties;
begin
  new.approval := null;
  new.approved_at := null;
  if new.property_id is null then
    return new;
  end if;
  select * into p from public.properties where id = new.property_id and archived_at is null;
  if not found then
    raise exception 'property not found';
  end if;
  if p.manager_id = new.customer_id then
    new.approval := 'approved';
    new.approved_at := now();
  elsif exists (select 1 from public.property_tenants t where t.property_id = p.id and t.tenant_id = new.customer_id) then
    if new.urgency = 'urgent' and p.auto_approve_urgent
       and exists (select 1 from public.profiles m where m.id = p.manager_id and m.stripe_payment_method_id is not null) then
      new.approval := 'approved';
      new.approved_at := now();
    else
      new.approval := 'pending';
    end if;
  else
    raise exception 'property not found';
  end if;
  return new;
end;
$$;

create trigger jobs_check_property before insert on public.jobs
  for each row execute function public.check_job_property();

-- Same as before, but a request waiting for the landlord isn't offered to anyone.
create or replace function public.dispatch_job(p_job uuid, p_batch integer default 3) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  perform 1 from public.jobs
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
  insert into public.job_offers (job_id, pro_id)
  select p_job, e.pro_id from public.nearest_eligible_pros(p_job, p_batch) e
  on conflict (job_id, pro_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Retries count from the landlord's OK, not from when the tenant asked.
create or replace function public.dispatch_jobs() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  j record;
  n integer := 0;
begin
  for j in
    select id from public.jobs
     where status = 'requested' and coalesce(approved_at, created_at) > now() - interval '1 day'
  loop
    n := n + public.dispatch_job(j.id);
  end loop;
  return n;
end;
$$;

-- The manager hears about each new request: to approve it, or that an emergency went
-- straight out.
create function public.notify_property_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties;
  tenant text;
  label text := public.job_type_label(new.job_type_id);
begin
  select * into p from public.properties where id = new.property_id;
  if p.manager_id = new.customer_id then
    return null;
  end if;
  select coalesce(full_name, 'Your tenant') into tenant from public.profiles where id = new.customer_id;
  if new.approval = 'pending' then
    perform public.notify(p.manager_id, 'Approval needed: ' || label,
      tenant || ' at ' || p.name || ' needs a ' || lower(label) || '. Approve it and we''ll send a vetted pro.',
      '/properties');
  else
    perform public.notify(p.manager_id, 'Emergency sent: ' || label,
      tenant || ' at ' || p.name || ' reported an emergency, so we''re sending a pro straight away.',
      '/properties/' || p.id);
  end if;
  return null;
end;
$$;

create trigger jobs_notify_property after insert on public.jobs
  for each row when (new.property_id is not null)
  execute function public.notify_property_request();

-- Approving and declining ---------------------------------------------------------

create function public.approve_job(p_job uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
begin
  select x.* into j from public.jobs x
    join public.properties p on p.id = x.property_id
   where x.id = p_job and p.manager_id = auth.uid()
     for update of x;
  if not found then
    raise exception 'request not found';
  end if;
  if j.approval is distinct from 'pending' or j.status <> 'requested' then
    raise exception 'this request has already been answered';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and stripe_payment_method_id is not null) then
    raise exception 'add a card first, so the pro can be paid when the job is done';
  end if;
  if j.urgency = 'booked' and j.scheduled_for < now() then
    raise exception 'the time your tenant picked has passed. Decline this one and ask them to choose a new slot';
  end if;
  update public.jobs set approval = 'approved', approved_at = now() where id = j.id returning * into j;
  perform public.dispatch_job(j.id);
  perform public.notify(j.customer_id, 'Approved: ' || public.job_type_label(j.job_type_id),
    public.manager_name(auth.uid()) || ' said yes. We''re finding a pro for you now.', '/job/' || j.id);
  return j;
end;
$$;

create function public.decline_job(p_job uuid, p_reason text default null) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select x.* into j from public.jobs x
    join public.properties p on p.id = x.property_id
   where x.id = p_job and p.manager_id = auth.uid()
     for update of x;
  if not found then
    raise exception 'request not found';
  end if;
  if j.approval is distinct from 'pending' or j.status <> 'requested' then
    raise exception 'this request has already been answered';
  end if;
  update public.jobs
     set approval = 'declined', status = 'cancelled', decline_reason = left(reason, 300)
   where id = j.id
  returning * into j;
  perform public.notify(j.customer_id, 'Not approved: ' || public.job_type_label(j.job_type_id),
    coalesce(public.manager_name(auth.uid()) || ': ' || reason,
             public.manager_name(auth.uid()) || ' didn''t approve this request. Contact them for details.'),
    '/job/' || j.id);
  return j;
end;
$$;

-- Tenants -------------------------------------------------------------------------

-- One home at a time: joining a property leaves any other.
create function public.join_property(p_code text)
returns table (property_id uuid, name text, postcode text, manager_name text, auto_approve_urgent boolean)
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties;
  code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  tenant text;
begin
  if auth.uid() is null then
    raise exception 'please sign in';
  end if;
  select * into p from public.properties x where x.join_code = code and x.archived_at is null;
  if not found then
    raise exception 'that code doesn''t match a property. Check it with your landlord or agent';
  end if;
  if p.manager_id = auth.uid() then
    raise exception 'this is one of your own properties';
  end if;
  delete from public.property_tenants t where t.tenant_id = auth.uid() and t.property_id <> p.id;
  insert into public.property_tenants (property_id, tenant_id) values (p.id, auth.uid())
  on conflict do nothing;
  if found then
    select coalesce(full_name, 'A tenant') into tenant from public.profiles where id = auth.uid();
    perform public.notify(p.manager_id, 'New tenant: ' || p.name,
      tenant || ' joined ' || p.name || '. Their repair requests will come to you to approve.', '/properties/' || p.id);
  end if;
  return query select p.id, p.name, p.postcode, public.manager_name(p.manager_id), p.auto_approve_urgent;
end;
$$;

-- The tenant's home, if they've joined one.
create function public.my_property()
returns table (property_id uuid, name text, postcode text, manager_name text, auto_approve_urgent boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.postcode, public.manager_name(p.manager_id), p.auto_approve_urgent
    from public.property_tenants t
    join public.properties p on p.id = t.property_id and p.archived_at is null
   where t.tenant_id = auth.uid()
   order by t.joined_at desc
   limit 1;
$$;

create function public.leave_property() returns void
language sql security definer set search_path = '' as $$
  delete from public.property_tenants where tenant_id = auth.uid();
$$;

-- Managers ------------------------------------------------------------------------

-- Every property with its tenants, what's waiting and what it has cost. Spend is the
-- price of each finished job (tenants can't add tips on a landlord's bill).
create function public.manager_properties()
returns table (
  property_id uuid,
  name text,
  postcode text,
  join_code text,
  auto_approve_urgent boolean,
  tenants text[],
  pending bigint,
  open_jobs bigint,
  jobs bigint,
  spend_pence bigint,
  spend_year_pence bigint,
  last_job_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.postcode, p.join_code, p.auto_approve_urgent,
         coalesce((select array_agg(coalesce(pr.full_name, 'Tenant') order by t.joined_at)
                     from public.property_tenants t join public.profiles pr on pr.id = t.tenant_id
                    where t.property_id = p.id), '{}'),
         count(j.id) filter (where j.approval = 'pending' and j.status = 'requested'),
         count(j.id) filter (where j.status not in ('completed', 'cancelled') and j.approval = 'approved'),
         count(j.id) filter (where j.status <> 'cancelled'),
         coalesce(sum(j.final_price_pence) filter (where j.status = 'completed'), 0),
         coalesce(sum(j.final_price_pence) filter (where j.status = 'completed' and j.confirmed_at >= date_trunc('year', now())), 0),
         max(j.created_at),
         p.created_at
    from public.properties p
    left join public.jobs j on j.property_id = p.id
   where p.manager_id = auth.uid() and p.archived_at is null
   group by p.id
   order by p.created_at;
$$;

-- Request history across the manager's properties, newest first.
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
  decline_reason text
)
language sql stable security definer set search_path = '' as $$
  select j.id, p.id, p.name, coalesce(c.full_name, 'Tenant'), j.customer_id = p.manager_id,
         j.job_type_id, j.urgency, j.status, j.approval, j.description, j.created_at,
         j.scheduled_for, j.finished_at, j.confirmed_at, j.paid_at, j.final_price_pence,
         pp.display_name, j.decline_reason
    from public.jobs j
    join public.properties p on p.id = j.property_id
    join public.profiles c on c.id = j.customer_id
    left join public.pro_public_profiles pp on pp.id = j.pro_id
   where p.manager_id = auth.uid() and (p_property is null or p.id = p_property)
   order by j.created_at desc
   limit 500;
$$;

create function public.manager_tenants(p_property uuid)
returns table (tenant_id uuid, name text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.tenant_id, coalesce(pr.full_name, 'Tenant'), t.joined_at
    from public.property_tenants t
    join public.properties p on p.id = t.property_id
    join public.profiles pr on pr.id = t.tenant_id
   where t.property_id = p_property and p.manager_id = auth.uid()
   order by t.joined_at;
$$;

create function public.remove_tenant(p_property uuid, p_tenant uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.property_tenants t
   using public.properties p
   where p.id = t.property_id and p.manager_id = auth.uid()
     and t.property_id = p_property and t.tenant_id = p_tenant;
end;
$$;

-- Customers' own jobs, now saying when one waits for the landlord -----------------

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
  decline_reason text
)
language sql stable security definer set search_path = '' as $$
  select j.id, j.job_type_id, j.urgency, j.status, j.postcode, j.description, j.created_at,
         j.scheduled_for, j.arrive_by, j.arrived_at, j.finished_at, j.confirmed_at, j.paid_at,
         j.final_price_pence, j.tip_pence, j.pro_id, pp.display_name, pp.rating, pp.review_count,
         pp.completed_jobs, pp.verified_credentials,
         j.property_id, p.name, j.approval, public.manager_name(p.manager_id), j.decline_reason
    from public.jobs j
    left join public.pro_public_profiles pp on pp.id = j.pro_id
    left join public.properties p on p.id = j.property_id
   where j.customer_id = auth.uid() and (p_job is null or j.id = p_job)
   order by j.created_at desc
   limit 200;
$$;

-- Charging: a property job goes on the manager's card -------------------------------
-- Same as before, except the card is the payer's: the property's manager for a
-- property job, otherwise the customer. Customer credit only comes off the
-- customer's own bills.

create or replace function public.jobs_to_charge(p_job uuid default null)
returns table (
  job_id uuid,
  amount_pence integer,
  fee_pence integer,
  credit_pence integer,
  customer_id text,
  payment_method_id text,
  destination text
)
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  fee integer;
  credit integer;
begin
  for r in
    select j.id, j.customer_id as cust, j.final_price_pence as price, j.tip_pence as tip,
           j.credit_pence as held, p.commission_rate as rate, j.property_id as property,
           c.stripe_customer_id as stripe_customer, c.stripe_payment_method_id as card,
           p.stripe_account_id as account
      from public.jobs j
      join public.pros p on p.id = j.pro_id
      left join public.properties pr on pr.id = j.property_id
      join public.profiles c on c.id = coalesce(pr.manager_id, j.customer_id)
     where j.status = 'completed' and j.paid_at is null and j.payment_intent_id is null
       and j.payment_failed_at is null and j.final_price_pence is not null
       and (p_job is null or j.id = p_job)
     order by j.confirmed_at
       for update of j skip locked
  loop
    fee := round(r.price * r.rate)::integer; -- commission on the work, never the tip
    credit := r.held;
    if credit = 0 and r.property is null then
      perform 1 from public.profiles x where x.id = r.cust for update; -- one job takes the credit at a time
      credit := least(public.available_credit_pence(r.cust), fee);
      if credit > 0 then
        update public.jobs x set credit_pence = credit where x.id = r.id;
      end if;
    end if;
    job_id := r.id;
    amount_pence := r.price + r.tip - credit;
    fee_pence := fee - credit;
    credit_pence := credit;
    customer_id := r.stripe_customer;
    payment_method_id := r.card;
    destination := r.account;
    return next;
  end loop;
end;
$$;

-- Who can call what -------------------------------------------------------------

revoke execute on function public.manager_name(uuid) from public, anon, authenticated;
-- new_join_code stays callable: it's the default for a new property's code.
revoke execute on function public.new_join_code() from public, anon;
revoke execute on function public.check_job_property() from public, anon, authenticated;
revoke execute on function public.notify_property_request() from public, anon, authenticated;
revoke execute on function public.dispatch_job(uuid, integer) from public, anon, authenticated;
revoke execute on function public.dispatch_jobs() from public, anon, authenticated;
revoke execute on function public.jobs_to_charge(uuid) from public, anon, authenticated;

revoke execute on function public.approve_job(uuid) from public, anon;
revoke execute on function public.decline_job(uuid, text) from public, anon;
revoke execute on function public.join_property(text) from public, anon;
revoke execute on function public.my_property() from public, anon;
revoke execute on function public.leave_property() from public, anon;
revoke execute on function public.manager_properties() from public, anon;
revoke execute on function public.manager_jobs(uuid) from public, anon;
revoke execute on function public.manager_tenants(uuid) from public, anon;
revoke execute on function public.remove_tenant(uuid, uuid) from public, anon;
revoke execute on function public.customer_jobs(uuid) from public, anon;
grant execute on function public.approve_job(uuid) to authenticated;
grant execute on function public.decline_job(uuid, text) to authenticated;
grant execute on function public.join_property(text) to authenticated;
grant execute on function public.my_property() to authenticated;
grant execute on function public.leave_property() to authenticated;
grant execute on function public.manager_properties() to authenticated;
grant execute on function public.manager_jobs(uuid) to authenticated;
grant execute on function public.manager_tenants(uuid) to authenticated;
grant execute on function public.remove_tenant(uuid, uuid) to authenticated;
grant execute on function public.customer_jobs(uuid) to authenticated;
