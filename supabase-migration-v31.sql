-- =====================================================================
-- Sakura Portal · v31: শিক্ষককে প্রশ্ন (students ask, teachers answer)
-- * student_questions — a student's question (topic + text); a teacher answers in the portal and may
--   share the answer with every student of that level (it then shows as a common question, without the asker's name)
-- * student_qa()        — the student's own questions and the shared answers for their levels
-- * student_ask(topic, body) — ask (at most 10 a day)
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.student_questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  level text not null default 'N5',
  topic text not null default '',
  body text not null check (length(btrim(body)) > 0),
  status text not null default 'open' check (status in ('open','answered')),
  answer text not null default '',
  answered_by text default '',
  answered_at timestamptz,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists student_questions_created_idx on public.student_questions(created_at desc);
alter table public.student_questions enable row level security;
grant select, insert, update, delete on public.student_questions to authenticated;
drop policy if exists "member select student_questions" on public.student_questions;
create policy "member select student_questions" on public.student_questions for select using (public.is_member());
drop policy if exists "member update student_questions" on public.student_questions;
create policy "member update student_questions" on public.student_questions for update using (public.is_member()) with check (public.is_member());
drop policy if exists "member delete student_questions" on public.student_questions;
create policy "member delete student_questions" on public.student_questions for delete using (public.is_member());

create or replace function public.student_qa() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; lv text[];
begin
  if public.is_member() then
    return jsonb_build_object('mine', '[]'::jsonb, 'shared', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'level', q.level, 'topic', q.topic, 'body', q.body, 'answer', q.answer,
             'answered_by', q.answered_by, 'answered_at', q.answered_at) order by q.answered_at desc) from public.student_questions q where q.shared and q.status = 'answered'), '[]'::jsonb));
  end if;
  select * into s from public.students where auth_user_id = auth.uid();
  if not found then return null; end if;
  lv := public.student_levels(s.package, s.current_level);
  return jsonb_build_object(
    'mine', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'level', q.level, 'topic', q.topic, 'body', q.body, 'status', q.status, 'answer', q.answer,
             'answered_by', q.answered_by, 'answered_at', q.answered_at, 'shared', q.shared, 'created_at', q.created_at) order by q.created_at desc)
             from public.student_questions q where q.student_id = s.id), '[]'::jsonb),
    'shared', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'level', q.level, 'topic', q.topic, 'body', q.body, 'answer', q.answer,
             'answered_by', q.answered_by, 'answered_at', q.answered_at) order by q.answered_at desc)
             from (select * from public.student_questions where shared and status = 'answered' and level = any(lv) and student_id <> s.id order by answered_at desc limit 60) q), '[]'::jsonb));
end $$;

create or replace function public.student_ask(p_topic text, p_body text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found then raise exception 'not_linked'; end if;
  if s.status = 'dropped' then raise exception 'not_linked'; end if;
  if btrim(coalesce(p_body, '')) = '' then raise exception 'empty'; end if;
  if (select count(*) from public.student_questions where student_id = s.id and created_at > now() - interval '1 day') >= 10 then raise exception 'busy'; end if;
  insert into public.student_questions (student_id, level, topic, body) values (s.id, coalesce(s.current_level, 'N5'), left(btrim(coalesce(p_topic, '')), 80), left(btrim(p_body), 2000));
  return public.student_qa();
end $$;
revoke all on function public.student_qa() from public;
revoke all on function public.student_ask(text, text) from public;
grant execute on function public.student_qa() to authenticated;
grant execute on function public.student_ask(text, text) to authenticated;
select 'SAKURA_V31_OK' as result;
