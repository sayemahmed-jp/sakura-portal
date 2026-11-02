-- =====================================================================
-- Sakura Japanese Institute · Portal database (Supabase / PostgreSQL)
-- Supabase Dashboard → SQL Editor → New query → paste everything → Run
-- =====================================================================

-- ---------- Staff profiles (who may use the portal) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'staff' check (role in ('admin','staff','teacher')),
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
  expires_on date,
  issued_on date,
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
-- Sakura Portal · v2: expenses (খরচ) and inquiries (আগ্রহী ছাত্র)
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null default 'other',
  amount integer not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash','bkash','nagad','bank')),
  paid_to text default '',
  note text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists expenses_spent_on_idx on public.expenses(spent_on);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_on date not null default current_date,
  name text not null default '',
  phone text default '',
  source text not null default 'other',
  interest text not null default 'N5',
  status text not null default 'new' check (status in ('new','contacted','trial','joined','lost')),
  next_follow_up date,
  notes text default '',
  student_id uuid references public.students(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.expenses  enable row level security;
alter table public.inquiries enable row level security;

grant select, insert, update, delete on public.expenses, public.inquiries to authenticated;

do $$
declare t text;
begin
  foreach t in array array['expenses','inquiries'] loop
    execute format('drop policy if exists "staff select %1$s" on public.%1$s', t);
    execute format('create policy "staff select %1$s" on public.%1$s for select using (public.is_staff())', t);
    execute format('drop policy if exists "staff insert %1$s" on public.%1$s', t);
    execute format('create policy "staff insert %1$s" on public.%1$s for insert with check (public.is_staff())', t);
    execute format('drop policy if exists "admin delete %1$s" on public.%1$s', t);
    execute format('create policy "admin delete %1$s" on public.%1$s for delete using (public.is_admin())', t);
  end loop;
end $$;

-- Inquiries: staff can update (follow-ups, status).
drop policy if exists "staff update inquiries" on public.inquiries;
create policy "staff update inquiries" on public.inquiries for update using (public.is_staff()) with check (public.is_staff());

-- Expenses are money records: only the admin may change them.
drop policy if exists "admin update expenses" on public.expenses;
create policy "admin update expenses" on public.expenses for update using (public.is_admin()) with check (public.is_admin());


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


-- v5: document dates (also safe on older databases)
alter table public.documents add column if not exists expires_on date;
alter table public.documents add column if not exists issued_on date;

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


-- =====================================================================
-- Sakura Portal · v7: activity log (কাজের রেকর্ড)
-- Every add / change / delete is written by the database itself, so nobody can
-- skip it from the portal. Only the admin can read it, and nobody can edit or
-- delete it through the portal (only from this SQL editor).
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  user_name text default '',
  action text not null check (action in ('insert','update','delete')),
  table_name text not null,
  row_id text,
  student_id uuid,
  old_data jsonb,
  new_data jsonb
);
create index if not exists audit_log_at_idx on public.audit_log(at desc);
create index if not exists audit_log_student_idx on public.audit_log(student_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists "admin read audit" on public.audit_log;
create policy "admin read audit" on public.audit_log for select using (public.is_admin());

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb; n jsonb; d_old jsonb := '{}'::jsonb; d_new jsonb := '{}'::jsonb;
  k text; rid text; sid text; who text;
begin
  if tg_op <> 'INSERT' then o := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then n := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      if k <> 'updated_at' and (o -> k) is distinct from (n -> k) then
        d_old := d_old || jsonb_build_object(k, o -> k);
        d_new := d_new || jsonb_build_object(k, n -> k);
      end if;
    end loop;
    if d_new = '{}'::jsonb then return null; end if;  -- nothing really changed
  end if;
  rid := coalesce(n ->> 'id', o ->> 'id');
  sid := coalesce(n ->> 'student_id', o ->> 'student_id', case when tg_table_name = 'students' then rid end);
  select name into who from public.profiles where id = auth.uid();
  insert into public.audit_log (user_id, user_name, action, table_name, row_id, student_id, old_data, new_data)
  values (auth.uid(), coalesce(who, ''), lower(tg_op), tg_table_name, rid, nullif(sid, '')::uuid,
          case tg_op when 'INSERT' then null when 'UPDATE' then d_old else o end,
          case tg_op when 'DELETE' then null when 'UPDATE' then d_new else n end);
  return null;
end $$;

do $$
declare t text;
begin
  -- every add, change and delete
  foreach t in array array['students','payments','sessions','documents','expenses','inquiries','exams','jp_schools','applications','teachers','settings','profiles'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_trigger()', t);
    end if;
  end loop;
  -- attendance and marks are entered in bulk every day: log only later changes and deletions
  foreach t in array array['attendance','exam_results'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
      execute format('create trigger audit_%1$s after update or delete on public.%1$s for each row execute function public.audit_trigger()', t);
    end if;
  end loop;
end $$;


-- =====================================================================
-- Sakura Portal · v8: parent page (অভিভাবকের পাতা)
-- Each student can get a secret link. Whoever has the link sees ONLY that
-- student's classes, attendance, fees, results and Japan progress — never
-- NID, passport, phone numbers, addresses or uploaded files, and never any
-- other student. Making a new link switches the old one off.
-- Safe to run more than once.
-- =====================================================================

alter table public.students add column if not exists parent_token text;
create unique index if not exists students_parent_token_idx on public.students(parent_token) where parent_token is not null;

create or replace function public.parent_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; st jsonb; res jsonb;
begin
  if p_token is null or length(p_token) < 24 then return null; end if;
  select * into s from public.students where parent_token = p_token;
  if not found then return null; end if;
  select data into st from public.settings where id = 1;
  st := coalesce(st, '{}'::jsonb);
  res := jsonb_build_object(
    'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'en', st ->> 'institute_en', 'ja', st ->> 'institute_ja',
                                    'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp', 'address', st ->> 'address'),
    'student', jsonb_build_object('name_bn', s.name_bn, 'name_en', s.name_en, 'admission_no', s.admission_no,
                                  'current_level', s.current_level, 'batch', s.batch, 'package', s.package, 'status', s.status,
                                  'start_date', s.start_date, 'admission_date', s.admission_date,
                                  'total_fee', s.total_fee, 'discount', s.discount, 'next_due_date', s.next_due_date,
                                  'japan_stage', s.japan_stage, 'target_school', s.target_school, 'intake', s.intake),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('paid_on', p.paid_on, 'receipt_no', p.receipt_no, 'amount', p.amount, 'method', p.method) order by p.paid_on desc)
                          from public.payments p where p.student_id = s.id), '[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(jsonb_build_object('date', se.class_date, 'level', se.level, 'hours', se.hours, 'topic', se.topic, 'status', a.status) order by se.class_date desc)
                            from public.attendance a join public.sessions se on se.id = a.session_id where a.student_id = s.id), '[]'::jsonb),
    'exams', coalesce((select jsonb_agg(jsonb_build_object('date', e.exam_date, 'title', e.title, 'type', e.type, 'level', e.level,
                                                           'max_marks', e.max_marks, 'pass_marks', e.pass_marks, 'marks', r.marks, 'absent', r.absent) order by e.exam_date desc)
                       from public.exam_results r join public.exams e on e.id = r.exam_id where r.student_id = s.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('doc_type', d.doc_type, 'status', d.status, 'expires_on', d.expires_on))
                           from public.documents d where d.student_id = s.id), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object('school', coalesce(nullif(j.name_ja, ''), j.name_en), 'city', j.city, 'intake', a.intake,
                                                                  'status', a.status, 'interview_on', a.interview_on, 'deadline_on', a.deadline_on) order by a.intake desc)
                              from public.applications a join public.jp_schools j on j.id = a.school_id where a.student_id = s.id), '[]'::jsonb),
    'generated_at', now());
  return res;
