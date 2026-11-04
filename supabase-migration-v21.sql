-- =====================================================================
-- Sakura Portal · v21: daily study and streaks on the student site
-- * student_days — one row for each day a student studied (finished "আজকের পড়া" or a mock test)
-- * student_checkin() — the student marks today as studied; returns the streak
-- * student_streak()  — current streak, best streak, whether today is done, last 14 days
-- * every finished online mock test also counts as a study day (trigger)
-- Days follow Bangladesh time (Asia/Dhaka). Safe to run more than once.
-- =====================================================================

create table if not exists public.student_days (
  student_id uuid not null references public.students(id) on delete cascade,
  day date not null,
  kind text not null default 'daily',
  created_at timestamptz not null default now(),
  primary key (student_id, day)
);
alter table public.student_days enable row level security;
grant select on public.student_days to authenticated;
drop policy if exists "member select student_days" on public.student_days;
create policy "member select student_days" on public.student_days for select using (public.is_member());

create or replace function public.bd_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Dhaka')::date $$;

create or replace function public.streak_of(p_student uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cur integer := 0; best integer := 0; today date := public.bd_today(); r record; done_today boolean;
begin
  if not (public.is_member() or exists (select 1 from public.students where id = p_student and auth_user_id = auth.uid())) then return null; end if;
  select exists (select 1 from public.student_days where student_id = p_student and day = today) into done_today;
  -- islands of consecutive days
  for r in select min(day) as a, max(day) as b, count(*)::int as n
             from (select day, day - (row_number() over (order by day))::int as g from public.student_days where student_id = p_student) x
            group by g loop
    best := greatest(best, r.n);
    if r.b >= today - 1 then cur := r.n; end if;
  end loop;
  return jsonb_build_object('streak', cur, 'best', best, 'today', done_today, 'today_date', today,
    'days', coalesce((select jsonb_agg(day order by day) from public.student_days where student_id = p_student and day > today - 14), '[]'::jsonb),
    'total', (select count(*) from public.student_days where student_id = p_student));
end $$;

create or replace function public.student_streak() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return null; end if;
  return public.streak_of(sid);
end $$;

create or replace function public.student_checkin(p_kind text default 'daily') returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return null; end if;
  insert into public.student_days (student_id, day, kind) values (sid, public.bd_today(), case when p_kind in ('daily','mock') then p_kind else 'daily' end)
  on conflict (student_id, day) do nothing;
  return public.streak_of(sid);
end $$;

-- a finished online mock test is a study day too
create or replace function public.mock_attempt_day() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.submitted_at is not null and (tg_op = 'INSERT' or old.submitted_at is null) then
    insert into public.student_days (student_id, day, kind) values (new.student_id, (new.submitted_at at time zone 'Asia/Dhaka')::date, 'mock')
    on conflict (student_id, day) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists mock_attempt_day on public.mock_attempts;
create trigger mock_attempt_day after insert or update of submitted_at on public.mock_attempts for each row execute function public.mock_attempt_day();

revoke all on function public.streak_of(uuid) from public;
revoke all on function public.student_streak() from public;
revoke all on function public.student_checkin(text) from public;
grant execute on function public.student_streak() to authenticated;
grant execute on function public.student_checkin(text) to authenticated;
grant execute on function public.streak_of(uuid) to authenticated;

select 'SAKURA_V21_OK' as result;
