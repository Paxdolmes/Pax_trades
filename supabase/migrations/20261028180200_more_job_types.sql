-- Relay: more jobs under the first three trades, and the jobs for the five new
-- ones (mirrors mobile/src/domain/catalog.ts). The new trades need ID and public
-- liability insurance; they charge the standard callout rate until priced.

update public.job_types set label = 'Blocked toilet' where id = 'blocked-toilet';

insert into public.job_types (id, trade, label, requires, urgent_allowed, fixed_price_pence) values
  ('tap-repair', 'plumbing', 'Dripping or broken tap', '{plumbing_nvq,public_liability}', false, null),
  ('toilet-repair', 'plumbing', 'Toilet won''t flush or keeps running', '{plumbing_nvq,public_liability}', true, null),
  ('appliance-plumb-in', 'plumbing', 'Plumb in a washing machine or dishwasher', '{plumbing_nvq,public_liability}', false, 9500),
  ('light-fitting', 'electrical', 'Replace a light fitting', '{competent_person_scheme,public_liability}', false, 9500),
  ('electrical-repair', 'electrical', 'Other electrical repair', '{competent_person_scheme,public_liability}', false, null),
  ('boiler-repair', 'heating', 'Boiler fault or error code', '{gas_safe,public_liability}', true, null),
  ('radiator', 'heating', 'Radiator cold, leaking or needs moving', '{gas_safe,public_liability}', false, null),
  ('blocked-sink', 'drains', 'Blocked sink, shower or bath', '{public_liability}', true, null),
  ('blocked-drain', 'drains', 'Blocked outside drain or manhole', '{public_liability}', true, null),
  ('locked-out', 'locksmith', 'Locked out', '{public_liability}', true, null),
  ('lock-change', 'locksmith', 'Change, repair or upgrade a lock', '{public_liability}', true, null),
  ('odd-jobs', 'handyman', 'Shelves, pictures, curtain rails or TV mounting', '{public_liability}', false, null),
  ('flat-pack', 'handyman', 'Flat-pack furniture assembly', '{public_liability}', false, null),
  ('door-repair', 'carpentry', 'Door sticking, broken or needs hanging', '{public_liability}', false, null),
  ('floor-repair', 'carpentry', 'Floorboards, skirting or woodwork repair', '{public_liability}', false, null),
  ('washer-repair', 'appliances', 'Washing machine or dishwasher fault', '{public_liability}', false, null),
  ('oven-repair', 'appliances', 'Electric oven, hob or fridge fault', '{public_liability}', false, null),
  ('custom-drains', 'drains', 'Quoted drainage job', '{public_liability}', false, null),
  ('custom-locksmith', 'locksmith', 'Quoted locksmith job', '{public_liability}', false, null),
  ('custom-handyman', 'handyman', 'Quoted handyman job', '{public_liability}', false, null),
  ('custom-carpentry', 'carpentry', 'Quoted carpentry job', '{public_liability}', false, null),
  ('custom-appliances', 'appliances', 'Quoted appliance repair', '{public_liability}', false, null)
on conflict (id) do nothing;

-- The new trades need insurance only, which every pro already provides.
create or replace function public.trade_credential(p_trade public.trade) returns public.credential_type
language sql immutable set search_path = '' as $$
  select case p_trade
    when 'plumbing' then 'plumbing_nvq'
    when 'electrical' then 'competent_person_scheme'
    when 'heating' then 'gas_safe'
    else 'public_liability'
  end::public.credential_type;
$$;
