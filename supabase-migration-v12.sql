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

select 'SAKURA_V12_OK' as result;
