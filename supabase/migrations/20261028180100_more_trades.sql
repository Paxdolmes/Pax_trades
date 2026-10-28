-- Relay: five more trades at launch (Daniel's choice, 2026-10-28): drains,
-- locksmith, handyman, carpentry and doors, and appliance repairs.
-- New enum values can't be used in the transaction that adds them, so the job
-- types that use them are in the next migration.

alter type public.trade add value if not exists 'drains';
alter type public.trade add value if not exists 'locksmith';
alter type public.trade add value if not exists 'handyman';
alter type public.trade add value if not exists 'carpentry';
alter type public.trade add value if not exists 'appliances';
