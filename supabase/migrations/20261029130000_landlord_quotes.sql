-- Relay for landlords: a tenant's "Get quotes" request goes to their landlord too.
--   * A tenant who has joined a property can ask for quotes for it. Pros quote as usual.
--   * The landlord or agent compares the quotes and accepts one. The tenant sees them
--     come in but can't accept. The job is booked for the tenant, already approved, and
--     the bill goes to the manager's card like any other property job.
--   * The manager can turn the request down instead, and the tenant is told.

alter table public.quote_requests add column property_id uuid references public.properties (id);

create index quote_requests_property_idx on public.quote_requests (property_id, created_at desc)
  where property_id is not null;

grant insert (property_id) on public.quote_requests to authenticated;

-- Only the property's tenant or its manager can ask for quotes for it.
create function public.check_quote_property() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.property_id is null then
    return new;
  end if;
  if not exists (
    select 1 from public.properties p
     where p.id = new.property_id and p.archived_at is null
       and (p.manager_id = new.customer_id
            or exists (select 1 from public.property_tenants t where t.property_id = p.id and t.tenant_id = new.customer_id))
  ) then
    raise exception 'property not found';
  end if;
  return new;
end;
$$;

create trigger quote_requests_check_property before insert on public.quote_requests
  for each row execute function public.check_quote_property();

-- True when the signed-in user manages the property a request is for.
create function public.manages_request(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quote_requests r join public.properties p on p.id = r.property_id
     where r.id = p_request and p.manager_id = auth.uid()
  );
$$;

create policy "managers read their properties' quote requests" on public.quote_requests
  for select using (public.manages_request(id));
create policy "managers read quotes for their properties" on public.quotes
  for select using (public.manages_request(request_id));

-- A job the manager creates for their property needs no approval: their own
-- bookings, and a quote they accepted for their tenant.
create or replace function public.check_job_property() returns trigger
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
  if p.manager_id = new.customer_id or p.manager_id = auth.uid() then
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

-- Same as before; the manager isn't told about a job they just made themselves.
create or replace function public.notify_property_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties;
  tenant text;
  label text := public.job_type_label(new.job_type_id);
begin
  select * into p from public.properties where id = new.property_id;
  if p.manager_id = new.customer_id or p.manager_id = auth.uid() then
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

