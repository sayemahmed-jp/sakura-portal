-- =====================================================================
-- Sakura Portal · v37: বন্ধুকে আনুন (referral link)
-- * every student gets a short personal code; their link opens the institute's website form,
--   and whoever fills it in is saved under "আগ্রহী ছাত্র" with source "referral" and the student's name
-- * inquiries.referred_by — which student brought this person
-- * student_referrals() — the student's code, the institute's reward text (if the director set one)
--   and the people they brought (first name and progress only — no phone numbers)
-- * submit_referral(...) — the website form, when opened from a referral link (same checks as submit_inquiry)
-- Safe to run more than once.
-- =====================================================================
alter table public.students add column if not exists ref_code text;
create unique index if not exists students_ref_code_uniq on public.students(ref_code) where ref_code is not null;
alter table public.inquiries add column if not exists referred_by uuid references public.students(id) on delete set null;
create index if not exists inquiries_referred_idx on public.inquiries(referred_by);

create or replace function public.student_referrals() returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; c text; st jsonb; i int := 0;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found then return null; end if;
  c := s.ref_code;
  while c is null and i < 20 loop
    i := i + 1;
    c := translate(upper(substr(md5(random()::text || clock_timestamp()::text || s.id::text), 1, 6)), '01', 'XZ');
    if exists (select 1 from public.students where ref_code = c) then c := null; end if;
  end loop;
  if s.ref_code is null and c is not null then update public.students set ref_code = c where id = s.id; end if;
  select data into st from public.settings where id = 1;
  return jsonb_build_object('code', c, 'reward', coalesce(st ->> 'ref_reward', ''),
    'list', coalesce((select jsonb_agg(jsonb_build_object('name', split_part(btrim(q.name), ' ', 1), 'status', q.status, 'on', q.created_on) order by q.created_at desc)
                      from public.inquiries q where q.referred_by = s.id), '[]'::jsonb));
end $$;

create or replace function public.submit_referral(p_name text, p_phone text, p_interest text, p_note text, p_ref text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare r text; who public.students; qid uuid;
begin
  select * into who from public.students where ref_code = upper(btrim(coalesce(p_ref, ''))) and status <> 'dropped';
  r := public.submit_inquiry(p_name, p_phone, p_interest,
         case when who.id is not null then 'রেফার করেছে: ' || coalesce(nullif(who.name_bn, ''), who.name_en, '') || ' (' || who.admission_no || ')' || case when btrim(coalesce(p_note, '')) <> '' then ' · ' || p_note else '' end else p_note end,
         'referral');
  if r = 'ok' and who.id is not null then
    select id into qid from public.inquiries where regexp_replace(phone, '[^0-9+]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') and created_by is null and created_at > now() - interval '10 minutes' order by created_at desc limit 1;
    if qid is not null then update public.inquiries set referred_by = who.id where id = qid and referred_by is null; end if;
  end if;
  return r;
end $$;

revoke all on function public.student_referrals() from public;
revoke all on function public.submit_referral(text, text, text, text, text) from public;
grant execute on function public.student_referrals() to authenticated;
grant execute on function public.submit_referral(text, text, text, text, text) to anon, authenticated;
select 'SAKURA_V37_OK' as result;
