-- =====================================================================
-- Sakura Japanese Institute · Portal database (Supabase / PostgreSQL)
-- Supabase Dashboard → SQL Editor → New query → paste everything → Run
-- =====================================================================

-- ---------- Staff profiles (who may use the portal) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Institute settings (one row) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ---------- Students ----------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  admission_no text unique not null,
  admission_date date not null default current_date,
  name_bn text not null default '',
  name_en text not null default '',
  dob date,
  gender text default '',
  nid text default '',
  passport_no text default '',
  phone text default '',
  email text default '',
  address_present text default '',
  address_permanent text default '',
  education text default '',
  guardian_name text default '',
  guardian_relation text default '',
  guardian_phone text default '',
  package text not null default 'N5',
  current_level text not null default 'N5' check (current_level in ('N5','N4','N3')),
  batch text not null default 'morning' check (batch in ('morning','evening')),
  start_date date,
  total_fee integer not null default 0 check (total_fee >= 0),
  discount integer not null default 0 check (discount >= 0),
  next_due_date date,
  status text not null default 'active' check (status in ('trial','active','completed','dropped','japan')),
  japan_stage text not null default 'none',
  target_school text default '',
  intake text default '',
  photo_path text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

-- ---------- Payments ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  receipt_no text unique not null,
  paid_on date not null default current_date,
  amount integer not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash','bkash','nagad','bank')),
  trx_id text default '',
  purpose text not null default 'course_fee',
  note text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists payments_student_idx on public.payments(student_id);

-- ---------- Class sessions ----------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  class_date date not null,
  level text not null check (level in ('N5','N4','N3')),
  batch text not null check (batch in ('morning','evening')),
  class_no integer,
  topic text default '',
  teacher text default '',
  hours numeric(4,2) not null default 2 check (hours > 0),
  created_at timestamptz not null default now(),
  unique (class_date, level, batch)
);

-- ---------- Attendance ----------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('present','absent','late','leave')),
  unique (session_id, student_id)
);
create index if not exists attendance_student_idx on public.attendance(student_id);

-- ---------- Student documents ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  doc_type text not null,
  status text not null default 'missing' check (status in ('missing','received','verified')),
  file_path text default '',
  note text default '',
  updated_at timestamptz not null default now(),
  unique (student_id, doc_type)
);

-- ---------- Row Level Security: only staff can see or change anything ----------
alter table public.profiles   enable row level security;
alter table public.settings   enable row level security;
alter table public.students   enable row level security;
alter table public.payments   enable row level security;
alter table public.sessions   enable row level security;
alter table public.attendance enable row level security;
alter table public.documents  enable row level security;

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select using (public.is_staff());
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read settings" on public.settings;
create policy "staff read settings" on public.settings for select using (public.is_staff());
drop policy if exists "admin write settings" on public.settings;
create policy "admin write settings" on public.settings for update using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['students','payments','sessions','attendance','documents'] loop
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

-- Payments are money records: staff may add them, only the admin may change or delete them.
drop policy if exists "staff update payments" on public.payments;
drop policy if exists "admin update payments" on public.payments;
create policy "admin update payments" on public.payments for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Private file storage for scanned documents and photos ----------
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "staff read files" on storage.objects;
create policy "staff read files" on storage.objects for select using (bucket_id = 'documents' and public.is_staff());
drop policy if exists "staff upload files" on storage.objects;
create policy "staff upload files" on storage.objects for insert with check (bucket_id = 'documents' and public.is_staff());
drop policy if exists "staff update files" on storage.objects;
create policy "staff update files" on storage.objects for update using (bucket_id = 'documents' and public.is_staff());
drop policy if exists "admin delete files" on storage.objects;
create policy "admin delete files" on storage.objects for delete using (bucket_id = 'documents' and public.is_admin());

-- =====================================================================
-- AFTER creating your login (Authentication → Users → Add user),
-- make yourself admin. Replace the email and run:
--
--   insert into public.profiles (id, name, role)
--   select id, 'Sayem Ahmed', 'admin' from auth.users where email = 'sayemahmed8820@gmail.com';
--
-- For each office staff member (after adding their user):
--
--   insert into public.profiles (id, name, role)
--   select id, 'Staff name', 'staff' from auth.users where email = 'staff@example.com';
-- =====================================================================
