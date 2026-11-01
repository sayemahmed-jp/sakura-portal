-- =====================================================================
-- Sakura Portal · v10: Japan processing fees and school commissions
-- * students.processing_fee — the agreed Japan-processing fee (kept apart from the course fee)
-- * payments with purpose 'processing' count toward it, not toward the course fee
-- * commissions — money Japanese schools pay the institute (admin only)
-- Safe to run more than once.
-- =====================================================================

alter table public.students add column if not exists processing_fee integer not null default 0 check (processing_fee >= 0);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.jp_schools(id) on delete restrict,
  application_id uuid references public.applications(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  status text not null default 'expected' check (status in ('expected','received','cancelled')),
  amount_yen integer check (amount_yen is null or amount_yen >= 0),
  amount_bdt integer check (amount_bdt is null or amount_bdt >= 0),
  expected_on date,
  received_on date,
  note text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists commissions_received_idx on public.commissions(received_on);

alter table public.commissions enable row level security;
grant select, insert, update, delete on public.commissions to authenticated;
drop policy if exists "admin all commissions" on public.commissions;
create policy "admin all commissions" on public.commissions for all using (public.is_admin()) with check (public.is_admin());

-- activity log for the new table
drop trigger if exists audit_commissions on public.commissions;
create trigger audit_commissions after insert or update or delete on public.commissions for each row execute function public.audit_trigger();

-- parent page: show the processing fee separately from the course fee
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
                                  'total_fee', s.total_fee, 'discount', s.discount, 'processing_fee', s.processing_fee, 'next_due_date', s.next_due_date,
                                  'japan_stage', s.japan_stage, 'target_school', s.target_school, 'intake', s.intake),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('paid_on', p.paid_on, 'receipt_no', p.receipt_no, 'amount', p.amount, 'method', p.method, 'purpose', p.purpose) order by p.paid_on desc)
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


select 'SAKURA_V10_OK' as result;
