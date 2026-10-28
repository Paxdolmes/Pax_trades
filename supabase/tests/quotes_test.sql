-- Behaviour tests for "Something else? Get quotes".
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- Customers d0 and d9. Pros: h1 heating, vetted. h2 heating, not yet approved.
-- p1 plumbing, vetted. e1 electrical, scheme membership expired.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000d0'), ('00000000-0000-0000-0000-0000000000d9'),
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-0000000000e3'), ('00000000-0000-0000-0000-0000000000e4');
insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-0000000000d0', 'customer'), ('00000000-0000-0000-0000-0000000000d9', 'customer'),
  ('00000000-0000-0000-0000-0000000000e1', 'pro'), ('00000000-0000-0000-0000-0000000000e2', 'pro'),
  ('00000000-0000-0000-0000-0000000000e3', 'pro'), ('00000000-0000-0000-0000-0000000000e4', 'pro');
insert into public.pros (id, trades, approved_at) values
  ('00000000-0000-0000-0000-0000000000e1', '{heating}', now()),
  ('00000000-0000-0000-0000-0000000000e2', '{heating}', null),
  ('00000000-0000-0000-0000-0000000000e3', '{plumbing}', now()),
  ('00000000-0000-0000-0000-0000000000e4', '{electrical}', now());