-- Accepting: the customer accepts their own quotes, except on a property request,
-- where the manager accepts and needs a card saved to pay for it.
create or replace function public.accept_quote(p_quote uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  q public.quotes;
  r public.quote_requests;
  p public.properties;
  j public.jobs;
begin
  select * into q from public.quotes where id = p_quote for update;
  if not found then
    raise exception 'quote not found';
  end if;
  select * into r from public.quote_requests where id = q.request_id for update;
  if r.property_id is null then
    if r.customer_id is distinct from auth.uid() then
      raise exception 'quote not found';
    end if;
  else
    select * into p from public.properties where id = r.property_id;
    if p.manager_id is distinct from auth.uid() then
      if r.customer_id = auth.uid() then
        raise exception '% picks the quote for this request, and pays for it', public.manager_name(p.manager_id);
      end if;
      raise exception 'quote not found';
    end if;
    if not exists (select 1 from public.profiles where id = auth.uid() and stripe_payment_method_id is not null) then
      raise exception 'add a card first, so the pro can be paid when the job is done';
    end if;
  end if;
  if r.status <> 'open' or r.expires_at < now() then
    raise exception 'this request is no longer open';
  end if;
  if q.status <> 'pending' then
    raise exception 'quote is no longer available';
  end if;
  if not public.pro_can_take(q.pro_id, 'custom-' || q.trade::text) then
    raise exception 'this pro can no longer take the job';
  end if;

  insert into public.jobs (customer_id, trade, job_type_id, urgency, status, postcode, location,
                           description, scheduled_for, pro_id, final_price_pence, property_id)
  values (r.customer_id, q.trade, 'custom-' || q.trade::text, 'booked', 'accepted', r.postcode, r.location,
          r.description, q.earliest_at, q.pro_id, q.price_pence, r.property_id)
  returning * into j;

  update public.quotes set status = 'accepted' where id = q.id;
  update public.quotes set status = 'declined' where request_id = r.id and id <> q.id and status = 'pending';
  update public.quote_requests set status = 'accepted', job_id = j.id where id = r.id;

  if r.customer_id <> auth.uid() then
    perform public.notify(r.customer_id, 'Quote accepted: ' || left(r.description, 40),
      public.manager_name(auth.uid()) || ' accepted a quote of £' || to_char(q.price_pence / 100.0, 'FM999990.00')
        || '. Your pro will message you to arrange the day.',
      '/job/' || j.id);
  end if;
  return j;
end;
$$;

-- Withdrawing: the customer, or on a property request the manager, who is turning it down.
create or replace function public.cancel_quote_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.quote_requests;
begin
  select * into r from public.quote_requests
   where id = p_request and status = 'open' and (customer_id = auth.uid() or public.manages_request(id))
     for update;
  if not found then
    raise exception 'request not found or no longer open';
  end if;
  update public.quote_requests set status = 'cancelled' where id = r.id;
  update public.quotes set status = 'declined' where request_id = r.id and status = 'pending';
  if r.customer_id <> auth.uid() then
    perform public.notify(r.customer_id, 'Not going ahead: ' || left(r.description, 40),
      public.manager_name(auth.uid()) || ' decided not to go ahead with this one. Contact them for details.',
      '/my-jobs');
  end if;
end;
$$;

-- The manager hears when their tenant asks for quotes, and as each quote comes in.
-- The customer still hears about quotes on their own requests.
create function public.notify_property_quote_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties;
  tenant text;
begin
  select * into p from public.properties where id = new.property_id;
  if p.manager_id = new.customer_id then
    return null;
  end if;
  select coalesce(full_name, 'Your tenant') into tenant from public.profiles where id = new.customer_id;
  perform public.notify(p.manager_id, 'Quotes requested: ' || p.name,
    tenant || ' asked for quotes: "' || left(new.description, 80) || '". Vetted pros will quote, then you pick one.',
    '/quotes/' || new.id);
  return null;
end;
$$;

create trigger quote_requests_notify_property after insert on public.quote_requests
  for each row when (new.property_id is not null)
  execute function public.notify_property_quote_request();

create or replace function public.notify_quote() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.quote_requests;
  p public.properties;
  price text := '£' || to_char(new.price_pence / 100.0, 'FM999990.00');
begin
  select * into r from public.quote_requests where id = new.request_id;
  select * into p from public.properties where id = r.property_id;
  if p.id is null or p.manager_id = r.customer_id then
    perform public.notify(r.customer_id, 'New quote', price || ' all-in. Compare your quotes in the app.',
      '/quotes/' || new.request_id);
  else
    perform public.notify(p.manager_id, 'New quote: ' || p.name,
      price || ' all-in for "' || left(r.description, 60) || '". Compare the quotes and accept one.',
      '/quotes/' || new.request_id);
  end if;
  return null;
end;
$$;

-- What a request's screen needs to know: whose home it's for and who accepts.
create function public.quote_request_details(p_request uuid)
returns table (
  description text,
  status public.quote_request_status,
  job_id uuid,
  property_id uuid,
  property_name text,
  manager_name text,
  requester_name text,
  yours boolean,
  you_accept boolean
)
language sql stable security definer set search_path = '' as $$
  select r.description, r.status, r.job_id, p.id, p.name, public.manager_name(p.manager_id),
         coalesce(c.full_name, 'Your tenant'), r.customer_id = auth.uid(),
         coalesce(p.manager_id, r.customer_id) = auth.uid()
    from public.quote_requests r
    join public.profiles c on c.id = r.customer_id
    left join public.properties p on p.id = r.property_id
   where r.id = p_request and (r.customer_id = auth.uid() or p.manager_id = auth.uid());
$$;

-- Quote requests across the manager's properties, newest first.
create function public.manager_quote_requests(p_property uuid default null)
returns table (
  request_id uuid,
  property_id uuid,
  property_name text,
  tenant_name text,
  requested_by_manager boolean,
  description text,
  status public.quote_request_status,
  created_at timestamptz,
  quotes bigint,
  lowest_pence integer,
  job_id uuid
)
language sql stable security definer set search_path = '' as $$
  select r.id, p.id, p.name, coalesce(c.full_name, 'Tenant'), r.customer_id = p.manager_id,
         r.description, r.status, r.created_at,
         (select count(*) from public.quotes q where q.request_id = r.id),
         (select min(q.price_pence) from public.quotes q where q.request_id = r.id),
         r.job_id
    from public.quote_requests r
    join public.properties p on p.id = r.property_id
    join public.profiles c on c.id = r.customer_id
   where p.manager_id = auth.uid() and (p_property is null or p.id = p_property)
   order by r.created_at desc
   limit 200;
$$;

-- Who can call what -------------------------------------------------------------

revoke execute on function public.check_quote_property() from public, anon, authenticated;
revoke execute on function public.notify_property_quote_request() from public, anon, authenticated;
revoke execute on function public.manages_request(uuid) from public, anon;
revoke execute on function public.quote_request_details(uuid) from public, anon;
revoke execute on function public.manager_quote_requests(uuid) from public, anon;
grant execute on function public.quote_request_details(uuid) to authenticated;
grant execute on function public.manager_quote_requests(uuid) to authenticated;
