-- Relay: live screens, push notifications and the admin screen.
--   * Read functions for the apps' lists: a pro's open offers and jobs, a
--     customer's jobs with their pro's public details.
--   * Notifications: stored for each user and pushed to their phones through Expo.
--     Pros hear about new offers, both sides hear about chat messages, customers
--     follow their job, pros hear when they're approved or paid.
--   * Admin functions: check pros' documents, approve them, resolve problem reports.

-- Shared ----------------------------------------------------------------------

-- First name and last initial, e.g. "Sophie T.", for showing one side to the other.
create function public.short_name(p_full_name text) returns text
language sql immutable set search_path = '' as $$
  select nullif(trim(
    split_part(trim(coalesce(p_full_name, '')), ' ', 1) || ' ' ||
    coalesce(left(nullif(split_part(trim(coalesce(p_full_name, '')), ' ', 2), ''), 1) || '.', '')
  ), '');
$$;

create function public.job_type_label(p_job_type text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select label from public.job_types where id = p_job_type), 'Job');
$$;

-- Live screens ----------------------------------------------------------------

-- The signed-in pro's offers still open to accept, newest first. Only the postcode
-- district is shown until they accept.
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
  expires_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select o.id, j.id, j.job_type_id, j.urgency,
         split_part(upper(trim(j.postcode)), ' ', 1),
         j.description, public.short_name(c.full_name),
         extensions.st_distance(p.last_location, j.location),
         j.scheduled_for, o.expires_at
    from public.job_offers o
    join public.jobs j on j.id = o.job_id
    join public.pros p on p.id = o.pro_id
    left join public.profiles c on c.id = j.customer_id
   where o.pro_id = auth.uid() and o.status = 'pending' and o.expires_at > now()
     and j.status = 'requested'
   order by o.created_at desc;
$$;

-- The signed-in pro's jobs, or one of them, with what they take home.
create function public.pro_jobs(p_job uuid default null)
returns table (
  job_id uuid,
  job_type_id text,
  urgency public.job_urgency,
  status public.job_status,
  postcode text,
  description text,
  customer_name text,
  scheduled_for timestamptz,
  accepted_at timestamptz,
  arrive_by timestamptz,
  arrived_at timestamptz,
  finished_at timestamptz,
  confirmed_at timestamptz,
  paid_at timestamptz,
  final_price_pence integer,
  tip_pence integer,
  payout_pence integer
)
language sql stable security definer set search_path = '' as $$
  select j.id, j.job_type_id, j.urgency, j.status, j.postcode, j.description,
         public.short_name(c.full_name), j.scheduled_for, j.accepted_at, j.arrive_by,
         j.arrived_at, j.finished_at, j.confirmed_at, j.paid_at, j.final_price_pence, j.tip_pence,
         case when j.final_price_pence is not null
              then j.final_price_pence - round(j.final_price_pence * p.commission_rate)::integer + j.tip_pence
         end
    from public.jobs j
    join public.pros p on p.id = j.pro_id
    left join public.profiles c on c.id = j.customer_id
   where j.pro_id = auth.uid() and (p_job is null or j.id = p_job)
   order by j.created_at desc
   limit 200;
$$;

-- The signed-in customer's jobs, or one of them, with their pro's public details.
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
  pro_credentials public.credential_type[]
)
language sql stable security definer set search_path = '' as $$
  select j.id, j.job_type_id, j.urgency, j.status, j.postcode, j.description, j.created_at,
         j.scheduled_for, j.arrive_by, j.arrived_at, j.finished_at, j.confirmed_at, j.paid_at,
         j.final_price_pence, j.tip_pence, j.pro_id, pp.display_name, pp.rating, pp.review_count,
         pp.completed_jobs, pp.verified_credentials
    from public.jobs j
    left join public.pro_public_profiles pp on pp.id = j.pro_id
   where j.customer_id = auth.uid() and (p_job is null or j.id = p_job)
   order by j.created_at desc
   limit 200;
$$;

-- Offers appear on the pro's screen as they're made.
alter publication supabase_realtime add table public.job_offers;

-- Notifications -----------------------------------------------------------------

