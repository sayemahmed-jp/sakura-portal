-- =====================================================================
-- Sakura Portal · v15: online mock tests (অনলাইন মক টেস্ট)
-- * mock_tests      — a test for one level, with a time limit
-- * mock_questions  — 4-choice questions: vocab / grammar / reading / listening
--                     (listening plays an uploaded audio file, or reads a Japanese script aloud)
-- * mock_attempts   — one student's sitting; graded on the server
-- * Students never receive the correct answers before they submit, and only
--   take tests for their own levels when the full course fee is paid (same rule as materials).
-- * Each submission also writes the mark into "পরীক্ষা ও রেজাল্ট" (best mark is kept).
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  level text not null default 'N5' check (level in ('N5','N4','N3')),
  description text not null default '',
  duration_min integer not null default 30 check (duration_min between 1 and 300),
  pass_pct integer not null default 60 check (pass_pct between 0 and 100),
  show_answers boolean not null default true,
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  published boolean not null default false,
  sort_order integer not null default 0,
  exam_id uuid references public.exams(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.mock_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  section text not null default 'vocab' check (section in ('vocab','grammar','reading','listening')),
  sort_order integer not null default 0,
  passage text not null default '',
  question text not null default '',
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4),
  correct smallint not null check (correct between 0 and 3),
  explanation text not null default '',
  script text not null default '',
  audio_path text,
  created_at timestamptz not null default now()
);
create index if not exists mock_questions_test_idx on public.mock_questions(test_id, section, sort_order);

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  total integer,
  sections jsonb
);
create index if not exists mock_attempts_student_idx on public.mock_attempts(student_id, test_id);

alter table public.mock_tests enable row level security;
alter table public.mock_questions enable row level security;
alter table public.mock_attempts enable row level security;
grant select, insert, update, delete on public.mock_tests, public.mock_questions to authenticated;
grant select, delete on public.mock_attempts to authenticated;

do $$
declare t text;
begin
  foreach t in array array['mock_tests','mock_questions'] loop
    execute format('drop policy if exists "staff select %1$s" on public.%1$s', t);
    execute format('create policy "staff select %1$s" on public.%1$s for select using (public.is_staff())', t);
    execute format('drop policy if exists "staff insert %1$s" on public.%1$s', t);
    execute format('create policy "staff insert %1$s" on public.%1$s for insert with check (public.is_staff())', t);
    execute format('drop policy if exists "staff update %1$s" on public.%1$s', t);
    execute format('create policy "staff update %1$s" on public.%1$s for update using (public.is_staff()) with check (public.is_staff())', t);
    execute format('drop policy if exists "admin delete %1$s" on public.%1$s', t);
    execute format('create policy "admin delete %1$s" on public.%1$s for delete using (public.is_admin())', t);
  end loop;
end $$;
drop policy if exists "staff select mock_attempts" on public.mock_attempts;
create policy "staff select mock_attempts" on public.mock_attempts for select using (public.is_staff());
drop policy if exists "admin delete mock_attempts" on public.mock_attempts;
create policy "admin delete mock_attempts" on public.mock_attempts for delete using (public.is_admin());

drop trigger if exists audit_mock_tests on public.mock_tests;
create trigger audit_mock_tests after insert or update or delete on public.mock_tests for each row execute function public.audit_trigger();

-- ---------- helpers ----------
-- the logged-in student, only when they may use the student site right now
create or replace function public.mock_student() returns public.students
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  select * into s from public.students where auth_user_id = auth.uid() and auth.uid() is not null;
  if not found then raise exception 'not_linked'; end if;
  if public.student_block_reason(s) is not null then raise exception 'locked'; end if;
  return s;
end $$;

create or replace function public.mock_test_for(s public.students, p_test uuid) returns public.mock_tests
language plpgsql stable security definer set search_path = public as $$
declare t public.mock_tests;
begin
  select * into t from public.mock_tests where id = p_test and published and level = any(public.student_levels(s.package, s.current_level));
  if not found then raise exception 'not_found'; end if;
  return t;
