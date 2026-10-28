-- Relay: accounts. People sign in with their email and a 6-digit code (Supabase
-- Auth). The first time, the app asks their name and creates their profile here;
-- tradespeople then start an application, which an admin approves after vetting.

-- Creates the signed-in user's profile, or updates their name. The role is set
-- once, by which app they signed up in, and never changes here.
create function public.complete_profile(p_role public.app_role, p_full_name text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  name text := trim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then
    raise exception 'please sign in';
  end if;
  if p_role not in ('customer', 'pro') then
    raise exception 'choose customer or tradesperson';
  end if;
  if char_length(name) not between 2 and 80 then
    raise exception 'please enter your name';
  end if;
  insert into public.profiles (id, role, full_name) values (auth.uid(), p_role, name)
  on conflict (id) do update set full_name = excluded.full_name
  returning * into p;
  return p;
end;
$$;

-- Called by a tradesperson from the application screen. Creates their pro record,
-- unapproved, or updates their trades while they're still waiting.
create function public.start_pro_application(p_trades public.trade[]) returns public.pros
language plpgsql security definer set search_path = '' as $$
declare
  p public.pros;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'pro') then
    raise exception 'sign up in the Relay Traders app first';
  end if;
  if coalesce(cardinality(p_trades), 0) = 0 then
    raise exception 'choose at least one trade';
  end if;
  insert into public.pros (id, trades) values (auth.uid(), p_trades)
  on conflict (id) do update set trades = excluded.trades
    where public.pros.approved_at is null
  returning * into p;
  if not found then
    raise exception 'your trades are already approved; contact Relay to change them';
  end if;
  return p;
end;
$$;

revoke execute on function public.complete_profile(public.app_role, text) from public, anon;
revoke execute on function public.start_pro_application(public.trade[]) from public, anon;
grant execute on function public.complete_profile(public.app_role, text) to authenticated;
grant execute on function public.start_pro_application(public.trade[]) to authenticated;
