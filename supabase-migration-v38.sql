-- =====================================================================
-- Sakura Portal · v38: ছাত্ররা নিজেরাই জাপানের আবেদনের কাগজ স্ক্যান করে জমা দেয়
-- * the same "documents" table and private "documents" bucket the office already uses — a student's upload
--   lands in their own কাগজপত্র tab in the portal, marked as sent by the student
-- * documents.feedback — the office's message to the student ("ছবি ঝাপসা, আবার দিন")
-- * documents.student_upload_at — when the student last sent this paper
-- * storage: a student can add files only under <their student id>/ and read only that folder;
--   staff keep full access as before
-- * student_docs() / student_doc_upload(...) — what the student site uses; a paper the office has
--   verified is locked (the student must ask the office to change it)
-- Safe to run more than once.
-- =====================================================================
alter table public.documents add column if not exists feedback text not null default '';
alter table public.documents add column if not exists student_upload_at timestamptz;

drop policy if exists "student read own documents" on storage.objects;
create policy "student read own documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.my_student_id() is not null and (storage.foldername(name))[1] = public.my_student_id()::text);
drop policy if exists "student upload own documents" on storage.objects;
create policy "student upload own documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.my_student_id() is not null and (storage.foldername(name))[1] = public.my_student_id()::text);

create or replace function public.student_docs() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('doc_type', d.doc_type, 'status', d.status, 'file_path', nullif(d.file_path, ''), 'feedback', d.feedback,
            'expires_on', d.expires_on, 'issued_on', d.issued_on, 'updated_at', d.updated_at, 'student_upload_at', d.student_upload_at))
    from public.documents d where d.student_id = sid), '[]'::jsonb);
end $$;

create or replace function public.student_doc_upload(p_type text, p_path text, p_expires date, p_issued date) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; cur public.documents;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or s.status = 'dropped' then raise exception 'not_linked'; end if;
  if p_type not in ('photo','passport','nid','ssc','hsc','degree','jlpt','study_hours','sponsor','bank','relation','other') then raise exception 'bad_type'; end if;
  if position((s.id::text || '/') in coalesce(p_path, '')) <> 1 then raise exception 'bad_file'; end if;
  select * into cur from public.documents where student_id = s.id and doc_type = p_type;
  if found and cur.status = 'verified' then raise exception 'verified'; end if;
  insert into public.documents (student_id, doc_type, status, file_path, note, expires_on, issued_on, feedback, student_upload_at, updated_at)
  values (s.id, p_type, 'received', p_path, '', p_expires, p_issued, '', now(), now())
  on conflict (student_id, doc_type) do update set status = 'received', file_path = excluded.file_path, feedback = '', student_upload_at = now(), updated_at = now(),
    expires_on = coalesce(excluded.expires_on, public.documents.expires_on), issued_on = coalesce(excluded.issued_on, public.documents.issued_on);
  return public.student_docs();
end $$;
revoke all on function public.student_docs() from public;
revoke all on function public.student_doc_upload(text, text, date, date) from public;
grant execute on function public.student_docs() to authenticated;
grant execute on function public.student_doc_upload(text, text, date, date) to authenticated;
select 'SAKURA_V38_OK' as result;