end $$;

create or replace function public.mock_section_rank(p text) returns integer language sql immutable as $$
  select case p when 'vocab' then 1 when 'grammar' then 2 when 'reading' then 3 else 4 end;
$$;

-- grade one attempt (stores the result) and return the review
create or replace function public.mock_grade(p_attempt uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare a public.mock_attempts; t public.mock_tests; sc integer := 0; tot integer := 0; secs jsonb := '{}'::jsonb; q record; ok boolean; ex uuid; best integer;
begin
  select * into a from public.mock_attempts where id = p_attempt;
  select * into t from public.mock_tests where id = a.test_id;
  if a.submitted_at is null then
    for q in select id, section, correct from public.mock_questions where test_id = a.test_id loop
      ok := (a.answers ->> q.id::text) is not null and (a.answers ->> q.id::text) ~ '^[0-3]$' and (a.answers ->> q.id::text)::int = q.correct;
      tot := tot + 1; if ok then sc := sc + 1; end if;
      secs := jsonb_set(secs, array[q.section], jsonb_build_object(
        'score', coalesce((secs -> q.section ->> 'score')::int, 0) + case when ok then 1 else 0 end,
        'total', coalesce((secs -> q.section ->> 'total')::int, 0) + 1));
    end loop;
    update public.mock_attempts set submitted_at = least(now(), deadline + interval '2 minutes'), score = sc, total = tot, sections = secs where id = a.id returning * into a;
    -- write the best mark into the regular exam results
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
      values (ex, a.student_id, best, false, 'অনলাইনে দিয়েছে', now())
      on conflict (exam_id, student_id) do update set marks = excluded.marks, absent = false, note = excluded.note, updated_at = now();
    end if;
  end if;
  return public.mock_review_of(a.id);
end $$;

create or replace function public.mock_review_of(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.mock_attempts; t public.mock_tests;
begin
  select * into a from public.mock_attempts where id = p_attempt;
  select * into t from public.mock_tests where id = a.test_id;
  return jsonb_build_object('attempt_id', a.id, 'test', jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'pass_pct', t.pass_pct),
    'started_at', a.started_at, 'submitted_at', a.submitted_at, 'score', a.score, 'total', a.total, 'sections', a.sections,
    'passed', a.total > 0 and a.score * 100 >= t.pass_pct * a.total, 'show_answers', t.show_answers,
    'questions', case when t.show_answers then coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'section', q.section, 'passage', q.passage, 'question', q.question,
                         'options', q.options, 'script', q.script, 'correct', q.correct, 'explanation', q.explanation, 'mine', a.answers -> q.id::text)
                         order by public.mock_section_rank(q.section), q.sort_order, q.created_at) from public.mock_questions q where q.test_id = t.id), '[]'::jsonb) else '[]'::jsonb end);
end $$;

-- ---------- what the student site calls ----------
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
      'open_attempt', (select id from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is null and a.deadline > now() order by a.started_at desc limit 1))
    order by case t.level when 'N5' then 1 when 'N4' then 2 else 3 end, t.sort_order, t.created_at)
    from public.mock_tests t where t.published and t.level = any(public.student_levels(s.package, s.current_level))
      and exists (select 1 from public.mock_questions q where q.test_id = t.id)), '[]'::jsonb);
end $$;

