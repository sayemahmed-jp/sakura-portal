-- =====================================================================
-- Sakura Portal · v33: ভিডিও ক্লাস on the student site
-- * video_views — which video lessons a student has opened and watched to the end
-- * student_video_seen(material, done) — the student site records a view; a lesson watched to the end
--   also counts as a study day (same as "আজকের পড়া")
-- * student_video_views() — the student's own list, for the ✓ marks
-- Portal logins can read every row (the materials page shows how many watched each video).
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.video_views (
  student_id uuid not null references public.students(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  times integer not null default 1,
  done boolean not null default false,
  primary key (student_id, material_id)
);
alter table public.video_views enable row level security;
grant select on public.video_views to authenticated;
drop policy if exists "member select video_views" on public.video_views;
create policy "member select video_views" on public.video_views for select using (public.is_member());

create or replace function public.student_video_seen(p_material uuid, p_done boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; m public.materials;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or public.student_block_reason(s) is not null then return null; end if;
  select * into m from public.materials where id = p_material and published and kind = 'video';
  if not found or not (m.level = 'all' or m.level = any(public.student_levels(s.package, s.current_level))) then return null; end if;
  insert into public.video_views (student_id, material_id, done) values (s.id, m.id, coalesce(p_done, false))
  on conflict (student_id, material_id) do update set last_at = now(),
    times = public.video_views.times + case when coalesce(p_done, false) then 0 else 1 end,
    done = public.video_views.done or coalesce(p_done, false);
  if coalesce(p_done, false) then
    insert into public.student_days (student_id, day, kind) values (s.id, public.bd_today(), 'video') on conflict (student_id, day) do nothing;
  end if;
  return public.student_video_views();
end $$;

create or replace function public.student_video_views() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', v.material_id, 'done', v.done, 'last_at', v.last_at)) from public.video_views v where v.student_id = sid), '[]'::jsonb);
end $$;

revoke all on function public.student_video_seen(uuid, boolean) from public;
revoke all on function public.student_video_views() from public;
grant execute on function public.student_video_seen(uuid, boolean) to authenticated;
grant execute on function public.student_video_views() to authenticated;
select 'SAKURA_V33_OK' as result;
