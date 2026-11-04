-- =====================================================================
-- Sakura Portal · v24: exam countdown on the student site
-- * student_exam_dates() — the next JLPT / NAT-TEST dates the office set in Settings
--   (settings are staff-only, so students read just these two dates through this function)
-- Safe to run more than once.
-- =====================================================================
create or replace function public.student_exam_dates() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare st jsonb;
begin
  if auth.uid() is null then return null; end if;
  if not (public.is_member() or exists (select 1 from public.students where auth_user_id = auth.uid())) then return null; end if;
  select data into st from public.settings where id = 1;
  return jsonb_build_object('jlpt_date', nullif(st ->> 'jlpt_date', ''), 'nat_date', nullif(st ->> 'nat_date', ''));
end $$;
revoke all on function public.student_exam_dates() from public;
grant execute on function public.student_exam_dates() to authenticated;
select 'SAKURA_V24_OK' as result;