end $$;

revoke all on function public.parent_view(text) from public;
grant execute on function public.parent_view(text) to anon, authenticated;


-- v9: Japan application details
alter table public.students add column if not exists japan_info jsonb not null default '{}'::jsonb;

-- =====================================================================
-- Sakura Portal · v10: Japan processing fees and school commissions
-- * students.processing_fee — the agreed Japan-processing fee (kept apart from the course fee)
-- * payments with purpose 'processing' count toward it, not toward the course fee
-- * commissions — money Japanese schools pay the institute (admin only)
-- Safe to run more than once.
-- =====================================================================

alter table public.students add column if not exists processing_fee integer not null default 0 check (processing_fee >= 0);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.jp_schools(id) on delete restrict,
  application_id uuid references public.applications(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  status text not null default 'expected' check (status in ('expected','received','cancelled')),
  amount_yen integer check (amount_yen is null or amount_yen >= 0),
  amount_bdt integer check (amount_bdt is null or amount_bdt >= 0),
  expected_on date,
  received_on date,
  note text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists commissions_received_idx on public.commissions(received_on);

alter table public.commissions enable row level security;
grant select, insert, update, delete on public.commissions to authenticated;
drop policy if exists "admin all commissions" on public.commissions;
create policy "admin all commissions" on public.commissions for all using (public.is_admin()) with check (public.is_admin());

-- activity log for the new table
drop trigger if exists audit_commissions on public.commissions;
create trigger audit_commissions after insert or update or delete on public.commissions for each row execute function public.audit_trigger();

-- parent page: show the processing fee separately from the course fee
create or replace function public.parent_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; st jsonb; res jsonb;
begin
  if p_token is null or length(p_token) < 24 then return null; end if;
  select * into s from public.students where parent_token = p_token;
  if not found then return null; end if;
  select data into st from public.settings where id = 1;
  st := coalesce(st, '{}'::jsonb);
  res := jsonb_build_object(
    'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'en', st ->> 'institute_en', 'ja', st ->> 'institute_ja',
                                    'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp', 'address', st ->> 'address'),
    'student', jsonb_build_object('name_bn', s.name_bn, 'name_en', s.name_en, 'admission_no', s.admission_no,
                                  'current_level', s.current_level, 'batch', s.batch, 'package', s.package, 'status', s.status,
                                  'start_date', s.start_date, 'admission_date', s.admission_date,
                                  'total_fee', s.total_fee, 'discount', s.discount, 'processing_fee', s.processing_fee, 'next_due_date', s.next_due_date,
                                  'japan_stage', s.japan_stage, 'target_school', s.target_school, 'intake', s.intake),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('paid_on', p.paid_on, 'receipt_no', p.receipt_no, 'amount', p.amount, 'method', p.method, 'purpose', p.purpose) order by p.paid_on desc)
                          from public.payments p where p.student_id = s.id), '[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(jsonb_build_object('date', se.class_date, 'level', se.level, 'hours', se.hours, 'topic', se.topic, 'status', a.status) order by se.class_date desc)
                            from public.attendance a join public.sessions se on se.id = a.session_id where a.student_id = s.id), '[]'::jsonb),
    'exams', coalesce((select jsonb_agg(jsonb_build_object('date', e.exam_date, 'title', e.title, 'type', e.type, 'level', e.level,
                                                           'max_marks', e.max_marks, 'pass_marks', e.pass_marks, 'marks', r.marks, 'absent', r.absent) order by e.exam_date desc)
                       from public.exam_results r join public.exams e on e.id = r.exam_id where r.student_id = s.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('doc_type', d.doc_type, 'status', d.status, 'expires_on', d.expires_on))
                           from public.documents d where d.student_id = s.id), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object('school', coalesce(nullif(j.name_ja, ''), j.name_en), 'city', j.city, 'intake', a.intake,
                                                                  'status', a.status, 'interview_on', a.interview_on, 'deadline_on', a.deadline_on) order by a.intake desc)
                              from public.applications a join public.jp_schools j on j.id = a.school_id where a.student_id = s.id), '[]'::jsonb),
    'generated_at', now());
  return res;
