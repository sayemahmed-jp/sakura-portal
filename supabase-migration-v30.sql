-- =====================================================================
-- Sakura Portal · v30: বাড়ির কাজ (homework)
-- * homework — set in the portal by the director, office staff or teachers, for everyone or one level/batch,
--   with a due date and (optionally) full marks
-- * homework_submissions — a student's answer: photos/PDF of their copy and a note; the teacher gives
--   marks and feedback, or asks for it to be done again
-- * storage bucket "homework" (private): files sit under <homework id>/<student id>/…; a student can only
--   upload to and read their own folder, portal logins can read everything
-- * student_homework() and student_homework_submit() — what the student site uses
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  body text not null default '',
  level text not null default 'all' check (level in ('all','N5','N4','N3')),
  batch text not null default 'all' check (batch in ('all','morning','evening')),
  due_on date,
  max_marks integer check (max_marks is null or max_marks > 0),
  published boolean not null default true,
  created_by uuid default auth.uid(),
  author text default '',
  created_at timestamptz not null default now()
);
create index if not exists homework_created_idx on public.homework(created_at desc);

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  note text not null default '',
  files jsonb not null default '[]'::jsonb,
  status text not null default 'submitted' check (status in ('submitted','checked','redo')),
  marks integer check (marks is null or marks >= 0),
  feedback text not null default '',
  submitted_at timestamptz not null default now(),
  checked_by uuid,
  checked_at timestamptz,
  unique (homework_id, student_id)
);
create index if not exists homework_sub_student_idx on public.homework_submissions(student_id);

alter table public.homework enable row level security;
alter table public.homework_submissions enable row level security;
grant select, insert, update, delete on public.homework, public.homework_submissions to authenticated;
drop policy if exists "member all homework" on public.homework;
create policy "member all homework" on public.homework for all using (public.is_member()) with check (public.is_member());
drop policy if exists "member select homework_submissions" on public.homework_submissions;
create policy "member select homework_submissions" on public.homework_submissions for select using (public.is_member());
drop policy if exists "member update homework_submissions" on public.homework_submissions;
create policy "member update homework_submissions" on public.homework_submissions for update using (public.is_member()) with check (public.is_member());
drop policy if exists "member delete homework_submissions" on public.homework_submissions;
create policy "member delete homework_submissions" on public.homework_submissions for delete using (public.is_member());
drop trigger if exists audit_homework on public.homework;
create trigger audit_homework after insert or update or delete on public.homework for each row execute function public.audit_trigger();

-- ---------- private files ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homework', 'homework', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.my_student_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.students where auth_user_id = auth.uid() limit 1;
$$;
revoke all on function public.my_student_id() from public;
grant execute on function public.my_student_id() to authenticated;

drop policy if exists "homework read" on storage.objects;
create policy "homework read" on storage.objects for select to authenticated
  using (bucket_id = 'homework' and (public.is_member() or (storage.foldername(name))[2] = public.my_student_id()::text));
drop policy if exists "homework student upload" on storage.objects;
create policy "homework student upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'homework' and (storage.foldername(name))[2] = public.my_student_id()::text);
drop policy if exists "homework student delete" on storage.objects;
create policy "homework student delete" on storage.objects for delete to authenticated
  using (bucket_id = 'homework' and (public.is_member() or (storage.foldername(name))[2] = public.my_student_id()::text));

-- ---------- student side ----------
create or replace function public.student_homework() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students; lv text[];
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or s.status = 'dropped' then return '[]'::jsonb; end if;
  lv := public.student_levels(s.package, s.current_level);
  return coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'body', h.body, 'level', h.level, 'due_on', h.due_on, 'max_marks', h.max_marks,
            'author', h.author, 'created_at', h.created_at,
            'sub', (select jsonb_build_object('id', x.id, 'note', x.note, 'files', x.files, 'status', x.status, 'marks', x.marks, 'feedback', x.feedback,
                                              'submitted_at', x.submitted_at, 'checked_at', x.checked_at)
                      from public.homework_submissions x where x.homework_id = h.id and x.student_id = s.id))
            order by h.created_at desc)
    from public.homework h
   where h.published and (h.level = 'all' or h.level = any(lv)) and (h.batch = 'all' or h.batch = s.batch)
     and h.created_at > now() - interval '120 days'), '[]'::jsonb);
end $$;

create or replace function public.student_homework_submit(p_homework uuid, p_note text, p_files jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; h public.homework; old public.homework_submissions; f jsonb;
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found then raise exception 'not_linked'; end if;
  select * into h from public.homework where id = p_homework and published;
  if not found or not (h.level = 'all' or h.level = any(public.student_levels(s.package, s.current_level))) or not (h.batch = 'all' or h.batch = s.batch) then raise exception 'not_found'; end if;
  if jsonb_typeof(coalesce(p_files, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_files, '[]'::jsonb)) > 8 then raise exception 'too_many'; end if;
  for f in select * from jsonb_array_elements(coalesce(p_files, '[]'::jsonb)) loop
    if position((h.id::text || '/' || s.id::text || '/') in coalesce(f ->> 'path', '')) <> 1 then raise exception 'bad_file'; end if;
  end loop;
  if jsonb_array_length(coalesce(p_files, '[]'::jsonb)) = 0 and btrim(coalesce(p_note, '')) = '' then raise exception 'empty'; end if;
  select * into old from public.homework_submissions where homework_id = h.id and student_id = s.id;
  if found and old.status = 'checked' then raise exception 'checked'; end if;
  insert into public.homework_submissions (homework_id, student_id, note, files, status, submitted_at)
  values (h.id, s.id, left(coalesce(p_note, ''), 2000), coalesce(p_files, '[]'::jsonb), 'submitted', now())
  on conflict (homework_id, student_id) do update set note = excluded.note, files = excluded.files, status = 'submitted', submitted_at = now(), marks = null;
  return public.student_homework();
end $$;

revoke all on function public.student_homework() from public;
revoke all on function public.student_homework_submit(uuid, text, jsonb) from public;
grant execute on function public.student_homework() to authenticated;
grant execute on function public.student_homework_submit(uuid, text, jsonb) to authenticated;
select 'SAKURA_V30_OK' as result;
