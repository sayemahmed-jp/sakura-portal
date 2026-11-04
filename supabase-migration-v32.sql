-- =====================================================================
-- Sakura Portal · v32: ক্লাসের রুটিন on the student site
-- * class_plans — what a coming class will cover (date, level, batch, topic, note) and, for an online class,
--   its link; written by the director, office staff or teachers in the portal calendar
-- * student_routine() — for the linked student: weekly class days, their batch, the next classes (holidays
--   left out), the plans, recent class topics, and the institute's standing online-class link
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.class_plans (
  id uuid primary key default gen_random_uuid(),
  class_date date not null,
  level text not null check (level in ('N5','N4','N3')),
  batch text not null default 'all' check (batch in ('all','morning','evening')),
  topic text not null default '',
  note text not null default '',
  online_link text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists class_plans_date_idx on public.class_plans(class_date);
alter table public.class_plans enable row level security;
grant select, insert, update, delete on public.class_plans to authenticated;
drop policy if exists "member all class_plans" on public.class_plans;
create policy "member all class_plans" on public.class_plans for all using (public.is_member()) with check (public.is_member());

create or replace function public.student_routine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; st jsonb; today date := (now() at time zone 'Asia/Dhaka')::date;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  return jsonb_build_object('today', today, 'level', s.current_level, 'batch', s.batch,
    'class_days', coalesce(st -> 'class_days', '[0,1,2,3,4,6]'::jsonb), 'online_link', coalesce(st ->> 'online_link', ''),
    'times', jsonb_build_object('morning', coalesce(st ->> 'time_morning', ''), 'evening', coalesce(st ->> 'time_evening', '')),
    'holidays', coalesce((select jsonb_agg(jsonb_build_object('date', h.on_date, 'title', h.title, 'batch', h.batch) order by h.on_date)
                           from public.holidays h where h.on_date between today and today + 45 and (h.batch = 'all' or h.batch = s.batch)), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('date', p.class_date, 'topic', p.topic, 'note', p.note, 'online_link', p.online_link) order by p.class_date)
                        from public.class_plans p where p.class_date between today and today + 45 and p.level = s.current_level and (p.batch = 'all' or p.batch = s.batch)), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('date', x.class_date, 'topic', x.topic, 'class_no', x.class_no) order by x.class_date desc)
                         from (select * from public.sessions se where se.level = s.current_level and se.batch = s.batch and se.class_date <= today order by se.class_date desc limit 8) x), '[]'::jsonb));
end $$;
revoke all on function public.student_routine() from public;
grant execute on function public.student_routine() to authenticated;
select 'SAKURA_V32_OK' as result;