end $$;



-- =====================================================================
-- Sakura Portal · v11: public website & online admission form
-- * public_info()     — fees, phone, address etc. for the website (no student data)
-- * submit_inquiry()  — the website form adds a row to "আগ্রহী ছাত্র"
--   (checked and rate-limited; visitors can never read any data)
-- Safe to run more than once.
-- =====================================================================

create or replace function public.public_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'institute_bn', data ->> 'institute_bn', 'institute_en', data ->> 'institute_en', 'institute_ja', data ->> 'institute_ja',
    'phone', data ->> 'phone', 'whatsapp', data ->> 'whatsapp', 'email', data ->> 'email', 'address', data ->> 'address',
    'director_en', data ->> 'director_en', 'director_ja', data ->> 'director_ja',
    'fees', data -> 'fees', 'textbooks', data -> 'textbooks', 'hours_per_class', data -> 'hours_per_class')
  from public.settings where id = 1;
$$;

create or replace function public.submit_inquiry(p_name text, p_phone text, p_interest text, p_note text, p_source text default 'website')
returns text language plpgsql volatile security definer set search_path = public as $$
declare ph text; nm text;
begin
  nm := btrim(coalesce(p_name, ''));
  ph := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  if length(nm) < 2 or length(nm) > 80 then return 'bad_name'; end if;
  if length(regexp_replace(ph, '[^0-9]', '', 'g')) not between 9 and 15 then return 'bad_phone'; end if;
  if coalesce(p_interest, '') not in ('N5','N4','N3','japan','other') then p_interest := 'other'; end if;
  if coalesce(p_source, '') not in ('website','facebook','whatsapp','referral','other') then p_source := 'website'; end if;
  -- the same number twice within 10 minutes, or a flood of web submissions: ignore quietly
  if exists (select 1 from public.inquiries where regexp_replace(phone, '[^0-9+]', '', 'g') = ph and created_at > now() - interval '10 minutes') then return 'ok'; end if;
  if (select count(*) from public.inquiries where created_at > now() - interval '1 hour' and created_by is null) > 30 then return 'busy'; end if;
  insert into public.inquiries (created_on, name, phone, source, interest, status, next_follow_up, notes, created_by)
  values (current_date, nm, ph, p_source, p_interest, 'new', current_date,
          'ওয়েবসাইটের ফর্ম থেকে' || case when btrim(coalesce(p_note, '')) <> '' then ': ' || left(btrim(p_note), 500) else '' end, null);
  return 'ok';
end $$;

revoke all on function public.public_info() from public;
revoke all on function public.submit_inquiry(text, text, text, text, text) from public;
grant execute on function public.public_info() to anon, authenticated;
grant execute on function public.submit_inquiry(text, text, text, text, text) to anon, authenticated;


-- =====================================================================
-- Sakura Portal · v12: holidays & class calendar (ছুটি ও ক্যালেন্ডার)
-- Weekly days off are kept in settings (class_days); individual holidays here.
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  on_date date not null,
  title text not null default '',
  type text not null default 'institute' check (type in ('govt','institute','exam')),
  batch text not null default 'all' check (batch in ('all','morning','evening')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (on_date, batch)
);

alter table public.holidays enable row level security;
grant select, insert, update, delete on public.holidays to authenticated;

do $$
begin
  execute 'drop policy if exists "staff select holidays" on public.holidays';
  execute 'create policy "staff select holidays" on public.holidays for select using (public.is_staff())';
  execute 'drop policy if exists "staff insert holidays" on public.holidays';
  execute 'create policy "staff insert holidays" on public.holidays for insert with check (public.is_staff())';
  execute 'drop policy if exists "staff update holidays" on public.holidays';
  execute 'create policy "staff update holidays" on public.holidays for update using (public.is_staff()) with check (public.is_staff())';
  execute 'drop policy if exists "staff delete holidays" on public.holidays';
  execute 'create policy "staff delete holidays" on public.holidays for delete using (public.is_staff())';
end $$;

drop trigger if exists audit_holidays on public.holidays;
create trigger audit_holidays after insert or update or delete on public.holidays for each row execute function public.audit_trigger();


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


-- =====================================================================
-- Sakura Portal · v13: director-only areas
-- * expenses (খরচ, বেতন, লাভ-ক্ষতি)  — only the director can see or add
-- * teachers (বেতনের হার, NID, ঠিকানা) — only the director; staff get just
--   the names through teacher_list (for picking a teacher on the attendance page)
-- * course fee / discount / processing fee — staff cannot give a discount,
--   set a processing fee, or put a fee below the package price
-- (commissions and the activity log were already director-only)
-- Safe to run more than once.
-- =====================================================================

-- ---------- expenses: director only ----------
drop policy if exists "staff select expenses" on public.expenses;
drop policy if exists "staff insert expenses" on public.expenses;
drop policy if exists "admin select expenses" on public.expenses;
create policy "admin select expenses" on public.expenses for select using (public.is_admin());
drop policy if exists "admin insert expenses" on public.expenses;
create policy "admin insert expenses" on public.expenses for insert with check (public.is_admin());

