-- =====================================================================
-- Sakura Portal · v5: document dates for expiry alerts (কাগজের মেয়াদ)
-- passport → expires_on, bank statement / sponsor income proof → issued_on
-- Safe to run more than once.
-- =====================================================================

alter table public.documents add column if not exists expires_on date;
alter table public.documents add column if not exists issued_on date;

select 'SAKURA_V5_OK' as result;
