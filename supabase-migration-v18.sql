-- =====================================================================
-- Sakura Portal · v18: exam honesty and records for online mock tests
-- * an attempt now records HOW it ended: submit (জমা), timeout (সময় শেষ), left (পাতা ছেড়ে গেছে)
--   and how many questions were answered, so correct / wrong / blank are known
-- * leaving the exam page ends the attempt (student_mock_leave); an attempt is never resumed —
--   coming back later closes the open attempt with what was saved, and a new start is a new attempt
-- * student_mock_history() — the student's own list of every attempt (their result record)
-- Safe to run more than once.
-- =====================================================================

alter table public.mock_attempts add column if not exists end_reason text check (end_reason is null or end_reason in ('submit','timeout','left'));
alter table public.mock_attempts add column if not exists answered integer;

-- grade one attempt (stores the result) and return the review
create or replace function public.mock_grade(p_attempt uuid, p_reason text default 'submit') returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare a public.mock_attempts; t public.mock_tests; sc integer := 0; tot integer := 0; ans integer := 0; secs jsonb := '{}'::jsonb; q record; v text; ok boolean; ex uuid; best integer;
begin
  select * into a from public.mock_attempts where id = p_attempt;
  select * into t from public.mock_tests where id = a.test_id;
  if a.submitted_at is null then
    for q in select id, section, correct from public.mock_questions where test_id = a.test_id loop
      v := a.answers ->> q.id::text;
      ok := v is not null and v ~ '^[0-3]$' and v::int = q.correct;
      tot := tot + 1; if ok then sc := sc + 1; end if; if v is not null and v ~ '^[0-3]$' then ans := ans + 1; end if;
      secs := jsonb_set(secs, array[q.section], jsonb_build_object(
        'score', coalesce((secs -> q.section ->> 'score')::int, 0) + case when ok then 1 else 0 end,
        'total', coalesce((secs -> q.section ->> 'total')::int, 0) + 1));
    end loop;
    update public.mock_attempts
       set submitted_at = least(now(), deadline + interval '2 minutes'), score = sc, total = tot, answered = ans, sections = secs,
           end_reason = case when now() > deadline + interval '30 seconds' and coalesce(p_reason, 'submit') <> 'left' then 'timeout'
                             when p_reason in ('submit','timeout','left') then p_reason else 'submit' end
     where id = a.id returning * into a;
    if tot > 0 then
      ex := t.exam_id;
      if ex is null or not exists (select 1 from public.exams where id = ex) then
        insert into public.exams (exam_date, title, type, level, batch, max_marks, pass_marks, created_by)
        values (current_date, 'অনলাইন মক: ' || t.title, 'mock', t.level, 'all', tot, ceil(tot * t.pass_pct / 100.0), null) returning id into ex;
        update public.mock_tests set exam_id = ex where id = t.id;
      else
        update public.exams set max_marks = tot, pass_marks = ceil(tot * t.pass_pct / 100.0) where id = ex and max_marks <> tot;
      end if;
      select max(score) into best from public.mock_attempts where test_id = t.id and student_id = a.student_id and submitted_at is not null;
      insert into public.exam_results (exam_id, student_id, marks, absent, note, updated_at)
      values (ex, a.student_id, best, false, 'অনলাইনে দিয়েছে (সেরা নম্বর)', now())
      on conflict (exam_id, student_id) do update set marks = excluded.marks, absent = false, note = excluded.note, updated_at = now();
    end if;
  end if;
  return public.mock_review_of(a.id);
end $$;

-- the older one-argument version is replaced by the one above (its second argument has a default)
drop function if exists public.mock_grade(uuid);

