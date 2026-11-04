-- =====================================================================
-- Sakura Portal · v27: নোটিশ বোর্ড (notice board)
-- * notices — written in the portal by the director, office staff or teachers;
--   each notice can go to everyone or to one level and/or one batch, can be pinned,
--   hidden, and can end on a date (it disappears from the student site after that day)
-- * student_notices() — what a linked student sees: current notices for their levels and batch
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  body text not null default '',
  level text not null default 'all' check (level in ('all','N5','N4','N3')),
  batch text not null default 'all' check (batch in ('all','morning','evening')),
  pinned boolean not null default false,
  published boolean not null default true,
  ends_on date,
  created_by uuid default auth.uid(),
  author text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notices_created_idx on public.notices(created_at desc);
alter table public.notices enable row level security;
grant select, insert, update, delete on public.notices to authenticated;
drop policy if exists "member all notices" on public.notices;
create policy "member all notices" on public.notices for all using (public.is_member()) with check (public.is_member());
drop trigger if exists audit_notices on public.notices;
create trigger audit_notices after insert or update or delete on public.notices for each row execute function public.audit_trigger();

create or replace function public.student_notices() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; lv text[];
begin
  if public.is_member() then
    return coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'level', n.level, 'batch', n.batch, 'pinned', n.pinned,
              'ends_on', n.ends_on, 'author', n.author, 'created_at', n.created_at) order by n.pinned desc, n.created_at desc)
      from public.notices n where n.published and (n.ends_on is null or n.ends_on >= (now() at time zone 'Asia/Dhaka')::date)), '[]'::jsonb);
  end if;
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or s.status = 'dropped' then return '[]'::jsonb; end if;
  lv := public.student_levels(s.package, s.current_level);
  return coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'level', n.level, 'batch', n.batch, 'pinned', n.pinned,
            'ends_on', n.ends_on, 'author', n.author, 'created_at', n.created_at) order by n.pinned desc, n.created_at desc)
    from public.notices n
   where n.published and (n.ends_on is null or n.ends_on >= (now() at time zone 'Asia/Dhaka')::date)
     and (n.level = 'all' or n.level = any(lv)) and (n.batch = 'all' or n.batch = s.batch)), '[]'::jsonb);
end $$;
revoke all on function public.student_notices() from public;
grant execute on function public.student_notices() to authenticated;
select 'SAKURA_V27_OK' as result;
