-- Sakura Portal v46 · office tools
-- * office_questions — questions a visitor, lead or student asked that the office could not answer on the spot.
--   The office writes the question and the date it promised an answer; the director answers in the portal;
--   the office tells the person and marks it told.
-- * exam_regs — which student sits which outside exam (JLPT, NAT-TEST, JFT-Basic …), the registration deadline,
--   whether registered / fee paid / admit card, and the result. The portal reminds the office before deadlines.
-- * cash_deposits — cash the office took to the bank. Cash received minus deposits = cash in the office;
--   the portal reminds the office to bank it at the limit set in Settings (default 50,000).
-- Office staff and the director can read and write these; teachers cannot. Every change goes to the audit log.
-- Safe to run more than once.

create table if not exists public.office_questions (
  id uuid primary key default gen_random_uuid(),
  asked_on date not null default current_date,
  person text not null default '',
  phone text not null default '',
  student_id uuid references public.students(id) on delete set null,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  question text not null check (length(btrim(question)) > 0),
  context text not null default '',
  promise_by date,
  answer text not null default '',
  answered_by text not null default '',
  answered_at timestamptz,
  told_at timestamptz,
  told_by text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists office_questions_open_idx on public.office_questions(told_at, answered_at);

create table if not exists public.exam_regs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  exam text not null default 'nat' check (exam in ('jlpt','nat','jft','jtest','topj','other')),
  level text not null default '',
  exam_date date,
  reg_deadline date,
  status text not null default 'planned' check (status in ('planned','registered','admit','done','missed')),
  fee_paid boolean not null default false,
  result text not null default '' check (result in ('','pass','fail','absent')),
  score text not null default '',
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists exam_regs_student_idx on public.exam_regs(student_id);
create index if not exists exam_regs_deadline_idx on public.exam_regs(reg_deadline);

create table if not exists public.cash_deposits (
  id uuid primary key default gen_random_uuid(),
  deposited_on date not null default current_date,
  amount integer not null check (amount > 0),
  bank text not null default '',
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['office_questions','exam_regs','cash_deposits'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "staff read %1$s" on public.%1$I', t);
    execute format('create policy "staff read %1$s" on public.%1$I for select using (public.is_staff())', t);
    execute format('drop policy if exists "staff add %1$s" on public.%1$I', t);
    execute format('create policy "staff add %1$s" on public.%1$I for insert with check (public.is_staff())', t);
    execute format('drop policy if exists "staff edit %1$s" on public.%1$I', t);
    execute format('create policy "staff edit %1$s" on public.%1$I for update using (public.is_staff()) with check (public.is_staff())', t);
    execute format('drop policy if exists "director delete %1$s" on public.%1$I', t);
    execute format('create policy "director delete %1$s" on public.%1$I for delete using (public.is_admin())', t);
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_trigger()', t);
  end loop; end $$;

-- a deposit, once saved, can be changed only by the director (the office can add; mistakes go through the director)
drop policy if exists "staff edit cash_deposits" on public.cash_deposits;
drop policy if exists "director edit cash_deposits" on public.cash_deposits;
create policy "director edit cash_deposits" on public.cash_deposits for update using (public.is_admin()) with check (public.is_admin());

select 'SAKURA_V46_OK' as result;
