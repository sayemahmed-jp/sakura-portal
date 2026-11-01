-- =====================================================================
-- Sakura Portal · v8: parent page (অভিভাবকের পাতা)
-- Each student can get a secret link. Whoever has the link sees ONLY that
-- student's classes, attendance, fees, results and Japan progress — never
-- NID, passport, phone numbers, addresses or uploaded files, and never any
-- other student. Making a new link switches the old one off.
-- Safe to run more than once.
-- =====================================================================

alter table public.students add column if not exists parent_token text;
create unique index if not exists students_parent_token_idx on public.students(parent_token) where parent_token is not null;

create or replace function public.parent_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; st jsonb; res jsonb;
begin
  if p_token is null or length(p_token) < 24 then return null; end if;
  select * into s from public.students where parent_token = p_token;
  if not found then return null; end if;
  select data into st from public.settings where id = 1;
  st := coalesce(st, '{}'::jsonb);
  res := jsonb_build_object(
    'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'en', st ->> 'institute_en', 'ja', st ->> 'institute_ja',
                                    'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp', 'address', st ->> 'address'),
    'student', jsonb_build_object('name_bn', s.name_bn, 'name_en', s.name_en, 'admission_no', s.admission_no,
                                  'current_level', s.current_level, 'batch', s.batch, 'package', s.package, 'status', s.status,
                                  'start_date', s.start_date, 'admission_date', s.admission_date,
                                  'total_fee', s.total_fee, 'discount', s.discount, 'next_due_date', s.next_due_date,
                                  'japan_stage', s.japan_stage, 'target_school', s.target_school, 'intake', s.intake),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('paid_on', p.paid_on, 'receipt_no', p.receipt_no, 'amount', p.amount, 'method', p.method) order by p.paid_on desc)
                          from public.payments p where p.student_id = s.id), '[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(jsonb_build_object('date', se.class_date, 'level', se.level, 'hours', se.hours, 'topic', se.topic, 'status', a.status) order by se.class_date desc)
                            from public.attendance a join public.sessions se on se.id = a.session_id where a.student_id = s.id), '[]'::jsonb),
    'exams', coalesce((select jsonb_agg(jsonb_build_object('date', e.exam_date, 'title', e.title, 'type', e.type, 'level', e.level,
                                                           'max_marks', e.max_marks, 'pass_marks', e.pass_marks, 'marks', r.marks, 'absent', r.absent) order by e.exam_date desc)
                       from public.exam_results r join public.exams e on e.id = r.exam_id where r.student_id = s.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('doc_type', d.doc_type, 'status', d.status, 'expires_on', d.expires_on))
                           from public.documents d where d.student_id = s.id), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object('school', coalesce(nullif(j.name_ja, ''), j.name_en), 'city', j.city, 'intake', a.intake,
                                                                  'status', a.status, 'interview_on', a.interview_on, 'deadline_on', a.deadline_on) order by a.intake desc)
                              from public.applications a join public.jp_schools j on j.id = a.school_id where a.student_id = s.id), '[]'::jsonb),
    'generated_at', now());
  return res;
end $$;

revoke all on function public.parent_view(text) from public;
grant execute on function public.parent_view(text) to anon, authenticated;

select 'SAKURA_V8_OK' as result;
