-- Sakura Portal · v42: প্রধান শিক্ষক (head teacher)
-- * a new role 'head_teacher': everything a teacher can do (classes, attendance, exams, materials, mock tests,
--   homework, notices, students' questions), and also reading the students' class feedback
-- * no money, office papers or people management — those stay with the office and the director
-- * ID card: number SJI-T-###, title প্রধান শিক্ষক
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','deputy','staff','head_teacher','teacher'));
alter table public.staff_invites drop constraint if exists staff_invites_role_check;
alter table public.staff_invites add constraint staff_invites_role_check check (role in ('admin','deputy','staff','head_teacher','teacher'));

create or replace function public.is_head_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'head_teacher') $$;
revoke all on function public.is_head_teacher() from public, anon;
grant execute on function public.is_head_teacher() to authenticated;

drop policy if exists "office select class_feedback" on public.class_feedback;
create policy "office select class_feedback" on public.class_feedback for select using (public.is_staff() or public.is_head_teacher());

create or replace function public.role_title(p_role text) returns text language sql immutable as $$
  select case p_role when 'admin' then 'পরিচালক' when 'deputy' then 'উপ-পরিচালক' when 'head_teacher' then 'প্রধান শিক্ষক' when 'teacher' then 'শিক্ষক' else 'অফিস স্টাফ' end $$;
create or replace function public.next_staff_no(p_role text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare pre text := 'SJI-' || case when p_role in ('admin','deputy') then 'D' when p_role in ('teacher','head_teacher') then 'T' else 'S' end || '-'; n int;
begin
  perform pg_advisory_xact_lock(hashtext('staff_no'));
  select coalesce(max(substring(staff_no from length(pre) + 1)::int), 0) + 1 into n from public.staff_cards where staff_no like pre || '%' and substring(staff_no from length(pre) + 1) ~ '^\d+$';
  return pre || lpad(n::text, 3, '0');
end $$;
