-- =====================================================================
-- Sakura Portal · v29: সাপ্তাহিক র‍্যাঙ্কিং (weekly leaderboard) on the student site
-- * student_leaderboard() — this week (Saturday to Friday, Bangladesh time), among active students
--   of the same level as the asking student:
--     regular — most study days (daily study, flashcards, mock tests), then most mock tests
--     best    — best mock-test score this week (at least one finished test)
--   Only the first name is shown (common prefixes like মোঃ / Md. are skipped), so classmates see who is doing well without any other details.
-- Safe to run more than once.
-- =====================================================================
create or replace function public.student_leaderboard(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.students; lv text; ws date; today date := (now() at time zone 'Asia/Dhaka')::date; member boolean := coalesce(public.is_member(), false);
begin
  if not member then
    select * into me from public.students where auth_user_id = auth.uid();
    if not found then return null; end if;
  end if;
  lv := coalesce(nullif(p_level, ''), me.current_level, 'N5');
  ws := today - ((extract(dow from today)::int + 1) % 7);   -- the Saturday this week started
  return (
    with pool as (
      select s.id, split_part(regexp_replace(btrim(coalesce(nullif(s.name_bn, ''), s.name_en, '')), '^((মোঃ|মোঃ|মো:|মো\.|মোহাম্মদ|মুহাম্মদ|মোহাম্মাদ|মোছাঃ|মোসাঃ|মোছা:|মোসাম্মৎ|মোছাম্মৎ|Md\.?|Mst\.?|Mohammad|Muhammad|Mohammed)\s+)+', '', 'i'), ' ', 1) as name
        from public.students s
       where s.current_level = lv and coalesce(s.status, '') not in ('dropped', 'completed')),
    days as (select d.student_id, count(*)::int as n from public.student_days d where d.day between ws and today group by d.student_id),
    tests as (select a.student_id, count(*)::int as n, max(round(a.score * 100.0 / nullif(a.total, 0)))::int as best
                from public.mock_attempts a where a.submitted_at is not null and (a.submitted_at at time zone 'Asia/Dhaka')::date between ws and today and a.total > 0
               group by a.student_id),
    rows as (select p.id, p.name, coalesce(d.n, 0) as days, coalesce(t.n, 0) as mocks, t.best from pool p left join days d on d.student_id = p.id left join tests t on t.student_id = p.id)
    select jsonb_build_object('level', lv, 'week_start', ws, 'today', today, 'students', (select count(*) from pool),
      'regular', coalesce((select jsonb_agg(jsonb_build_object('name', r.name, 'days', r.days, 'mocks', r.mocks, 'me', r.id = me.id) order by r.days desc, r.mocks desc, r.name)
                           from (select * from rows where days > 0 or mocks > 0 order by days desc, mocks desc, name limit 10) r), '[]'::jsonb),
      'best', coalesce((select jsonb_agg(jsonb_build_object('name', r.name, 'pct', r.best, 'mocks', r.mocks, 'me', r.id = me.id) order by r.best desc, r.mocks desc, r.name)
                        from (select * from rows where best is not null order by best desc, mocks desc, name limit 10) r), '[]'::jsonb),
      'me', case when me.id is null then null else (select jsonb_build_object('days', r.days, 'mocks', r.mocks, 'best', r.best,
              'rank', (select count(*) + 1 from rows x where x.days > r.days or (x.days = r.days and x.mocks > r.mocks))) from rows r where r.id = me.id) end)
  );
end $$;
revoke all on function public.student_leaderboard(text) from public;
grant execute on function public.student_leaderboard(text) to authenticated;
select 'SAKURA_V29_OK' as result;
