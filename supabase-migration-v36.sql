-- =====================================================================
-- Sakura Portal · v36: ক্লাসের মতামত (a short monthly class survey on the student site)
-- * class_feedback — one answer per student per month: overall and explanation (1–5 stars), pace,
--   amount of homework, what they like and what should improve
-- * only the director and office staff can read it (teachers cannot), and the portal shows it
--   without names, so students can be honest
-- * student_feedback() / student_feedback_save(...) — what the student site uses
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.class_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  level text not null default '',
  batch text not null default '',
  overall smallint not null check (overall between 1 and 5),
  explain smallint not null check (explain between 1 and 5),
  pace text not null default 'ok' check (pace in ('slow','ok','fast')),
  homework text not null default 'ok' check (homework in ('less','ok','more')),
  liked text not null default '',
  improve text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, period)
);
alter table public.class_feedback enable row level security;
grant select, delete on public.class_feedback to authenticated;
drop policy if exists "office select class_feedback" on public.class_feedback;
create policy "office select class_feedback" on public.class_feedback for select using (public.is_staff());
drop policy if exists "admin delete class_feedback" on public.class_feedback;
create policy "admin delete class_feedback" on public.class_feedback for delete using (public.is_admin());

create or replace function public.student_feedback() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid; per text := to_char(public.bd_today(), 'YYYY-MM'); f public.class_feedback;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return null; end if;
  select * into f from public.class_feedback where student_id = sid and period = per;
  return jsonb_build_object('period', per, 'mine', case when f.id is null then null else jsonb_build_object('overall', f.overall, 'explain', f.explain, 'pace', f.pace,
    'homework', f.homework, 'liked', f.liked, 'improve', f.improve, 'updated_at', f.updated_at) end);
end $$;

create or replace function public.student_feedback_save(p_overall int, p_explain int, p_pace text, p_homework text, p_liked text, p_improve text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; per text := to_char(public.bd_today(), 'YYYY-MM');
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or s.status = 'dropped' then raise exception 'not_linked'; end if;
  if p_overall not between 1 and 5 or p_explain not between 1 and 5 then raise exception 'bad_rating'; end if;
  if p_pace not in ('slow','ok','fast') or p_homework not in ('less','ok','more') then raise exception 'bad_rating'; end if;
  insert into public.class_feedback (student_id, period, level, batch, overall, explain, pace, homework, liked, improve)
  values (s.id, per, coalesce(s.current_level, ''), coalesce(s.batch, ''), p_overall, p_explain, p_pace, p_homework, left(btrim(coalesce(p_liked, '')), 600), left(btrim(coalesce(p_improve, '')), 600))
  on conflict (student_id, period) do update set level = excluded.level, batch = excluded.batch, overall = excluded.overall, explain = excluded.explain, pace = excluded.pace,
    homework = excluded.homework, liked = excluded.liked, improve = excluded.improve, updated_at = now();
  return public.student_feedback();
end $$;
revoke all on function public.student_feedback() from public;
revoke all on function public.student_feedback_save(int, int, text, text, text, text) from public;
grant execute on function public.student_feedback() to authenticated;
grant execute on function public.student_feedback_save(int, int, text, text, text, text) to authenticated;
select 'SAKURA_V36_OK' as result;
