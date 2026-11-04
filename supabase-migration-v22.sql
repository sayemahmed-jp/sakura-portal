-- =====================================================================
-- Sakura Portal · v22: "আমার উন্নতি" on the student site
-- * student_mock_history() also returns each attempt's section scores (sections) and
--   the test's kind (category), so the student site can draw progress and weak sections.
-- Safe to run more than once.
-- =====================================================================
create or replace function public.student_mock_history() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  begin s := public.mock_student(); exception when others then return '[]'::jsonb; end;
  return coalesce((select jsonb_agg(jsonb_build_object('attempt_id', a.id, 'test_id', a.test_id, 'title', t.title, 'level', t.level, 'category', t.category, 'pass_pct', t.pass_pct,
      'started_at', a.started_at, 'submitted_at', a.submitted_at, 'score', a.score, 'total', a.total, 'answered', a.answered, 'end_reason', a.end_reason, 'sections', a.sections)
      order by a.submitted_at desc)
    from public.mock_attempts a join public.mock_tests t on t.id = a.test_id
    where a.student_id = s.id and a.submitted_at is not null), '[]'::jsonb);
end $$;
select 'SAKURA_V22_OK' as result;