create or replace function public.mock_review_of(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.mock_attempts; t public.mock_tests;
begin
  select * into a from public.mock_attempts where id = p_attempt;
  select * into t from public.mock_tests where id = a.test_id;
  return jsonb_build_object('attempt_id', a.id, 'test', jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'pass_pct', t.pass_pct),
    'started_at', a.started_at, 'submitted_at', a.submitted_at, 'score', a.score, 'total', a.total, 'answered', a.answered, 'end_reason', a.end_reason, 'sections', a.sections,
    'passed', a.total > 0 and a.score * 100 >= t.pass_pct * a.total, 'show_answers', t.show_answers,
    'questions', case when t.show_answers then coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'section', q.section, 'passage', q.passage, 'question', q.question,
                         'options', q.options, 'script', q.script, 'correct', q.correct, 'explanation', q.explanation, 'mine', a.answers -> q.id::text)
                         order by public.mock_section_rank(q.section), q.sort_order, q.created_at) from public.mock_questions q where q.test_id = t.id), '[]'::jsonb) else '[]'::jsonb end);
end $$;

-- start: an attempt is never resumed — an open one is closed first (left / timeout), then a new one begins
create or replace function public.student_mock_start(p_test uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; t public.mock_tests; a public.mock_attempts; o record; done integer; closed uuid;
begin
  s := public.mock_student(); t := public.mock_test_for(s, p_test);
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

create or replace function public.student_mock_submit(p_attempt uuid, p_answers jsonb, p_reason text default 'submit') returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  if not exists (select 1 from public.mock_attempts where id = p_attempt and student_id = s.id) then raise exception 'not_found'; end if;
  perform public.student_mock_save(p_attempt, p_answers);
  return public.mock_grade(p_attempt, case when p_reason in ('submit','timeout','left') then p_reason else 'submit' end);
end $$;
drop function if exists public.student_mock_submit(uuid, jsonb);

-- the student left the exam page: save what they had and end the attempt now
create or replace function public.student_mock_leave(p_attempt uuid, p_answers jsonb) returns text
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  if not exists (select 1 from public.mock_attempts where id = p_attempt and student_id = s.id and submitted_at is null) then return 'closed'; end if;
  perform public.student_mock_save(p_attempt, p_answers);
  perform public.mock_grade(p_attempt, 'left');
  return 'ok';
end $$;

-- the student's own record: every finished attempt, newest first
create or replace function public.student_mock_history() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  begin s := public.mock_student(); exception when others then return '[]'::jsonb; end;
  return coalesce((select jsonb_agg(jsonb_build_object('attempt_id', a.id, 'test_id', a.test_id, 'title', t.title, 'level', t.level, 'pass_pct', t.pass_pct,
      'started_at', a.started_at, 'submitted_at', a.submitted_at, 'score', a.score, 'total', a.total, 'answered', a.answered, 'end_reason', a.end_reason)
      order by a.submitted_at desc)
    from public.mock_attempts a join public.mock_tests t on t.id = a.test_id
    where a.student_id = s.id and a.submitted_at is not null), '[]'::jsonb);
end $$;

-- the list no longer offers to "continue" — every start is a fresh attempt
create or replace function public.student_mock_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  begin s := public.mock_student(); exception when others then return '[]'::jsonb; end;
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'description', t.description,
      'duration_min', t.duration_min, 'pass_pct', t.pass_pct, 'max_attempts', t.max_attempts,
      'questions', (select count(*) from public.mock_questions q where q.test_id = t.id),
      'attempts', (select count(*) from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null),
      'best', (select max(score) from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null),
      'last_attempt', (select id from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null order by a.submitted_at desc limit 1),
      'open_attempt', null)
    order by case t.level when 'N5' then 1 when 'N4' then 2 else 3 end, t.sort_order, t.created_at)
    from public.mock_tests t where t.published and t.level = any(public.student_levels(s.package, s.current_level))
      and exists (select 1 from public.mock_questions q where q.test_id = t.id)), '[]'::jsonb);
end $$;

revoke all on function public.mock_grade(uuid, text) from public;
revoke all on function public.student_mock_submit(uuid, jsonb, text) from public;
revoke all on function public.student_mock_leave(uuid, jsonb) from public;
revoke all on function public.student_mock_history() from public;
grant execute on function public.student_mock_submit(uuid, jsonb, text) to authenticated;
grant execute on function public.student_mock_leave(uuid, jsonb) to authenticated;
grant execute on function public.student_mock_history() to authenticated;

select 'SAKURA_V18_OK' as result;
