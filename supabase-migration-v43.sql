-- Sakura Portal v43 · mock tests open one at a time.
-- In each level and section (full / kanji / grammar / listening), a student can start a test only after
-- finishing (submitting) the published test just above it in the list. Retaking a finished test is always allowed.
-- The director's preview on the student site is not limited (that happens in the app; the preview saves nothing).
-- Safe to run more than once.
create or replace function public.mock_prev_unfinished(p_student uuid, p_test uuid) returns text
language sql stable security definer set search_path = public as $$
  select p.title from public.mock_tests t
    join lateral (select x.id, x.title from public.mock_tests x
                  where x.published and x.level = t.level and x.category = t.category and x.id <> t.id
                    and exists (select 1 from public.mock_questions q where q.test_id = x.id)
                    and (coalesce(x.sort_order, 0), x.created_at) < (coalesce(t.sort_order, 0), t.created_at)
                  order by coalesce(x.sort_order, 0) desc, x.created_at desc limit 1) p on true
  where t.id = p_test and t.category in ('full','kanji','grammar','listening')
    and not exists (select 1 from public.mock_attempts a where a.test_id = p.id and a.student_id = p_student and a.submitted_at is not null)
    and not exists (select 1 from public.mock_attempts a where a.test_id = t.id and a.student_id = p_student and a.submitted_at is not null);
$$;
revoke all on function public.mock_prev_unfinished(uuid, uuid) from public, anon, authenticated;

create or replace function public.student_mock_start(p_test uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; t public.mock_tests; a public.mock_attempts; o record; done integer; closed uuid;
begin
  s := public.mock_student(); t := public.mock_test_for(s, p_test);
  if public.mock_prev_unfinished(s.id, t.id) is not null then raise exception 'in_order'; end if;
  for o in select id, deadline from public.mock_attempts where student_id = s.id and submitted_at is null loop
    perform public.mock_grade(o.id, case when o.deadline < now() then 'timeout' else 'left' end);
    if closed is null then closed := o.id; end if;
  end loop;
  select count(*) into done from public.mock_attempts where test_id = t.id and student_id = s.id and submitted_at is not null;
  if t.max_attempts is not null and done >= t.max_attempts then raise exception 'limit'; end if;
  if (select count(*) from public.mock_attempts where student_id = s.id and started_at > now() - interval '1 hour') >= 20 then raise exception 'busy'; end if;
  insert into public.mock_attempts (test_id, student_id, deadline) values (t.id, s.id, now() + make_interval(mins => t.duration_min)) returning * into a;
  return jsonb_build_object('attempt_id', a.id, 'deadline', a.deadline, 'now', now(), 'answers', a.answers, 'closed_previous', closed,
    'test', jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'duration_min', t.duration_min, 'pass_pct', t.pass_pct),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'section', q.section, 'passage', q.passage, 'question', q.question,
                            'options', q.options, 'script', q.script, 'audio_path', q.audio_path)
                          order by public.mock_section_rank(q.section), q.sort_order, q.created_at) from public.mock_questions q where q.test_id = t.id), '[]'::jsonb));
end $$;
revoke all on function public.student_mock_start(uuid) from public, anon;
grant execute on function public.student_mock_start(uuid) to authenticated;

select 'ROWS:SAKURA_V43_OK' as result;
