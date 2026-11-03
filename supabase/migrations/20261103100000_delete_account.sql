-- Deleting your account from inside the app, which Apple requires of any app you can
-- sign in to (App Review Guideline 5.1.1(v)).
--
-- The delete-account Edge Function calls forget_user, then deletes the login itself.
-- forget_user removes what identifies the person and stops anything new reaching
-- them: name, phone, push tokens, notifications, a pro's documents and work area, a
-- tenant's link to their landlord. Finished jobs, payments, reviews and messages stay,
-- since the other person and our accounts still need them, but no longer name them.

create function public.forget_user(p_user uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  docs text[];
begin
  -- A job under way, or done but not yet paid, has to finish first.
  if exists (
    select 1 from public.jobs
     where (customer_id = p_user or pro_id = p_user)
       and (status in ('accepted', 'en_route', 'on_site') or (status = 'completed' and paid_at is null))
  ) then
    raise exception 'You have a job under way. Once it''s finished and paid, you can delete your account.';
  end if;

  -- Requests still looking for a pro, or for quotes, are called off.
  update public.job_offers o set status = 'expired'
    from public.jobs j
   where o.job_id = j.id and j.customer_id = p_user and j.status = 'requested' and o.status = 'pending';
  update public.jobs set status = 'cancelled' where customer_id = p_user and status = 'requested';
  update public.quotes q set status = 'declined'
    from public.quote_requests r
   where q.request_id = r.id and r.customer_id = p_user and r.status = 'open' and q.status = 'pending';
  update public.quote_requests set status = 'cancelled' where customer_id = p_user and status = 'open';

  -- A pro stops getting jobs, and their documents go.
  update public.job_offers set status = 'expired' where pro_id = p_user and status = 'pending';
  update public.quotes set status = 'declined' where pro_id = p_user and status = 'pending';
  update public.pros
     set approved_at = null, is_online = false, last_location = null, last_seen_at = null, business_name = null
   where id = p_user;
  select coalesce(array_agg(document_path) filter (where document_path is not null), '{}')
    into docs from public.credentials where pro_id = p_user;
  delete from public.credentials where pro_id = p_user;

  delete from public.push_tokens where user_id = p_user;
  delete from public.notifications where user_id = p_user;
  delete from public.property_tenants where tenant_id = p_user;
  update public.enquiries set user_id = null where user_id = p_user;
  update public.profiles set full_name = null, phone = null, stripe_payment_method_id = null where id = p_user;

  return docs;
end;
$$;

-- Only the Edge Function (service role) calls it, after checking who's asking.
revoke execute on function public.forget_user(uuid) from public, anon, authenticated;
grant execute on function public.forget_user(uuid) to service_role;
