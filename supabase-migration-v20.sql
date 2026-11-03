-- =====================================================================
-- Sakura Portal · v20: interactive books (HTML) as study materials
-- * materials.kind may now be 'book' — a self-contained HTML book (lessons, audio by
--   Japanese voice, quizzes). It is stored in the private "materials" bucket like any file,
--   so only paid, linked students (and staff) can open it.
-- Safe to run more than once.
-- =====================================================================
alter table public.materials drop constraint if exists materials_kind_check;
alter table public.materials add constraint materials_kind_check check (kind in ('pdf','audio','video','image','link','file','book'));
select 'SAKURA_V20_OK' as result;