create table public.push_tokens (
  token text primary key, -- ExponentPushToken[...]
  user_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  url text, -- the app screen to open, e.g. /offer/<id>
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

create policy "read own notifications" on public.notifications
  for select using (user_id = auth.uid());
revoke insert, update, delete on public.notifications, public.push_tokens from anon, authenticated;
revoke select on public.push_tokens from anon, authenticated;

-- Called by the app after sign-in with this phone's Expo push token. A phone that
-- changes hands moves its token to the new account.
create function public.save_push_token(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'please sign in';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    raise exception 'not an Expo push token';
  end if;
  insert into public.push_tokens (token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end;
$$;

-- Called on sign-out, so the phone stops getting that account's notifications.
create function public.forget_push_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

create function public.mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

-- Stores a notification and pushes it to each of the user's phones through Expo's
-- push service. The push is sent by pg_net after the transaction commits; where
-- pg_net isn't installed (the SQL tests) it's only stored.
create function public.notify(p_user uuid, p_title text, p_body text, p_url text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  messages jsonb;
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, title, body, url) values (p_user, p_title, p_body, p_url);
  select jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', p_title, 'body', p_body, 'sound', 'default',
           'priority', 'high', 'data', jsonb_build_object('url', p_url)))
    into messages
    from public.push_tokens t where t.user_id = p_user;
  if messages is null or not exists (select 1 from pg_namespace where nspname = 'net') then
    return;
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using 'https://exp.host/--/api/v2/push/send', messages,
          '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb;
end;
$$;

create function public.notify_admins(p_title text, p_body text, p_url text default null) returns void
language sql security definer set search_path = '' as $$
  select public.notify(id, p_title, p_body, p_url) from public.profiles where role = 'admin';
$$;

-- A new offer: the pro has 60 seconds, so this is the one that matters most.
create function public.notify_offer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = new.job_id;
  perform public.notify(
    new.pro_id,
    case when j.urgency = 'urgent' then 'Urgent job nearby' else 'New job nearby' end,
    public.job_type_label(j.job_type_id) || ' in ' || split_part(upper(trim(j.postcode)), ' ', 1) || '. Tap to see it.',
    '/offer/' || new.id
  );
  return null;
end;
$$;

create trigger job_offers_notify after insert on public.job_offers
  for each row execute function public.notify_offer();

-- A chat message goes to whoever didn't send it.
create function public.notify_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  sender text;
begin
  select * into j from public.jobs where id = new.job_id;
  select coalesce(public.short_name(full_name), 'Relay') into sender from public.profiles where id = new.sender_id;
  if new.sender_id = j.customer_id then
    perform public.notify(j.pro_id, sender, left(new.body, 140), '/pro-chat/' || j.id);
  else
    perform public.notify(j.customer_id, sender, left(new.body, 140), '/chat/' || j.id);
  end if;
  return null;
end;
$$;

create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_message();

-- The customer follows their job; the pro hears when they're paid.
create function public.notify_job_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  pro text;
  label text := public.job_type_label(new.job_type_id);
  url text := '/job/' || new.id;
begin
  select coalesce(public.short_name(full_name), 'Your pro') into pro from public.profiles where id = new.pro_id;
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.notify(new.customer_id, pro || ' accepted your job',
      case when new.urgency = 'urgent' then 'They''re on the way. Track them in the app.'
           else 'They''ll be there for your booked slot.' end, url);
  elsif new.status = 'on_site' and old.status is distinct from 'on_site' then
    perform public.notify(new.customer_id, pro || ' has arrived', label, url);
  elsif new.status = 'requested' and old.status in ('accepted', 'en_route') then
    perform public.notify(new.customer_id, 'Finding you another pro',
      'Your pro didn''t arrive in time, so we''re sending the next nearest, and you''ve got '
      || '£' || to_char(public.no_show_credit_pence() / 100.0, 'FM999990.00') || ' off.', url);
  end if;
  if new.finished_at is not null and old.finished_at is null then
    perform public.notify(new.customer_id, pro || ' says the job is done',
      'Check the work and confirm, or report a problem.', url);
  end if;
  if new.paid_at is not null and old.paid_at is null then
    perform public.notify(new.pro_id, 'You''ve been paid',
      label || ': the money is on its way to your bank.', '/earnings');
  end if;
  return null;
end;
$$;

create trigger jobs_notify after update on public.jobs
  for each row execute function public.notify_job_change();

create function public.notify_quote() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  customer uuid;
begin
  select customer_id into customer from public.quote_requests where id = new.request_id;
  perform public.notify(customer, 'New quote',
    '£' || to_char(new.price_pence / 100.0, 'FM999990.00') || ' all-in. Compare your quotes in the app.',
    '/quotes/' || new.request_id);
  return null;
end;
$$;

create trigger quotes_notify after insert on public.quotes
  for each row execute function public.notify_quote();

create function public.notify_pro_application() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins('New pro application',
      coalesce((select full_name from public.profiles where id = new.id), 'A tradesperson') || ' has applied.', '/admin');
  elsif new.approved_at is not null and old.approved_at is null then
    perform public.notify(new.id, 'You''re approved',
      'Welcome to Relay Traders. Go online to start getting jobs.', '/dashboard');
  end if;
  return null;
end;
$$;

create trigger pros_notify after insert or update of approved_at on public.pros
  for each row execute function public.notify_pro_application();

create function public.notify_problem_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins('New problem report', left(new.description, 140), '/admin');
  elsif new.status is distinct from old.status then
    perform public.notify(new.customer_id, 'Update on your problem report',
      coalesce(new.resolution_note, 'The Relay team has updated your report.'), '/job/' || new.job_id);
  end if;
  return null;
end;
$$;

create trigger problem_reports_notify after insert or update of status on public.problem_reports
  for each row execute function public.notify_problem_report();

-- Pros' documents ---------------------------------------------------------------
-- Pros add documents themselves (see "upload own unverified credentials"); the file
-- goes in a private bucket only they and admins can read.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('credential-docs', 'credential-docs', false, 10485760,
            array['image/jpeg', 'image/png', 'image/heic', 'application/pdf'])
    on conflict (id) do nothing;
    execute $p$
      create policy "pros upload documents to their own folder" on storage.objects
        for insert to authenticated
        with check (bucket_id = 'credential-docs' and (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
    execute $p$
      create policy "pros and admins read documents" on storage.objects
        for select to authenticated
        using (bucket_id = 'credential-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
    $p$;
  end if;
end $$;

-- Admin -------------------------------------------------------------------------
-- An admin is a profile with role 'admin', set by hand in the SQL editor (see
-- docs/going-live.md). Every function here refuses anyone else.

create function public.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- The credential each trade needs, besides public liability insurance.
create function public.trade_credential(p_trade public.trade) returns public.credential_type
language sql immutable set search_path = '' as $$
  select case p_trade
    when 'plumbing' then 'plumbing_nvq'
    when 'electrical' then 'competent_person_scheme'
    when 'heating' then 'gas_safe'
  end::public.credential_type;
$$;

-- Pros waiting for approval, and approved pros with a new document to check.
create function public.admin_pros_to_review()
returns table (
  pro_id uuid,
  full_name text,
  email text,
  trades public.trade[],
  applied_at timestamptz,
  approved_at timestamptz,
  credentials jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select p.id, pr.full_name, u.email::text, p.trades, p.created_at, p.approved_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', c.id, 'type', c.type, 'reference', c.reference, 'expires_on', c.expires_on,
                    'document_path', c.document_path, 'verified', c.verified_at is not null)
                  order by c.created_at)
             from public.credentials c where c.pro_id = p.id
         ), '[]'::jsonb)
    from public.pros p
    join public.profiles pr on pr.id = p.id
    left join auth.users u on u.id = p.id
   where p.approved_at is null
      or exists (select 1 from public.credentials c where c.pro_id = p.id and c.verified_at is null)
   order by p.approved_at nulls first, p.created_at;
end;
$$;

-- Accepts a document after checking it (e.g. the Gas Safe number on the public
-- register), or rejects it, which removes it and asks the pro for another.
create function public.admin_check_credential(p_credential uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.credentials;
begin
  perform public.require_admin();
  if p_accept then
    update public.credentials set verified_at = now(), verified_by = auth.uid()
     where id = p_credential and verified_at is null returning * into c;
  else
    delete from public.credentials where id = p_credential and verified_at is null returning * into c;
    if found then
      perform public.notify(c.pro_id, 'Please upload that document again',
        'We couldn''t accept one of your documents. Open Documents to add a clearer copy.', '/documents');
    end if;
  end if;
  if c.id is null then
    raise exception 'document not found or already checked';
  end if;
end;
$$;

-- Approves a pro once each of their trades has its verified, unexpired credential
-- and their insurance is verified. Founding pros pay the lower commission.
create function public.admin_approve_pro(p_pro uuid, p_founding boolean default true) returns public.pros
language plpgsql security definer set search_path = '' as $$
declare
  p public.pros;
  missing text;
begin
  perform public.require_admin();
  select * into p from public.pros where id = p_pro for update;
  if not found then
    raise exception 'pro not found';
  end if;
  if p.approved_at is not null then
    raise exception 'already approved';
  end if;
  select string_agg(distinct needed::text, ', ') into missing
    from unnest(array_append(array(select public.trade_credential(t) from unnest(p.trades) t),
                             'public_liability'::public.credential_type)) needed
   where not exists (
     select 1 from public.credentials c
      where c.pro_id = p_pro and c.type = needed and c.verified_at is not null
        and (c.expires_on is null or c.expires_on >= current_date));
  if missing is not null then
    raise exception 'still needs a verified %', missing;
  end if;
  update public.pros
     set approved_at = now(), is_founding = p_founding, commission_rate = case when p_founding then 0.10 else 0.15 end
   where id = p_pro returning * into p;
  return p;
end;
$$;

-- Open problem reports, oldest first.
create function public.admin_open_reports()
returns table (
  report_id uuid,
  job_id uuid,
  kind public.problem_kind,
  status public.problem_status,
  description text,
  created_at timestamptz,
  job_label text,
  postcode text,
  customer_name text,
  pro_name text,
  paid_pence integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select r.id, r.job_id, r.kind, r.status, r.description, r.created_at,
         public.job_type_label(j.job_type_id), j.postcode, c.full_name, pr.full_name,
         case when j.paid_at is not null then j.final_price_pence + j.tip_pence end
    from public.problem_reports r
    join public.jobs j on j.id = r.job_id
    left join public.profiles c on c.id = r.customer_id
    left join public.profiles pr on pr.id = j.pro_id
   where r.status in ('open', 'pro_returning')
   order by r.created_at;
end;
$$;

-- Records what was done about a report, optionally with credit for the customer's
-- next job. Refunds themselves are made in the Stripe dashboard.
create function public.admin_resolve_report(
  p_report uuid,
  p_status public.problem_status,
  p_note text,
  p_credit_pence integer default 0
) returns public.problem_reports
language plpgsql security definer set search_path = '' as $$
declare r public.problem_reports;
begin
  perform public.require_admin();
  if p_status = 'open' then
    raise exception 'choose what was done';
  end if;
  if coalesce(p_credit_pence, 0) not between 0 and 50000 then
    raise exception 'credit must be between £0 and £500';
  end if;
  update public.problem_reports
     set status = p_status,
         resolution_note = nullif(trim(coalesce(p_note, '')), ''),
         resolved_at = case when p_status = 'pro_returning' then null else now() end
   where id = p_report returning * into r;
  if not found then
    raise exception 'report not found';
  end if;
  if p_credit_pence > 0 then
    insert into public.customer_credits (customer_id, pence, reason, job_id)
    values (r.customer_id, p_credit_pence, 'Relay Guarantee', r.job_id);
  end if;
  return r;
end;
$$;

-- Permissions -------------------------------------------------------------------

revoke execute on function public.notify(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;
revoke execute on function public.job_type_label(text) from public, anon;
revoke execute on function public.my_offers() from public, anon;
revoke execute on function public.pro_jobs(uuid) from public, anon;
revoke execute on function public.customer_jobs(uuid) from public, anon;
revoke execute on function public.save_push_token(text) from public, anon;
revoke execute on function public.forget_push_token(text) from public, anon;
revoke execute on function public.mark_notifications_read() from public, anon;
revoke execute on function public.require_admin() from public, anon;
revoke execute on function public.admin_pros_to_review() from public, anon;
revoke execute on function public.admin_check_credential(uuid, boolean) from public, anon;
revoke execute on function public.admin_approve_pro(uuid, boolean) from public, anon;
revoke execute on function public.admin_open_reports() from public, anon;
revoke execute on function public.admin_resolve_report(uuid, public.problem_status, text, integer) from public, anon;
grant execute on function public.my_offers() to authenticated;
grant execute on function public.pro_jobs(uuid) to authenticated;
grant execute on function public.customer_jobs(uuid) to authenticated;
grant execute on function public.save_push_token(text) to authenticated;
grant execute on function public.forget_push_token(text) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
grant execute on function public.admin_pros_to_review() to authenticated;
grant execute on function public.admin_check_credential(uuid, boolean) to authenticated;
grant execute on function public.admin_approve_pro(uuid, boolean) to authenticated;
grant execute on function public.admin_open_reports() to authenticated;
grant execute on function public.admin_resolve_report(uuid, public.problem_status, text, integer) to authenticated;
