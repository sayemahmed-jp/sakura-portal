-- =====================================================================
-- Sakura Portal · v26: "আমার হাজিরা" on the student site
-- * student_attendance() — the linked student's own attendance: every class with date, level,
--   topic, hours and status (present / late / absent / leave), newest first.
-- Safe to run more than once.
-- =====================================================================
create or replace function public.student_attendance() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('date', se.class_date, 'status', a.status, 'level', se.level, 'topic', se.topic,
                                                       'hours', se.hours, 'class_no', se.class_no) order by se.class_date desc)
                     from public.attendance a join public.sessions se on se.id = a.session_id
                    where a.student_id = sid), '[]'::jsonb);
end $$;
revoke all on function public.student_attendance() from public;
grant execute on function public.student_attendance() to authenticated;
select 'SAKURA_V26_OK' as result;
