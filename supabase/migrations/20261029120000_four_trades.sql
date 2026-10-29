-- Relay launches with four trades: heating and gas, electrical, plumbing and
-- carpentry (mobile/src/domain/catalog.ts, OFFERED_TRADES). Shelves, TV mounting
-- and flat-pack move from handyman to carpentry so carpenters are offered them.
-- The other trades stay in the database for older jobs and come back later.

update public.job_types set trade = 'carpentry' where id in ('odd-jobs', 'flat-pack');