create or replace function public.student_mock_start(p_test uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; t public.mock_tests; a public.mock_attempts; stale uuid; done integer;
begin
  s := public.mock_student(); t := public.mock_test_for(s, p_test);
  -- finish sittings whose time ran out (with whatever was saved)
  for stale in select id from public.mock_attempts where test_id = t.id and student_id = s.id and submitted_at is null and deadline + interval '2 minutes' < now() loop
    perform public.mock_grade(stale);
  end loop;
  select * into a from public.mock_attempts where test_id = t.id and student_id = s.id and submitted_at is null order by started_at desc limit 1;
  if not found then
    select count(*) into done from public.mock_attempts where test_id = t.id and student_id = s.id and submitted_at is not null;
    if t.max_attempts is not null and done >= t.max_attempts then raise exception 'limit'; end if;
    if (select count(*) from public.mock_attempts where student_id = s.id and started_at > now() - interval '1 hour') >= 20 then raise exception 'busy'; end if;
    insert into public.mock_attempts (test_id, student_id, deadline) values (t.id, s.id, now() + make_interval(mins => t.duration_min)) returning * into a;
  end if;
  return jsonb_build_object('attempt_id', a.id, 'deadline', a.deadline, 'now', now(), 'answers', a.answers,
    'test', jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'duration_min', t.duration_min, 'pass_pct', t.pass_pct),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'section', q.section, 'passage', q.passage, 'question', q.question,
                            'options', q.options, 'script', q.script, 'audio_path', q.audio_path)
                          order by public.mock_section_rank(q.section), q.sort_order, q.created_at) from public.mock_questions q where q.test_id = t.id), '[]'::jsonb));
end $$;

create or replace function public.student_mock_save(p_attempt uuid, p_answers jsonb) returns text
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  update public.mock_attempts set answers = coalesce(p_answers, '{}'::jsonb)
   where id = p_attempt and student_id = s.id and submitted_at is null and now() <= deadline + interval '2 minutes'
     and jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) = 'object' and length(coalesce(p_answers, '{}'::jsonb)::text) < 20000;
  return case when found then 'ok' else 'closed' end;
end $$;

create or replace function public.student_mock_submit(p_attempt uuid, p_answers jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  if not exists (select 1 from public.mock_attempts where id = p_attempt and student_id = s.id) then raise exception 'not_found'; end if;
  perform public.student_mock_save(p_attempt, p_answers);
  return public.mock_grade(p_attempt);
end $$;

create or replace function public.student_mock_review(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  s := public.mock_student();
  if not exists (select 1 from public.mock_attempts where id = p_attempt and student_id = s.id and submitted_at is not null) then raise exception 'not_found'; end if;
  return public.mock_review_of(p_attempt);
end $$;

-- listening audio uploaded for a question (kept in the private "materials" bucket under mock/)
create or replace function public.can_read_mock_audio(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s
      join public.mock_questions q on q.audio_path = p_path
      join public.mock_tests t on t.id = q.test_id
    where s.auth_user_id = auth.uid() and auth.uid() is not null and t.published
      and t.level = any(public.student_levels(s.package, s.current_level))
      and public.student_block_reason(s) is null);
$$;
drop policy if exists "student read mock audio" on storage.objects;
create policy "student read mock audio" on storage.objects for select to authenticated using (bucket_id = 'materials' and public.can_read_mock_audio(name));

revoke all on function public.mock_student() from public;
revoke all on function public.mock_test_for(public.students, uuid) from public;
revoke all on function public.mock_grade(uuid) from public;
revoke all on function public.mock_review_of(uuid) from public;
revoke all on function public.student_mock_list() from public;
revoke all on function public.student_mock_start(uuid) from public;
revoke all on function public.student_mock_save(uuid, jsonb) from public;
revoke all on function public.student_mock_submit(uuid, jsonb) from public;
revoke all on function public.student_mock_review(uuid) from public;
revoke all on function public.can_read_mock_audio(text) from public;
grant execute on function public.student_mock_list() to authenticated;
grant execute on function public.student_mock_start(uuid) to authenticated;
grant execute on function public.student_mock_save(uuid, jsonb) to authenticated;
grant execute on function public.student_mock_submit(uuid, jsonb) to authenticated;
grant execute on function public.student_mock_review(uuid) to authenticated;
grant execute on function public.can_read_mock_audio(text) to authenticated;

select 'SAKURA_V15_OK' as result;
