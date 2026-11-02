-- =====================================================================
-- Sakura Portal · v17: the director manages logins from the portal; teachers manage their own content
-- * staff_invites — the director invites a person (name, email, role) and gets a one-time code;
--   the person opens the portal, creates their login with that email, enters the code, and is in.
--   No SQL, no service key. Codes expire after 14 days and work only with the invited email.
-- * admin_people() — the director's list of logins with email and last sign-in
-- * the last director can never be removed or demoted
-- * teachers and office staff may delete study materials and mock questions, and delete
--   exams / mock tests that have no marks or sittings yet (anything with results stays director-only)
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (position('@' in email) > 1),
  name text not null check (length(btrim(name)) > 0),
  role text not null default 'teacher' check (role in ('admin','staff','teacher')),
  code text not null unique,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  used_by uuid
);
alter table public.staff_invites enable row level security;
grant select, insert, update, delete on public.staff_invites to authenticated;
drop policy if exists "admin all staff_invites" on public.staff_invites;
create policy "admin all staff_invites" on public.staff_invites for all using (public.is_admin()) with check (public.is_admin());

-- a new login claims its invite with the code
create or replace function public.claim_invite(p_code text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); em text; inv public.staff_invites;
begin
  if uid is null then return 'login'; end if;
  if exists (select 1 from public.profiles where id = uid) then return 'already'; end if;
  if exists (select 1 from public.students where auth_user_id = uid) then return 'student'; end if;
  if (select count(*) from public.student_link_attempts where user_id = uid and not ok and at > now() - interval '1 hour') >= 5 then return 'busy'; end if;
  select email into em from auth.users where id = uid;
  select * into inv from public.staff_invites
   where upper(code) = upper(btrim(coalesce(p_code, ''))) and lower(email) = lower(em) and used_at is null and expires_at > now()
   limit 1;
  if not found then
    insert into public.student_link_attempts (user_id, ok) values (uid, false);
    return 'bad_code';
  end if;
  insert into public.profiles (id, name, role) values (uid, inv.name, inv.role);
  update public.staff_invites set used_at = now(), used_by = uid where id = inv.id;
  insert into public.student_link_attempts (user_id, ok) values (uid, true);
  return 'ok';
end $$;

-- the director's list of logins (profiles only hold name and role; the email lives in auth.users)
create or replace function public.admin_people() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'role', p.role, 'created_at', p.created_at,
                                                       'email', u.email, 'last_sign_in_at', u.last_sign_in_at) order by p.created_at)
                   from public.profiles p left join auth.users u on u.id = p.id), '[]'::jsonb);
end $$;

revoke all on function public.claim_invite(text) from public;
revoke all on function public.admin_people() from public;
grant execute on function public.claim_invite(text) to authenticated;
grant execute on function public.admin_people() to authenticated;

-- never lose the last director
create or replace function public.keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
    raise exception 'অন্তত একজন পরিচালক থাকতে হবে (the last director cannot be removed)';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists keep_one_admin on public.profiles;
create trigger keep_one_admin before update or delete on public.profiles for each row execute function public.keep_one_admin();

drop trigger if exists audit_staff_invites on public.staff_invites;
create trigger audit_staff_invites after insert or update or delete on public.staff_invites for each row execute function public.audit_trigger();

-- ---------- teachers and office staff may remove content (nothing with results) ----------
drop policy if exists "member delete materials" on public.materials;
create policy "member delete materials" on public.materials for delete using (public.is_member());
drop policy if exists "member delete mock_questions" on public.mock_questions;
create policy "member delete mock_questions" on public.mock_questions for delete using (public.is_member());
drop policy if exists "member delete mock_tests" on public.mock_tests;
create policy "member delete mock_tests" on public.mock_tests for delete
  using (public.is_member() and not exists (select 1 from public.mock_attempts a where a.test_id = mock_tests.id));
drop policy if exists "member delete exams" on public.exams;
create policy "member delete exams" on public.exams for delete
  using (public.is_member() and not exists (select 1 from public.exam_results r where r.exam_id = exams.id));
drop policy if exists "member delete materials files" on storage.objects;
create policy "member delete materials files" on storage.objects for delete using (bucket_id = 'materials' and public.is_member());

select 'SAKURA_V17_OK' as result;
