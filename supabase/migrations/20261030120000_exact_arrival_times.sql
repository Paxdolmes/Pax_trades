-- Relay: booked pros are due at the exact time the customer picked, not by the end
-- of a 2-hour slot. accept_offer() still gives a pro at least an hour when they
-- accept close to the booked time, and reassign_late_jobs() keeps its 15 minutes
-- of grace before a late job goes to the next pro.

create or replace function public.relay_setting(p_key text) returns interval
language sql immutable as $$
  select case p_key
    when 'guarantee_window' then interval '30 days'
    when 'auto_confirm_after' then interval '48 hours'
    when 'late_grace' then interval '15 minutes'
    when 'urgent_eta' then interval '60 minutes'
    when 'booked_slot' then interval '0 minutes'
    when 'online_timeout' then interval '4 hours'
  end;
$$;
