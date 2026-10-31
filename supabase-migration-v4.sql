-- =====================================================================
-- Sakura Portal · v4: Japanese schools (জাপানি স্কুল) and applications (আবেদন)
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.jp_schools (
  id uuid primary key default gen_random_uuid(),
  name_ja text not null default '',
  name_en text default '',
  prefecture text default '',
  city text default '',
  address text default '',
  capacity integer check (capacity is null or capacity >= 0),
  tuition_yen integer check (tuition_yen is null or tuition_yen >= 0),
  intakes text default '',
  contact_person text default '',
  phone text default '',
  email text default '',
  website text default '',
  notes text default '',
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.jp_schools(id) on delete restrict,
  intake text not null default '',
  status text not null default 'preparing' check (status in ('preparing','submitted','interview','accepted','coe_applied','coe_granted','visa','departed','rejected','coe_denied','withdrawn')),
  deadline_on date,
  submitted_on date,
  interview_on date,
  result_on date,
  depart_on date,
  school_fee text not null default 'none' check (school_fee in ('none','partial','paid')),
  note text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, school_id, intake)
);
create index if not exists applications_student_idx on public.applications(student_id);
create index if not exists applications_school_idx on public.applications(school_id);

alter table public.jp_schools   enable row level security;
alter table public.applications enable row level security;

grant select, insert, update, delete on public.jp_schools, public.applications to authenticated;

do $$
declare t text;
begin
  foreach t in array array['jp_schools','applications'] loop
    execute format('drop policy if exists "staff select %1$s" on public.%1$s', t);
    execute format('create policy "staff select %1$s" on public.%1$s for select using (public.is_staff())', t);
    execute format('drop policy if exists "staff insert %1$s" on public.%1$s', t);
    execute format('create policy "staff insert %1$s" on public.%1$s for insert with check (public.is_staff())', t);
    execute format('drop policy if exists "staff update %1$s" on public.%1$s', t);
    execute format('create policy "staff update %1$s" on public.%1$s for update using (public.is_staff()) with check (public.is_staff())', t);
    execute format('drop policy if exists "admin delete %1$s" on public.%1$s', t);
    execute format('create policy "admin delete %1$s" on public.%1$s for delete using (public.is_admin())', t);
  end loop;
end $$;

select 'SAKURA_V4_OK' as result;
