-- =====================================================================
-- Sakura Portal · v34: সার্টিফিকেটের আবেদন (students ask the office for a certificate or letter)
-- * doc_requests — what the student asked for (study-hours certificate, result transcript, ID card, other)
--   and why; the office marks it ready / handed over / not possible, with a note the student sees
-- * student_doc_requests() — the student's own requests
-- * student_doc_request(kind, purpose, note) — ask (at most 3 waiting at a time)
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.doc_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null check (kind in ('hours','transcript','idcard','other')),
  purpose text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','ready','delivered','rejected')),
  reply text not null default '',
  done_by text default '',
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists doc_requests_created_idx on public.doc_requests(created_at desc);
alter table public.doc_requests enable row level security;
grant select, update, delete on public.doc_requests to authenticated;
drop policy if exists "member select doc_requests" on public.doc_requests;
create policy "member select doc_requests" on public.doc_requests for select using (public.is_member());
drop policy if exists "member update doc_requests" on public.doc_requests;
create policy "member update doc_requests" on public.doc_requests for update using (public.is_member()) with check (public.is_member());
drop policy if exists "member delete doc_requests" on public.doc_requests;
create policy "member delete doc_requests" on public.doc_requests for delete using (public.is_member());

create or replace function public.student_doc_requests() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'purpose', r.purpose, 'note', r.note, 'status', r.status, 'reply', r.reply,
           'done_at', r.done_at, 'created_at', r.created_at) order by r.created_at desc)
    from (select * from public.doc_requests where student_id = sid order by created_at desc limit 30) r), '[]'::jsonb);
end $$;

create or replace function public.student_doc_request(p_kind text, p_purpose text, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or s.status = 'dropped' then raise exception 'not_linked'; end if;
  if p_kind not in ('hours','transcript','idcard','other') then raise exception 'bad_kind'; end if;
  if p_kind = 'other' and btrim(coalesce(p_note, '')) = '' then raise exception 'empty'; end if;
  if (select count(*) from public.doc_requests where student_id = s.id and status = 'pending') >= 3 then raise exception 'busy'; end if;
  insert into public.doc_requests (student_id, kind, purpose, note) values (s.id, p_kind, left(btrim(coalesce(p_purpose, '')), 120), left(btrim(coalesce(p_note, '')), 1000));
  return public.student_doc_requests();
end $$;
revoke all on function public.student_doc_requests() from public;
revoke all on function public.student_doc_request(text, text, text) from public;
grant execute on function public.student_doc_requests() to authenticated;
grant execute on function public.student_doc_request(text, text, text) to authenticated;
select 'SAKURA_V34_OK' as result;
