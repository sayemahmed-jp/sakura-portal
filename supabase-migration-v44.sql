-- Sakura Portal v44 · certificates that can be checked online.
-- Every printed certificate (study hours, transcript, mock-test pass) gets a number and a secret code,
-- saved here. The QR on the paper opens sakura.institute/verify, which asks verify_certificate():
-- anyone with the number AND the code sees the name, kind, hours/score and date — nothing else.
-- Staff see the list; the director or deputy can cancel (revoke) a certificate.
-- Safe to run more than once.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  cert_no text not null unique,
  code text not null,
  kind text not null check (kind in ('hours','transcript','mock')),
  student_id uuid references public.students(id) on delete set null,
  name_en text not null default '',
  student_no text not null default '',
  details jsonb not null default '{}'::jsonb,
  issued_on date not null default ((now() at time zone 'Asia/Dhaka')::date),
  issued_by uuid default auth.uid(),
  revoked_at timestamptz,
  revoked_reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists certificates_student on public.certificates(student_id);
create sequence if not exists public.certificate_seq;
alter table public.certificates enable row level security;
drop policy if exists "members read certificates" on public.certificates;
create policy "members read certificates" on public.certificates for select using (public.is_member());
drop policy if exists "admins revoke certificates" on public.certificates;
create policy "admins revoke certificates" on public.certificates for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.issue_certificate(p_kind text, p_student uuid, p_name text, p_student_no text, p_details jsonb)
returns public.certificates
language plpgsql volatile security definer set search_path = public as $$
declare c public.certificates;
begin
  if not public.is_member() then raise exception 'not_allowed'; end if;
  if p_kind not in ('hours','transcript','mock') then raise exception 'bad_kind'; end if;
  insert into public.certificates (cert_no, code, kind, student_id, name_en, student_no, details)
  values ('SJI-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' || lpad(nextval('public.certificate_seq')::text, 5, '0'),
          upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
          p_kind, p_student, coalesce(p_name, ''), coalesce(p_student_no, ''), coalesce(p_details, '{}'::jsonb))
  returning * into c;
  return c;
end $$;
revoke all on function public.issue_certificate(text, uuid, text, text, jsonb) from public, anon;
grant execute on function public.issue_certificate(text, uuid, text, text, jsonb) to authenticated;

-- public check: needs both the number and the code (printed on the paper and inside the QR)
create or replace function public.verify_certificate(p_no text, p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('found', true, 'cert_no', c.cert_no, 'kind', c.kind, 'name_en', c.name_en,
            'student_no', c.student_no, 'details', c.details, 'issued_on', c.issued_on,
            'revoked', c.revoked_at is not null, 'revoked_reason', c.revoked_reason,
            'institute_en', (select data->>'institute_en' from public.settings where id = 1),
            'institute_ja', (select data->>'institute_ja' from public.settings where id = 1))
     from public.certificates c
     where c.cert_no = upper(trim(p_no)) and c.code = upper(replace(trim(p_code), ' ', ''))), jsonb_build_object('found', false));
$$;
revoke all on function public.verify_certificate(text, text) from public;
grant execute on function public.verify_certificate(text, text) to anon, authenticated;

-- the institute's public email on receipts and certificates becomes info@sakura.institute
-- (forwarded to the director's inbox). It can be changed any time in the portal: সেটিংস → ইমেইল.
update public.settings set data = jsonb_set(coalesce(data, '{}'::jsonb), '{email}', to_jsonb('info@sakura.institute'::text)), updated_at = now() where id = 1;

select 'ROWS:SAKURA_V44_OK' as result;