insert into public.credentials (pro_id, type, expires_on, verified_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'gas_safe', current_date + 200, now()),
  ('00000000-0000-0000-0000-0000000000e1', 'public_liability', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000000e2', 'gas_safe', current_date + 200, now()),
  ('00000000-0000-0000-0000-0000000000e2', 'public_liability', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000000e3', 'plumbing_nvq', null, now()),
  ('00000000-0000-0000-0000-0000000000e3', 'public_liability', current_date + 100, now()),
  ('00000000-0000-0000-0000-0000000000e4', 'competent_person_scheme', current_date - 3, now()),
  ('00000000-0000-0000-0000-0000000000e4', 'public_liability', current_date + 100, now());

set role authenticated;

-- d0 posts a job that isn't in the catalogue, open to any trade.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d0';
insert into public.quote_requests (id, postcode, description, timing)
values ('00000000-0000-0000-0000-0000000000c1', 'SW6 4EH', 'Move a radiator to the other wall and add a towel rail', 'this_week');

-- Customers cannot post a request that is already accepted.
do $$ begin
  insert into public.quote_requests (postcode, description, status) values ('SW6 4EH', 'Fit a new outside tap please', 'accepted');
  raise exception 'FAIL: customer set request status';
exception when insufficient_privilege then null;
end $$;

-- Who can see the request: vetted pros in any trade, not the unapproved or out-of-date ones.
create function pg_temp.sees(p_user text) returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user, true);
  return exists (select 1 from public.quote_requests where id = '00000000-0000-0000-0000-0000000000c1');
end $$;
do $$ begin
  if not pg_temp.sees('00000000-0000-0000-0000-0000000000e1') then raise exception 'FAIL: vetted heating pro cannot see request'; end if;
  if not pg_temp.sees('00000000-0000-0000-0000-0000000000e3') then raise exception 'FAIL: vetted plumber cannot see request'; end if;
  if pg_temp.sees('00000000-0000-0000-0000-0000000000e2') then raise exception 'FAIL: unapproved pro sees request'; end if;
  if pg_temp.sees('00000000-0000-0000-0000-0000000000e4') then raise exception 'FAIL: pro with expired documents sees request'; end if;
  if pg_temp.sees('00000000-0000-0000-0000-0000000000d9') then raise exception 'FAIL: another customer sees request'; end if;
end $$;

-- h1 quotes as a heating engineer; it can't quote under a trade it doesn't do, or twice.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into public.quotes (id, request_id, trade, price_pence, note)
values ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', 'heating', 18000, 'Includes draining down and refilling');
do $$ begin
  insert into public.quotes (request_id, trade, price_pence) values ('00000000-0000-0000-0000-0000000000c1', 'plumbing', 9000);
  raise exception 'FAIL: quoted under another trade';
exception when insufficient_privilege or unique_violation then null;
end $$;
do $$ begin
  insert into public.quotes (request_id, trade, price_pence) values ('00000000-0000-0000-0000-0000000000c1', 'heating', 9000);
  raise exception 'FAIL: second quote from the same pro';
exception when unique_violation then null;
end $$;

-- p1 quotes as a plumber. e1 (expired scheme) is refused.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
insert into public.quotes (id, request_id, trade, price_pence)
values ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c1', 'plumbing', 15000);
do $$ begin
  if exists (select 1 from public.quotes where pro_id <> auth.uid()) then raise exception 'FAIL: pro sees a rival quote'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
do $$ begin
  insert into public.quotes (request_id, trade, price_pence) values ('00000000-0000-0000-0000-0000000000c1', 'electrical', 9000);
  raise exception 'FAIL: pro with expired documents quoted';
exception when insufficient_privilege then null;
end $$;

-- Nobody but the customer can accept, including the quoting pro and another customer.
do $$
declare u text;
begin
  foreach u in array array['00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d9'] loop
    perform set_config('request.jwt.claim.sub', u, true);
    begin
      perform public.accept_quote('00000000-0000-0000-0000-0000000000a5');
      raise exception 'FAIL: % accepted a quote on someone else''s request', u;
    exception when raise_exception then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;
end $$;

-- d0 sees both quotes and accepts h1's: a booked job at the quoted price.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d0';
do $$
declare j public.jobs;
begin
  if (select count(*) from public.quotes where request_id = '00000000-0000-0000-0000-0000000000c1') <> 2 then
    raise exception 'FAIL: customer does not see both quotes';
  end if;
  j := public.accept_quote('00000000-0000-0000-0000-0000000000a5');
  if j.status <> 'accepted' or j.pro_id <> '00000000-0000-0000-0000-0000000000e1'
     or j.final_price_pence <> 18000 or j.job_type_id <> 'custom-heating' or j.customer_id <> auth.uid() then
    raise exception 'FAIL: unexpected job %', j;
  end if;
end $$;

-- The other quote is declined, the request closed, and it can't be accepted again.
do $$ begin
  if (select status from public.quotes where id = '00000000-0000-0000-0000-0000000000a6') <> 'declined' then
    raise exception 'FAIL: other quote not declined';
  end if;
  if (select status from public.quote_requests where id = '00000000-0000-0000-0000-0000000000c1') <> 'accepted' then
    raise exception 'FAIL: request not closed';
  end if;
  perform public.accept_quote('00000000-0000-0000-0000-0000000000a6');
  raise exception 'FAIL: accepted a second quote';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- A closed request can't be quoted on; the winning pro still sees it and the job.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  if not exists (select 1 from public.jobs where job_type_id = 'custom-heating') then raise exception 'FAIL: pro cannot see the booked job'; end if;
  if not exists (select 1 from public.quote_requests where id = '00000000-0000-0000-0000-0000000000c1') then
    raise exception 'FAIL: quoting pro lost sight of the request';
  end if;
end $$;

-- A request for electricians only is hidden from the heating engineer; the customer can cancel it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d0';
insert into public.quote_requests (id, trades, postcode, description)
values ('00000000-0000-0000-0000-0000000000c2', '{electrical}', 'SW6 4EH', 'Add an outdoor socket by the back door');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  if exists (select 1 from public.quote_requests where id = '00000000-0000-0000-0000-0000000000c2') then
    raise exception 'FAIL: heating engineer sees an electrical request';
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d0';
select public.cancel_quote_request('00000000-0000-0000-0000-0000000000c2');
do $$ begin
  update public.quote_requests set status = 'open' where id = '00000000-0000-0000-0000-0000000000c2';
  raise exception 'FAIL: customer reopened a request directly';
exception when insufficient_privilege then null;
end $$;
reset role;

do $$ begin
  if (select status from public.quote_requests where id = '00000000-0000-0000-0000-0000000000c2') <> 'cancelled' then
    raise exception 'FAIL: request not cancelled';
  end if;
end $$;

\echo 'All quote tests passed'
