-- =====================================================================
-- Sakura Portal · v3: exams (পরীক্ষা) and exam results (নম্বর)
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  exam_date date not null default current_date,
  title text not null default '',
  type text not null default 'quiz' check (type in ('quiz','test','mock','jlpt','nat','speaking','other')),
  level text not null default 'N5' check (level in ('N5','N4','N3')),
  batch text not null default 'all' check (batch in ('all','morning','evening')),
  max_marks numeric(6,2) not null check (max_marks > 0),
  pass_marks numeric(6,2) check (pass_marks is null or pass_marks >= 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  marks numeric(6,2) check (marks is null or marks >= 0),
  absent boolean not null default false,
  note text default '',
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id)
);
create index if not exists exam_results_student_idx on public.exam_results(student_id);

alter table public.exams        enable row level security;
alter table public.exam_results enable row level security;

grant select, insert, update, delete on public.exams, public.exam_results to authenticated;

do $$
declare t text;
begin
  foreach t in array array['exams','exam_results'] loop
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

select 'SAKURA_V3_OK' as result;