-- ---------- teachers: director only, names for staff ----------
drop policy if exists "staff select teachers" on public.teachers;
drop policy if exists "admin select teachers" on public.teachers;
create policy "admin select teachers" on public.teachers for select using (public.is_admin());

create or replace view public.teacher_list as
  select id, name, levels, active from public.teachers where public.is_staff();
revoke all on public.teacher_list from public, anon;
grant select on public.teacher_list to authenticated;

-- ---------- fees: only the director may give discounts ----------
create or replace function public.guard_student_fees() returns trigger
language plpgsql security definer set search_path = public as $$
declare list_price integer;
begin
  -- SQL editor / server jobs (no logged-in user) and the director are not limited
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.discount, 0) <> 0 then raise exception 'ছাড় দিতে পারেন শুধু পরিচালক (only the director can give a discount)'; end if;
    if coalesce(new.processing_fee, 0) <> 0 then raise exception 'প্রসেসিং ফি ঠিক করতে পারেন শুধু পরিচালক (only the director can set the processing fee)'; end if;
  else
    if new.discount is distinct from old.discount then raise exception 'ছাড় বদলাতে পারেন শুধু পরিচালক (only the director can change the discount)'; end if;
    if new.processing_fee is distinct from old.processing_fee then raise exception 'প্রসেসিং ফি বদলাতে পারেন শুধু পরিচালক (only the director can change the processing fee)'; end if;
    if new.total_fee is not distinct from old.total_fee then return new; end if;
  end if;
  -- package price from Settings; if Settings were never saved, the portal's built-in prices
  select nullif(data -> 'fees' ->> new.package, '')::integer into list_price from public.settings where id = 1;
  if list_price is null then
    list_price := ('{"N5":20000,"N4":20000,"N3":22000,"N5+N4":35000,"N5+N4+N3":45000}'::jsonb ->> new.package)::integer;
  end if;
  if list_price is not null and coalesce(new.total_fee, 0) < list_price then
    raise exception 'মোট ফি প্যাকেজের দামের (৳%) চেয়ে কম রাখতে পারেন শুধু পরিচালক (only the director can lower the fee)', list_price;
  end if;
  return new;
end $$;

drop trigger if exists guard_student_fees on public.students;
create trigger guard_student_fees before insert or update on public.students
  for each row execute function public.guard_student_fees();



-- =====================================================================
-- Sakura Portal · v14: student site (ছাত্রদের সাইট) and study materials (পড়ার উপকরণ)
-- * materials        — notes, sheets, audio, video and links, by level (N5/N4/N3/all)
-- * storage bucket   — "materials" (private; files open only through short-lived links)
-- * students.auth_user_id — the student's own login, linked with admission no + phone
-- * students.portal_blocked — the office can switch one student's access off
-- * A student sees materials only for the levels in their package, and only when the
--   full course fee is paid, they are not "dropped", and the office has not blocked them.
-- * Students can never read the staff tables: every staff rule checks is_staff().
-- Safe to run more than once.
-- =====================================================================

alter table public.students add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.students add column if not exists portal_blocked boolean not null default false;

-- ---------- materials ----------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  level text not null default 'N5' check (level in ('N5','N4','N3','all')),
  kind text not null default 'pdf' check (kind in ('pdf','audio','video','image','link','file')),
  chapter text not null default '',
  sort_order integer not null default 0,
  description text not null default '',
  file_path text,
  file_name text,
  size_bytes bigint,
  url text,
  published boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists materials_level_idx on public.materials(level, sort_order);

alter table public.materials enable row level security;
grant select, insert, update, delete on public.materials to authenticated;
drop policy if exists "staff select materials" on public.materials;
create policy "staff select materials" on public.materials for select using (public.is_staff());
drop policy if exists "staff insert materials" on public.materials;
create policy "staff insert materials" on public.materials for insert with check (public.is_staff());
drop policy if exists "staff update materials" on public.materials;
create policy "staff update materials" on public.materials for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "admin delete materials" on public.materials;
create policy "admin delete materials" on public.materials for delete using (public.is_admin());

drop trigger if exists audit_materials on public.materials;
create trigger audit_materials after insert or update or delete on public.materials for each row execute function public.audit_trigger();

-- ---------- who is the logged-in student, and may they read? ----------
create or replace function public.student_levels(p_package text, p_current text) returns text[]
language sql immutable as $$
  select array(select distinct x from unnest(string_to_array(coalesce(p_package, ''), '+') || array[coalesce(p_current, '')]) x where x in ('N5','N4','N3'));
$$;

