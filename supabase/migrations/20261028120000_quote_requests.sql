-- Relay: "Something else? Get quotes".
-- A customer describes a job that isn't in the catalogue. Every approved pro in a
-- matching trade can see it and send one quote. The customer accepts one quote,
-- which turns it into an ordinary booked job at the quoted price.

create type public.quote_timing as enum ('asap', 'this_week', 'flexible');
create type public.quote_request_status as enum ('open', 'accepted', 'cancelled', 'expired');
create type public.quote_status as enum ('pending', 'accepted', 'declined');

-- Quoted work still needs the trade's baseline qualification: Gas Safe for any
-- heating work, a competent person scheme for electrical, an NVQ for plumbing.
insert into public.job_types (id, trade, label, requires, urgent_allowed, fixed_price_pence) values
  ('custom-plumbing', 'plumbing', 'Quoted plumbing job', '{plumbing_nvq,public_liability}', false, null),
  ('custom-electrical', 'electrical', 'Quoted electrical job', '{competent_person_scheme,public_liability}', false, null),
  ('custom-heating', 'heating', 'Quoted heating or gas job', '{gas_safe,public_liability}', false, null);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles (id),
  trades public.trade[] not null default '{}', -- empty = not sure, open to every trade
  postcode text not null,
  location extensions.geography(point, 4326),
  description text not null check (char_length(description) between 10 and 2000),
  timing public.quote_timing not null default 'flexible',
  status public.quote_request_status not null default 'open',
  expires_at timestamptz not null default now() + interval '7 days',
  job_id uuid references public.jobs (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accepted_requests_have_a_job check ((status = 'accepted') = (job_id is not null))
);

create index quote_requests_open_idx on public.quote_requests (created_at desc) where status = 'open';
create index quote_requests_customer_idx on public.quote_requests (customer_id, created_at desc);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests (id) on delete cascade,
  pro_id uuid not null default auth.uid() references public.pros (id) on delete cascade,
  trade public.trade not null, -- which of the pro's trades the work falls under
  price_pence integer not null check (price_pence > 0),
  note text not null default '' check (char_length(note) <= 1000),
  earliest_at timestamptz, -- when the pro could start
  status public.quote_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (request_id, pro_id)
);

create trigger quote_requests_updated_at before update on public.quote_requests
  for each row execute function public.set_updated_at();

-- True when the pro may quote on the request under this trade: approved, does the
-- trade, the request is open and wants that trade, and the trade's documents are valid.
create function public.can_quote(p_pro uuid, p_request uuid, p_trade public.trade) returns boolean
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
  );
$$;

-- True when the signed-in pro should see the request on their jobs list.
create function public.pro_sees_request(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.pros p, unnest(p.trades) as t
    where p.id = auth.uid() and public.can_quote(p.id, p_request, t)
  )
  or exists (select 1 from public.quotes q where q.request_id = p_request and q.pro_id = auth.uid());
$$;

create function public.owns_request(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quote_requests where id = p_request and customer_id = auth.uid());
$$;

-- Called by the customer. Books the quoted pro and closes the request, atomically.
create function public.accept_quote(p_quote uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  q public.quotes;
  r public.quote_requests;
  j public.jobs;
begin
  select * into q from public.quotes where id = p_quote for update;
  if not found then
    raise exception 'quote not found';
  end if;
  select * into r from public.quote_requests where id = q.request_id for update;
  if r.customer_id is distinct from auth.uid() then
    raise exception 'quote not found';
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
                           description, scheduled_for, pro_id, final_price_pence)
  values (r.customer_id, q.trade, 'custom-' || q.trade::text, 'booked', 'accepted', r.postcode, r.location,
          r.description, q.earliest_at, q.pro_id, q.price_pence)
  returning * into j;

  update public.quotes set status = 'accepted' where id = q.id;
  update public.quotes set status = 'declined' where request_id = r.id and id <> q.id and status = 'pending';
  update public.quote_requests set status = 'accepted', job_id = j.id where id = r.id;
  return j;
end;
$$;

-- Called by the customer to withdraw an open request.
create function public.cancel_quote_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.quote_requests set status = 'cancelled'
   where id = p_request and customer_id = auth.uid() and status = 'open';
  if not found then
    raise exception 'request not found or no longer open';
  end if;
  update public.quotes set status = 'declined' where request_id = p_request and status = 'pending';
end;
$$;

-- Row level security --------------------------------------------------------

alter table public.quote_requests enable row level security;
alter table public.quotes enable row level security;

create policy "customers post quote requests" on public.quote_requests
  for insert with check (customer_id = auth.uid() and status = 'open' and job_id is null);
create policy "customers read own quote requests" on public.quote_requests
  for select using (customer_id = auth.uid());
create policy "pros read requests they can quote" on public.quote_requests
  for select using (public.pro_sees_request(id));
create policy "admins read all quote requests" on public.quote_requests
  for select using (public.is_admin());

create policy "pros send quotes" on public.quotes
  for insert with check (pro_id = auth.uid() and status = 'pending' and public.can_quote(auth.uid(), request_id, trade));
create policy "pros read own quotes" on public.quotes
  for select using (pro_id = auth.uid());
create policy "customers read quotes on their requests" on public.quotes
  for select using (public.owns_request(request_id));
create policy "admins read all quotes" on public.quotes
  for select using (public.is_admin());

-- Customers may set only what they asked for; status and the job link change through the RPCs.
revoke insert on public.quote_requests from anon, authenticated;
grant insert (id, customer_id, trades, postcode, location, description, timing) on public.quote_requests to authenticated;
revoke insert on public.quotes from anon, authenticated;
grant insert (id, request_id, pro_id, trade, price_pence, note, earliest_at) on public.quotes to authenticated;
revoke update, delete on public.quote_requests, public.quotes from anon, authenticated;

revoke execute on function public.can_quote(uuid, uuid, public.trade) from public, anon;
revoke execute on function public.pro_sees_request(uuid) from public, anon;
revoke execute on function public.owns_request(uuid) from public, anon;
revoke execute on function public.accept_quote(uuid) from public, anon;
revoke execute on function public.cancel_quote_request(uuid) from public, anon;
grant execute on function public.accept_quote(uuid) to authenticated;
grant execute on function public.cancel_quote_request(uuid) to authenticated;

-- Quotes arrive live on the customer's screen.
alter publication supabase_realtime add table public.quotes;
