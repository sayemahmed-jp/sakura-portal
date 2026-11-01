-- =====================================================================
-- Sakura Portal · v6: teachers (শিক্ষক) and salary (বেতন)
-- Salary payments are saved as expenses (category 'salary') linked to the teacher.
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text default '',
  email text default '',
  nid text default '',
  address text default '',
  levels text default '',
  qualification text default '',
  pay_type text not null default 'hourly' check (pay_type in ('monthly','hourly','per_class')),
  rate integer not null default 0 check (rate >= 0),
  joined_on date,
  left_on date,
  active boolean not null default true,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.sessions add column if not exists teacher_id uuid references public.teachers(id) on delete set null;
alter table public.expenses add column if not exists teacher_id uuid references public.teachers(id) on delete set null;
alter table public.expenses add column if not exists period text;
create index if not exists sessions_teacher_idx on public.sessions(teacher_id);
create index if not exists expenses_teacher_idx on public.expenses(teacher_id);

alter table public.teachers enable row level security;
grant select, insert, update, delete on public.teachers to authenticated;

-- Everyone on staff can see teachers (to pick them on the attendance page);
-- only the admin can add them, change their pay rate, or delete them.
drop policy if exists "staff select teachers" on public.teachers;
create policy "staff select teachers" on public.teachers for select using (public.is_staff());
drop policy if exists "admin insert teachers" on public.teachers;
create policy "admin insert teachers" on public.teachers for insert with check (public.is_admin());
drop policy if exists "admin update teachers" on public.teachers;
create policy "admin update teachers" on public.teachers for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete teachers" on public.teachers;
create policy "admin delete teachers" on public.teachers for delete using (public.is_admin());

select 'SAKURA_V6_OK' as result;