create or replace function public.student_fee_state(p_student uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('net', greatest(0, s.total_fee - s.discount), 'paid', coalesce(p.paid, 0),
                            'due', greatest(0, greatest(0, s.total_fee - s.discount) - coalesce(p.paid, 0)))
  from public.students s
  left join (select student_id, sum(amount) as paid from public.payments where purpose is distinct from 'processing' group by student_id) p on p.student_id = s.id
  where s.id = p_student;
$$;

-- why a linked student cannot read yet (null = may read)
create or replace function public.student_block_reason(s public.students) returns text
language sql stable security definer set search_path = public as $$
  select case when s.portal_blocked then 'blocked'
              when s.status = 'dropped' then 'dropped'
              when (public.student_fee_state(s.id) ->> 'due')::integer > 0 then 'due'
              else null end;
$$;

create or replace function public.can_read_material(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s join public.materials m on m.file_path = p_path
    where s.auth_user_id = auth.uid() and auth.uid() is not null and m.published
      and (m.level = 'all' or m.level = any(public.student_levels(s.package, s.current_level)))
      and public.student_block_reason(s) is null);
$$;

-- ---------- private file storage for materials ----------
insert into storage.buckets (id, name, public, file_size_limit) values ('materials', 'materials', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "staff read materials" on storage.objects;
create policy "staff read materials" on storage.objects for select using (bucket_id = 'materials' and public.is_staff());
drop policy if exists "student read materials" on storage.objects;
create policy "student read materials" on storage.objects for select to authenticated using (bucket_id = 'materials' and public.can_read_material(name));
drop policy if exists "staff upload materials" on storage.objects;
create policy "staff upload materials" on storage.objects for insert with check (bucket_id = 'materials' and public.is_staff());
drop policy if exists "staff update materials" on storage.objects;
create policy "staff update materials" on storage.objects for update using (bucket_id = 'materials' and public.is_staff());
drop policy if exists "admin delete materials" on storage.objects;
create policy "admin delete materials" on storage.objects for delete using (bucket_id = 'materials' and public.is_admin());

-- ---------- linking a login to a student (admission no + phone) ----------
create table if not exists public.student_link_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  at timestamptz not null default now(),
  ok boolean not null default false
);
alter table public.student_link_attempts enable row level security; -- no policies: only the functions below use it

create or replace function public.link_student(p_admission_no text, p_phone text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); ph text; s public.students;
begin
  if uid is null then return 'login'; end if;
  if public.is_staff() then return 'staff'; end if;
  if exists (select 1 from public.students where auth_user_id = uid) then return 'already'; end if;
  if (select count(*) from public.student_link_attempts where user_id = uid and not ok and at > now() - interval '1 hour') >= 5 then return 'busy'; end if;
  ph := right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 10);
  if length(ph) < 10 then return 'bad_phone'; end if;
  select * into s from public.students
   where upper(btrim(admission_no)) = upper(btrim(coalesce(p_admission_no, '')))
     and (right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10) = ph
          or right(regexp_replace(coalesce(guardian_phone, ''), '[^0-9]', '', 'g'), 10) = ph)
   limit 1;
  if not found then
    insert into public.student_link_attempts (user_id, ok) values (uid, false);
    return 'not_found';
  end if;
  if s.auth_user_id is not null and s.auth_user_id <> uid then return 'taken'; end if;
  update public.students set auth_user_id = uid where id = s.id;
  insert into public.student_link_attempts (user_id, ok) values (uid, true);
  return 'ok';
end $$;

-- ---------- everything the student site shows ----------
create or replace function public.student_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.students; st jsonb; why text; lv text[]; mats jsonb; counts jsonb;
begin
  if uid is null then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  select * into s from public.students where auth_user_id = uid;
  if not found then
    return jsonb_build_object('linked', false, 'staff', public.is_staff(),
      'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp'));
  end if;
  why := public.student_block_reason(s);
  lv := public.student_levels(s.package, s.current_level);
  select coalesce(jsonb_object_agg(level, n), '{}'::jsonb) into counts
    from (select level, count(*) n from public.materials where published and (level = 'all' or level = any(lv)) group by level) c;
  if why is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'level', level, 'kind', kind, 'chapter', chapter,
                                                 'description', description, 'file_path', file_path, 'file_name', file_name,
                                                 'size_bytes', size_bytes, 'url', url)
                              order by case level when 'all' then 0 when 'N5' then 1 when 'N4' then 2 else 3 end, sort_order, chapter, title), '[]'::jsonb)
      into mats from public.materials where published and (level = 'all' or level = any(lv));
  else mats := '[]'::jsonb; end if;
  return jsonb_build_object('linked', true,
    'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp'),
    'student', jsonb_build_object('name_bn', s.name_bn, 'name_en', s.name_en, 'admission_no', s.admission_no, 'package', s.package,
                                  'current_level', s.current_level, 'batch', s.batch, 'status', s.status, 'next_due_date', s.next_due_date),
    'levels', to_jsonb(lv), 'fee', public.student_fee_state(s.id), 'blocked', why, 'counts', counts, 'materials', mats);
end $$;

revoke all on function public.student_fee_state(uuid) from public;
revoke all on function public.student_block_reason(public.students) from public;
revoke all on function public.can_read_material(text) from public;
revoke all on function public.link_student(text, text) from public;
revoke all on function public.student_me() from public;
grant execute on function public.can_read_material(text) to authenticated;
grant execute on function public.link_student(text, text) to authenticated;
grant execute on function public.student_me() to authenticated;



-- =====================================================================
-- Sakura Portal · v15: online mock tests (অনলাইন মক টেস্ট)
-- * mock_tests      — a test for one level, with a time limit
-- * mock_questions  — 4-choice questions: vocab / grammar / reading / listening
--                     (listening plays an uploaded audio file, or reads a Japanese script aloud)
-- * mock_attempts   — one student's sitting; graded on the server
-- * Students never receive the correct answers before they submit, and only
--   take tests for their own levels when the full course fee is paid (same rule as materials).
-- * Each submission also writes the mark into "পরীক্ষা ও রেজাল্ট" (best mark is kept).
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  level text not null default 'N5' check (level in ('N5','N4','N3')),
  description text not null default '',
  duration_min integer not null default 30 check (duration_min between 1 and 300),
  pass_pct integer not null default 60 check (pass_pct between 0 and 100),
  show_answers boolean not null default true,
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  published boolean not null default false,
  sort_order integer not null default 0,
  exam_id uuid references public.exams(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.mock_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  section text not null default 'vocab' check (section in ('vocab','grammar','reading','listening')),
  sort_order integer not null default 0,
  passage text not null default '',
  question text not null default '',
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4),
  correct smallint not null check (correct between 0 and 3),
  explanation text not null default '',
  script text not null default '',
  audio_path text,
  created_at timestamptz not null default now()
);
create index if not exists mock_questions_test_idx on public.mock_questions(test_id, section, sort_order);

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  total integer,
  sections jsonb
);
create index if not exists mock_attempts_student_idx on public.mock_attempts(student_id, test_id);

