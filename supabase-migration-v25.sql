-- =====================================================================
-- Sakura Portal · v25: "আমার হিসাব" on the student site
-- * student_account() — the linked student's own fee account: course fee, discount, paid, due,
--   next instalment date, the Japan processing fee (if any), and every payment with its receipt number.
--   Works even while the student's materials are locked for unpaid fees, so they can see what is due.
-- Safe to run more than once.
-- =====================================================================
create or replace function public.student_account() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; st jsonb; paid integer; ppaid integer;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  select coalesce(sum(amount), 0) into paid from public.payments where student_id = s.id and purpose is distinct from 'processing';
  select coalesce(sum(amount), 0) into ppaid from public.payments where student_id = s.id and purpose = 'processing';
  return jsonb_build_object(
    'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'en', st ->> 'institute_en', 'ja', st ->> 'institute_ja', 'phone', st ->> 'phone',
                                    'whatsapp', st ->> 'whatsapp', 'email', st ->> 'email', 'address', st ->> 'address'),
    'student', jsonb_build_object('name_bn', s.name_bn, 'name_en', s.name_en, 'admission_no', s.admission_no, 'package', s.package, 'batch', s.batch),
    'fee', jsonb_build_object('total', s.total_fee, 'discount', s.discount, 'net', greatest(0, s.total_fee - s.discount), 'paid', paid,
                              'due', greatest(0, greatest(0, s.total_fee - s.discount) - paid), 'next_due_date', s.next_due_date),
    'processing', jsonb_build_object('fee', s.processing_fee, 'paid', ppaid, 'due', greatest(0, s.processing_fee - ppaid)),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'receipt_no', p.receipt_no, 'paid_on', p.paid_on, 'amount', p.amount,
                                   'method', p.method, 'trx_id', p.trx_id, 'purpose', p.purpose) order by p.paid_on desc, p.created_at desc)
                          from public.payments p where p.student_id = s.id), '[]'::jsonb));
end $$;
revoke all on function public.student_account() from public;
grant execute on function public.student_account() to authenticated;
select 'SAKURA_V25_OK' as result;
