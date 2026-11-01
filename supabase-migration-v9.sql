-- =====================================================================
-- Sakura Portal · v9: Japan application details (入学願書 · 履歴書 · 経費支弁書)
-- One flexible column per student holds education, family, sponsor and
-- purpose-of-study details used to print the application documents.
-- Safe to run more than once.
-- =====================================================================

alter table public.students add column if not exists japan_info jsonb not null default '{}'::jsonb;

select 'SAKURA_V9_OK' as result;