alter table public.mock_tests enable row level security;
alter table public.mock_questions enable row level security;
alter table public.mock_attempts enable row level security;
grant select, insert, update, delete on public.mock_tests, public.mock_questions to authenticated;
grant select, delete on public.mock_attempts to authenticated;

do $$
declare t text;
begin
  foreach t in array array['mock_tests','mock_questions'] loop
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
drop policy if exists "staff select mock_attempts" on public.mock_attempts;
create policy "staff select mock_attempts" on public.mock_attempts for select using (public.is_staff());
drop policy if exists "admin delete mock_attempts" on public.mock_attempts;
create policy "admin delete mock_attempts" on public.mock_attempts for delete using (public.is_admin());

drop trigger if exists audit_mock_tests on public.mock_tests;
create trigger audit_mock_tests after insert or update or delete on public.mock_tests for each row execute function public.audit_trigger();

-- ---------- helpers ----------
-- the logged-in student, only when they may use the student site right now
create or replace function public.mock_student() returns public.students
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  select * into s from public.students where auth_user_id = auth.uid() and auth.uid() is not null;
  if not found then raise exception 'not_linked'; end if;
  if public.student_block_reason(s) is not null then raise exception 'locked'; end if;
  return s;
end $$;

create or replace function public.mock_test_for(s public.students, p_test uuid) returns public.mock_tests
language plpgsql stable security definer set search_path = public as $$
declare t public.mock_tests;
begin
  select * into t from public.mock_tests where id = p_test and published and level = any(public.student_levels(s.package, s.current_level));
  if not found then raise exception 'not_found'; end if;
  return t;
end $$;

create or replace function public.mock_section_rank(p text) returns integer language sql immutable as $$
  select case p when 'vocab' then 1 when 'grammar' then 2 when 'reading' then 3 else 4 end;
$$;

-- grade one attempt (stores the result) and return the review
create or replace function public.mock_grade(p_attempt uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare a public.mock_attempts; t public.mock_tests; sc integer := 0; tot integer := 0; secs jsonb := '{}'::jsonb; q record; ok boolean; ex uuid; best integer;
begin
  select * into a from public.mock_attempts where id = p_attempt;
  select * into t from public.mock_tests where id = a.test_id;
  if a.submitted_at is null then
    for q in select id, section, correct from public.mock_questions where test_id = a.test_id loop
      ok := (a.answers ->> q.id::text) is not null and (a.answers ->> q.id::text) ~ '^[0-3]$' and (a.answers ->> q.id::text)::int = q.correct;
      tot := tot + 1; if ok then sc := sc + 1; end if;
      secs := jsonb_set(secs, array[q.section], jsonb_build_object(
        'score', coalesce((secs -> q.section ->> 'score')::int, 0) + case when ok then 1 else 0 end,
        'total', coalesce((secs -> q.section ->> 'total')::int, 0) + 1));
    end loop;
    update public.mock_attempts set submitted_at = least(now(), deadline + interval '2 minutes'), score = sc, total = tot, sections = secs where id = a.id returning * into a;
    -- write the best mark into the regular exam results
    if tot > 0 then
      ex := t.exam_id;
      if ex is null or not exists (select 1 from public.exams where id = ex) then
        insert into public.exams (exam_date, title, type, level, batch, max_marks, pass_marks, created_by)
        values (current_date, 'অনলাইন মক: ' || t.title, 'mock', t.level, 'all', tot, ceil(tot * t.pass_pct / 100.0), null) returning id into ex;
        update public.mock_tests set exam_id = ex where id = t.id;
      else
        update public.exams set max_marks = tot, pass_marks = ceil(tot * t.pass_pct / 100.0) where id = ex and max_marks <> tot;
      end if;
      select max(score) into best from public.mock_attempts where test_id = t.id and student_id = a.student_id and submitted_at is not null;
      insert into public.exam_results (exam_id, student_id, marks, absent, note, updated_at)
      values (ex, a.student_id, best, false, 'অনলাইনে দিয়েছে', now())
      on conflict (exam_id, student_id) do update set marks = excluded.marks, absent = false, note = excluded.note, updated_at = now();
    end if;
  end if;
  return public.mock_review_of(a.id);
end $$;

create or replace function public.mock_review_of(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.mock_attempts; t public.mock_tests;
begin
  select * into a from public.mock_attempts where id = p_attempt;
  select * into t from public.mock_tests where id = a.test_id;
  return jsonb_build_object('attempt_id', a.id, 'test', jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'pass_pct', t.pass_pct),
    'started_at', a.started_at, 'submitted_at', a.submitted_at, 'score', a.score, 'total', a.total, 'sections', a.sections,
    'passed', a.total > 0 and a.score * 100 >= t.pass_pct * a.total, 'show_answers', t.show_answers,
    'questions', case when t.show_answers then coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'section', q.section, 'passage', q.passage, 'question', q.question,
                         'options', q.options, 'script', q.script, 'correct', q.correct, 'explanation', q.explanation, 'mine', a.answers -> q.id::text)
                         order by public.mock_section_rank(q.section), q.sort_order, q.created_at) from public.mock_questions q where q.test_id = t.id), '[]'::jsonb) else '[]'::jsonb end);
