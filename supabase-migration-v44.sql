-- Sakura Portal v44 · certificates that stay up to date and can be checked online.
-- * Each student has ONE living certificate of each kind (study hours, transcript, enrolment, course completion,
--   monthly attendance, recommendation letter; one per mock test passed). Its number and secret code never change.
-- * details  = what the portal works out from its records (hours, attendance, marks …); the portal refreshes it
--   whenever those records change, so the online check always shows the latest.
-- * overrides = what the office corrected by hand (for example classes held on paper); these win over details.
-- * The QR on the paper opens sakura.institute/verify → verify_certificate(): with the number AND the code anyone
--   sees the name, kind, the figures and the date — nothing else (no phone, address or date of birth).
-- * The director or deputy can cancel (revoke) a certificate; the check then says so.
-- * Students can ask for the new kinds from their app (doc_requests).
-- Safe to run more than once.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  cert_no text not null unique,
  code text not null,
  kind text not null,
  key text not null default '',
  student_id uuid references public.students(id) on delete set null,
  name_en text not null default '',
  student_no text not null default '',
  details jsonb not null default '{}'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  issued_on date not null default ((now() at time zone 'Asia/Dhaka')::date),
  issued_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text not null default '',
  created_at timestamptz not null default now()
);
alter table public.certificates add column if not exists key text not null default '';
alter table public.certificates add column if not exists overrides jsonb not null default '{}'::jsonb;
alter table public.certificates add column if not exists version integer not null default 1;
alter table public.certificates add column if not exists updated_at timestamptz not null default now();
alter table public.certificates drop constraint if exists certificates_kind_check;
alter table public.certificates add constraint certificates_kind_check check (kind in ('hours','transcript','mock','enrol','complete','attend','recommend'));
create index if not exists certificates_student on public.certificates(student_id);
create unique index if not exists certificates_one_live on public.certificates(student_id, key) where revoked_at is null;
create sequence if not exists public.certificate_seq;
alter table public.certificates enable row level security;
drop policy if exists "members read certificates" on public.certificates;
create policy "members read certificates" on public.certificates for select using (public.is_member());
drop policy if exists "admins revoke certificates" on public.certificates;
create policy "admins revoke certificates" on public.certificates for update using (public.is_admin()) with check (public.is_admin());

-- make or refresh the living certificate for (student, key). p_overrides null = keep the office's corrections.
drop function if exists public.issue_certificate(text, uuid, text, text, jsonb);
create or replace function public.issue_certificate(p_kind text, p_key text, p_student uuid, p_name text, p_student_no text, p_details jsonb, p_overrides jsonb default null)
returns public.certificates
language plpgsql volatile security definer set search_path = public as $$
declare c public.certificates; nd jsonb := coalesce(p_details, '{}'::jsonb);
begin
  if not public.is_member() then raise exception 'not_allowed'; end if;
  if p_kind not in ('hours','transcript','mock','enrol','complete','attend','recommend') then raise exception 'bad_kind'; end if;
  select * into c from public.certificates where student_id = p_student and key = coalesce(p_key, p_kind) and revoked_at is null for update;
  if found then
    if c.details is distinct from nd or (p_overrides is not null and c.overrides is distinct from p_overrides)
       or c.name_en is distinct from coalesce(p_name, '') or c.student_no is distinct from coalesce(p_student_no, '') then
      update public.certificates set details = nd, overrides = coalesce(p_overrides, overrides), name_en = coalesce(p_name, ''),
        student_no = coalesce(p_student_no, ''), version = version + 1, updated_at = now()
      where id = c.id returning * into c;
    end if;
    return c;
  end if;
  insert into public.certificates (cert_no, code, kind, key, student_id, name_en, student_no, details, overrides)
  values ('SJI-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' || lpad(nextval('public.certificate_seq')::text, 5, '0'),
          upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
          p_kind, coalesce(p_key, p_kind), p_student, coalesce(p_name, ''), coalesce(p_student_no, ''), nd, coalesce(p_overrides, '{}'::jsonb))
  returning * into c;
  return c;
end $$;
revoke all on function public.issue_certificate(text, text, uuid, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.issue_certificate(text, text, uuid, text, text, jsonb, jsonb) to authenticated;

-- public check: needs both the number and the code (printed on the paper and inside the QR)
create or replace function public.verify_certificate(p_no text, p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('found', true, 'cert_no', c.cert_no, 'kind', c.kind, 'name_en', c.name_en,
            'student_no', c.student_no, 'details', c.details || c.overrides, 'issued_on', c.issued_on,
            'updated_on', (c.updated_at at time zone 'Asia/Dhaka')::date, 'version', c.version,
            'revoked', c.revoked_at is not null, 'revoked_reason', c.revoked_reason,
            'institute_en', (select data->>'institute_en' from public.settings where id = 1),
            'institute_ja', (select data->>'institute_ja' from public.settings where id = 1))
     from public.certificates c
     where c.cert_no = upper(trim(p_no)) and c.code = upper(replace(trim(p_code), ' ', ''))), jsonb_build_object('found', false));
$$;
revoke all on function public.verify_certificate(text, text) from public;
grant execute on function public.verify_certificate(text, text) to anon, authenticated;

-- students can ask for the new papers from their app
alter table public.doc_requests drop constraint if exists doc_requests_kind_check;
alter table public.doc_requests add constraint doc_requests_kind_check check (kind in ('hours','transcript','idcard','other','enrol','complete','attend','recommend'));
create or replace function public.student_doc_request(p_kind text, p_purpose text, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or s.status = 'dropped' then raise exception 'not_linked'; end if;
  if p_kind not in ('hours','transcript','idcard','other','enrol','complete','attend','recommend') then raise exception 'bad_kind'; end if;
  if p_kind = 'other' and btrim(coalesce(p_note, '')) = '' then raise exception 'empty'; end if;
  if (select count(*) from public.doc_requests where student_id = s.id and status = 'pending') >= 3 then raise exception 'busy'; end if;
  insert into public.doc_requests (student_id, kind, purpose, note) values (s.id, p_kind, left(btrim(coalesce(p_purpose, '')), 120), left(btrim(coalesce(p_note, '')), 1000));
  return public.student_doc_requests();
end $$;
revoke all on function public.student_doc_request(text, text, text) from public;
grant execute on function public.student_doc_request(text, text, text) to authenticated;

-- the institute's public email on receipts and certificates becomes info@sakura.institute
-- (forwarded to the director's inbox). It can be changed any time in the portal: সেটিংস → ইমেইল.
update public.settings set data = jsonb_set(coalesce(data, '{}'::jsonb), '{email}', to_jsonb('info@sakura.institute'::text)), updated_at = now() where id = 1;

select 'ROWS:SAKURA_V44_OK' as result;
