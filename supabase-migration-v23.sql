-- =====================================================================
-- Sakura Portal · v23: ভুলের খাতা (mistake notebook) on the student site
-- * a question is in the notebook when, in the student's latest finished attempt that had it,
--   the answer was wrong or left blank — and it has not been fixed in practice since then
-- * student_mistakes()            — the notebook, with answers and explanations
--   (only from tests whose answers are shown after submitting)
-- * student_mistake_fixed(ids)    — the student answered these right in practice; they leave the notebook
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.student_fixed (
  student_id uuid not null references public.students(id) on delete cascade,
  question_id uuid not null references public.mock_questions(id) on delete cascade,
  fixed_at timestamptz not null default now(),
  primary key (student_id, question_id)
);
alter table public.student_fixed enable row level security;
grant select on public.student_fixed to authenticated;
drop policy if exists "member select student_fixed" on public.student_fixed;
create policy "member select student_fixed" on public.student_fixed for select using (public.is_member());

create or replace function public.student_mistakes() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return '[]'::jsonb; end if;
  return coalesce((
    with last_try as (
      select distinct on (q.id) q.id as qid, a.submitted_at, a.answers ->> q.id::text as mine
        from public.mock_attempts a
        join public.mock_questions q on q.test_id = a.test_id
       where a.student_id = sid and a.submitted_at is not null
       order by q.id, a.submitted_at desc),
    wrongs as (
      select q.id as qid, count(*) as n
        from public.mock_attempts a join public.mock_questions q on q.test_id = a.test_id
       where a.student_id = sid and a.submitted_at is not null
         and coalesce(a.answers ->> q.id::text, '') is distinct from q.correct::text
       group by q.id)
    select jsonb_agg(jsonb_build_object('id', q.id, 'test_title', t.title, 'level', t.level, 'section', q.section, 'passage', q.passage,
             'question', q.question, 'options', q.options, 'correct', q.correct, 'explanation', q.explanation, 'script', q.script, 'audio_path', q.audio_path,
             'mine', case when l.mine ~ '^[0-3]$' then l.mine::int end, 'times_wrong', w.n, 'last_at', l.submitted_at)
             order by l.submitted_at desc, q.sort_order)
      from last_try l
      join public.mock_questions q on q.id = l.qid
      join public.mock_tests t on t.id = q.test_id
      join wrongs w on w.qid = q.id
     where t.show_answers
       and (l.mine is null or l.mine !~ '^[0-3]$' or l.mine::int <> q.correct)
       and not exists (select 1 from public.student_fixed f where f.student_id = sid and f.question_id = q.id and f.fixed_at > l.submitted_at)
  ), '[]'::jsonb);
end $$;

create or replace function public.student_mistake_fixed(p_ids uuid[]) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare sid uuid; n integer;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return 0; end if;
  insert into public.student_fixed (student_id, question_id, fixed_at)
  select sid, q.id, now() from public.mock_questions q
   where q.id = any(p_ids)
     and exists (select 1 from public.mock_attempts a where a.student_id = sid and a.test_id = q.test_id and a.submitted_at is not null)
  on conflict (student_id, question_id) do update set fixed_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.student_mistakes() from public;
revoke all on function public.student_mistake_fixed(uuid[]) from public;
grant execute on function public.student_mistakes() to authenticated;
grant execute on function public.student_mistake_fixed(uuid[]) to authenticated;

select 'SAKURA_V23_OK' as result;
