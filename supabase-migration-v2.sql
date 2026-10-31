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

select 'SAKURA_V2_OK' as result;
