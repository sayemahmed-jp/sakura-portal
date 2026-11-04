-- =====================================================================
-- Sakura Portal · v28: "জাপান আবেদন" on the student site
-- * student_japan() — the linked student's own Japan file: current stage, every school application
--   (school, intake, status and key dates) and the status of each document (no files, no office notes).
--   Also returns the office's alert rules so the site can warn about an expiring passport or an old bank paper.
-- Safe to run more than once.
-- =====================================================================
create or replace function public.student_japan() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; st jsonb;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  return jsonb_build_object(
    'stage', coalesce(s.japan_stage, 'none'), 'target_school', s.target_school, 'intake', s.intake,
    'rules', jsonb_build_object('passport_months', coalesce((st ->> 'alert_passport_months')::int, 6), 'fresh_days', coalesce((st ->> 'alert_fresh_days')::int, 90)),
    'applications', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'school_ja', sc.name_ja, 'school_en', sc.name_en, 'prefecture', sc.prefecture, 'city', sc.city,
                         'intake', a.intake, 'status', a.status, 'deadline_on', a.deadline_on, 'submitted_on', a.submitted_on, 'interview_on', a.interview_on,
                         'result_on', a.result_on, 'depart_on', a.depart_on, 'school_fee', a.school_fee) order by a.created_at desc)
                        from public.applications a join public.jp_schools sc on sc.id = a.school_id where a.student_id = s.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('doc_type', d.doc_type, 'status', d.status, 'expires_on', d.expires_on, 'issued_on', d.issued_on, 'updated_at', d.updated_at))
                        from public.documents d where d.student_id = s.id), '[]'::jsonb));
end $$;
revoke all on function public.student_japan() from public;
grant execute on function public.student_japan() to authenticated;
select 'SAKURA_V28_OK' as result;