end $$;

-- ---------- what the student site calls ----------
create or replace function public.student_mock_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  begin s := public.mock_student(); exception when others then return '[]'::jsonb; end;
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'description', t.description,
      'duration_min', t.duration_min, 'pass_pct', t.pass_pct, 'max_attempts', t.max_attempts,
      'questions', (select count(*) from public.mock_questions q where q.test_id = t.id),
      'attempts', (select count(*) from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null),
      'best', (select max(score) from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null),
      'last_attempt', (select id from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null order by a.submitted_at desc limit 1),
      'open_attempt', (select id from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is null and a.deadline > now() order by a.started_at desc limit 1))
    order by case t.level when 'N5' then 1 when 'N4' then 2 else 3 end, t.sort_order, t.created_at)
    from public.mock_tests t where t.published and t.level = any(public.student_levels(s.package, s.current_level))
      and exists (select 1 from public.mock_questions q where q.test_id = t.id)), '[]'::jsonb);
end $$;

create or replace function public.student_mock_start(p_test uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; t public.mock_tests; a public.mock_attempts; stale uuid; done integer;
begin
  s := public.mock_student(); t := public.mock_test_for(s, p_test);
  -- finish sittings whose time ran out (with whatever was saved)
  for stale in select id from public.mock_attempts where test_id = t.id and student_id = s.id and submitted_at is null and deadline + interval '2 minutes' < now() loop
    perform public.mock_grade(stale);
  end loop;
  select * into a from public.mock_attempts where test_id = t.id and student_id = s.id and submitted_at is null order by started_at desc limit 1;
  if not found then
    select count(*) into done from public.mock_attempts where test_id = t.id and student_id = s.id and submitted_at is not null;
    if t.max_attempts is not null and done >= t.max_attempts then raise exception 'limit'; end if;
    if (select count(*) from public.mock_attempts where student_id = s.id and started_at > now() - interval '1 hour') >= 20 then raise exception 'busy'; end if;
    insert into public.mock_attempts (test_id, student_id, deadline) values (t.id, s.id, now() + make_interval(mins => t.duration_min)) returning * into a;
  end if;
  return jsonb_build_object('attempt_id', a.id, 'deadline', a.deadline, 'now', now(), 'answers', a.answers,
    'test', jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'duration_min', t.duration_min, 'pass_pct', t.pass_pct),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'section', q.section, 'passage', q.passage, 'question', q.question,
                            'options', q.options, 'script', q.script, 'audio_path', q.audio_path)
                          order by public.mock_section_rank(q.section), q.sort_order, q.created_at) from public.mock_questions q where q.test_id = t.id), '[]'::jsonb));
end $$;

create or replace function public.student_mock_save(p_attempt uuid, p_answers jsonb) returns text
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  update public.mock_attempts set answers = coalesce(p_answers, '{}'::jsonb)
   where id = p_attempt and student_id = s.id and submitted_at is null and now() <= deadline + interval '2 minutes'
     and jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) = 'object' and length(coalesce(p_answers, '{}'::jsonb)::text) < 20000;
  return case when found then 'ok' else 'closed' end;
end $$;

create or replace function public.student_mock_submit(p_attempt uuid, p_answers jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  if not exists (select 1 from public.mock_attempts where id = p_attempt and student_id = s.id) then raise exception 'not_found'; end if;
  perform public.student_mock_save(p_attempt, p_answers);
  return public.mock_grade(p_attempt);
end $$;

create or replace function public.student_mock_review(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  if not exists (select 1 from public.mock_attempts where id = p_attempt and student_id = s.id and submitted_at is not null) then raise exception 'not_found'; end if;
  return public.mock_review_of(p_attempt);
end $$;

-- listening audio uploaded for a question (kept in the private "materials" bucket under mock/)
create or replace function public.can_read_mock_audio(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s
      join public.mock_questions q on q.audio_path = p_path
      join public.mock_tests t on t.id = q.test_id
    where s.auth_user_id = auth.uid() and auth.uid() is not null and t.published
      and t.level = any(public.student_levels(s.package, s.current_level))
      and public.student_block_reason(s) is null);
$$;
drop policy if exists "student read mock audio" on storage.objects;
create policy "student read mock audio" on storage.objects for select to authenticated using (bucket_id = 'materials' and public.can_read_mock_audio(name));

revoke all on function public.mock_student() from public;
revoke all on function public.mock_test_for(public.students, uuid) from public;
revoke all on function public.mock_grade(uuid) from public;
revoke all on function public.mock_review_of(uuid) from public;
revoke all on function public.student_mock_list() from public;
revoke all on function public.student_mock_start(uuid) from public;
revoke all on function public.student_mock_save(uuid, jsonb) from public;
revoke all on function public.student_mock_submit(uuid, jsonb) from public;
revoke all on function public.student_mock_review(uuid) from public;
revoke all on function public.can_read_mock_audio(text) from public;
grant execute on function public.student_mock_list() to authenticated;
grant execute on function public.student_mock_start(uuid) to authenticated;
grant execute on function public.student_mock_save(uuid, jsonb) to authenticated;
grant execute on function public.student_mock_submit(uuid, jsonb) to authenticated;
grant execute on function public.student_mock_review(uuid) to authenticated;
grant execute on function public.can_read_mock_audio(text) to authenticated;



-- =====================================================================
-- Sakura Portal · v16: three kinds of login — director, office staff, teacher
-- * profiles.role: 'admin' (পরিচালক), 'staff' (অফিস স্টাফ), 'teacher' (শিক্ষক)
-- * is_staff()  now means office (admin or staff) — everything that used it stays office-only
-- * is_member() means any portal login, teachers included
-- * Teachers get: attendance, classes, exams & marks, study materials, mock tests,
--   the calendar, and a class list of students WITHOUT phone, address, NID/passport,
--   fees or documents (student_roster). Nothing about money, admissions or Japan files.
-- * Students (student site) are unchanged: they have no profile, so none of this applies.
-- Safe to run more than once.
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','staff','teacher'));

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','staff'));
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to anon, authenticated;

-- ---------- what every portal login (teachers too) may use ----------
drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select using (public.is_member());
drop policy if exists "staff read settings" on public.settings;
create policy "staff read settings" on public.settings for select using (public.is_member());

do $$
declare t text;
begin
  -- teachers take attendance, run exams, write marks, and build materials and mock tests
  foreach t in array array['sessions','attendance','exams','exam_results','materials','mock_tests','mock_questions'] loop
    execute format('drop policy if exists "staff select %1$s" on public.%1$s', t);
    execute format('create policy "staff select %1$s" on public.%1$s for select using (public.is_member())', t);
    execute format('drop policy if exists "staff insert %1$s" on public.%1$s', t);
    execute format('create policy "staff insert %1$s" on public.%1$s for insert with check (public.is_member())', t);
    execute format('drop policy if exists "staff update %1$s" on public.%1$s', t);
    execute format('create policy "staff update %1$s" on public.%1$s for update using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;
drop policy if exists "staff select mock_attempts" on public.mock_attempts;
create policy "staff select mock_attempts" on public.mock_attempts for select using (public.is_member());
drop policy if exists "staff select holidays" on public.holidays;
create policy "staff select holidays" on public.holidays for select using (public.is_member());

-- study materials files (and listening audio for mock tests)
drop policy if exists "staff read materials" on storage.objects;
create policy "staff read materials" on storage.objects for select using (bucket_id = 'materials' and public.is_member());
drop policy if exists "staff upload materials" on storage.objects;
create policy "staff upload materials" on storage.objects for insert with check (bucket_id = 'materials' and public.is_member());
drop policy if exists "staff update materials" on storage.objects;
create policy "staff update materials" on storage.objects for update using (bucket_id = 'materials' and public.is_member());

-- teacher names for the attendance page
create or replace view public.teacher_list as
  select id, name, levels, active from public.teachers where public.is_member();
revoke all on public.teacher_list from public, anon;
grant select on public.teacher_list to authenticated;

-- class list for teachers: no phone, address, NID/passport, guardian, fees or notes
create or replace view public.student_roster as
  select id, admission_no, admission_date, name_bn, name_en, gender, package, current_level, batch, status, start_date, japan_stage, created_at
  from public.students where public.is_member();
revoke all on public.student_roster from public, anon;
grant select on public.student_roster to authenticated;

-- the student site: any portal login (teachers too) is told it is a staff login
create or replace function public.link_student(p_admission_no text, p_phone text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); ph text; s public.students;
begin
  if uid is null then return 'login'; end if;
  if public.is_member() then return 'staff'; end if;
  if exists (select 1 from public.students where auth_user_id = uid) then return 'already'; end if;
  if (select count(*) from public.student_link_attempts where user_id = uid and not ok and at > now() - interval '1 hour') >= 5 then return 'busy'; end if;
  ph := right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 10);
  if length(ph) < 10 then return 'bad_phone'; end if;
  select * into s from public.students
   where upper(btrim(admission_no)) = upper(btrim(coalesce(p_admission_no, '')))
     and (right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10) = ph
          or right(regexp_replace(coalesce(guardian_phone, ''), '[^0-9]', '', 'g'), 10) = ph)
   limit 1;
  if not found then
    insert into public.student_link_attempts (user_id, ok) values (uid, false);
    return 'not_found';
  end if;
  if s.auth_user_id is not null and s.auth_user_id <> uid then return 'taken'; end if;
  update public.students set auth_user_id = uid where id = s.id;
  insert into public.student_link_attempts (user_id, ok) values (uid, true);
  return 'ok';
end $$;

create or replace function public.student_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.students; st jsonb; why text; lv text[]; mats jsonb; counts jsonb;
begin
  if uid is null then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  select * into s from public.students where auth_user_id = uid;
  if not found then
    return jsonb_build_object('linked', false, 'staff', public.is_member(),
      'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp'));
  end if;
  why := public.student_block_reason(s);
  lv := public.student_levels(s.package, s.current_level);
  select coalesce(jsonb_object_agg(level, n), '{}'::jsonb) into counts
    from (select level, count(*) n from public.materials where published and (level = 'all' or level = any(lv)) group by level) c;
  if why is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'level', level, 'kind', kind, 'chapter', chapter,
                                                 'description', description, 'file_path', file_path, 'file_name', file_name,
                                                 'size_bytes', size_bytes, 'url', url)
                              order by case level when 'all' then 0 when 'N5' then 1 when 'N4' then 2 else 3 end, sort_order, chapter, title), '[]'::jsonb)
      into mats from public.materials where published and (level = 'all' or level = any(lv));
  else mats := '[]'::jsonb; end if;
  return jsonb_build_object('linked', true,
    'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp'),
    'student', jsonb_build_object('name_bn', s.name_bn, 'name_en', s.name_en, 'admission_no', s.admission_no, 'package', s.package,
                                  'current_level', s.current_level, 'batch', s.batch, 'status', s.status, 'next_due_date', s.next_due_date),
    'levels', to_jsonb(lv), 'fee', public.student_fee_state(s.id), 'blocked', why, 'counts', counts, 'materials', mats);
end $$;

