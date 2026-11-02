-- =====================================================================
-- Sakura Portal · v14: student site (ছাত্রদের সাইট) and study materials (পড়ার উপকরণ)
-- * materials        — notes, sheets, audio, video and links, by level (N5/N4/N3/all)
-- * storage bucket   — "materials" (private; files open only through short-lived links)
-- * students.auth_user_id — the student's own login, linked with admission no + phone
-- * students.portal_blocked — the office can switch one student's access off
-- * A student sees materials only for the levels in their package, and only when the
--   full course fee is paid, they are not "dropped", and the office has not blocked them.
-- * Students can never read the staff tables: every staff rule checks is_staff().
-- Safe to run more than once.
-- =====================================================================

alter table public.students add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.students add column if not exists portal_blocked boolean not null default false;

-- ---------- materials ----------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  level text not null default 'N5' check (level in ('N5','N4','N3','all')),
  kind text not null default 'pdf' check (kind in ('pdf','audio','video','image','link','file')),
  chapter text not null default '',
  sort_order integer not null default 0,
  description text not null default '',
  file_path text,
  file_name text,
  size_bytes bigint,
  url text,
  published boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists materials_level_idx on public.materials(level, sort_order);

alter table public.materials enable row level security;
grant select, insert, update, delete on public.materials to authenticated;
drop policy if exists "staff select materials" on public.materials;
create policy "staff select materials" on public.materials for select using (public.is_staff());
drop policy if exists "staff insert materials" on public.materials;
create policy "staff insert materials" on public.materials for insert with check (public.is_staff());
drop policy if exists "staff update materials" on public.materials;
create policy "staff update materials" on public.materials for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "admin delete materials" on public.materials;
create policy "admin delete materials" on public.materials for delete using (public.is_admin());

drop trigger if exists audit_materials on public.materials;
create trigger audit_materials after insert or update or delete on public.materials for each row execute function public.audit_trigger();

-- ---------- who is the logged-in student, and may they read? ----------
create or replace function public.student_levels(p_package text, p_current text) returns text[]
language sql immutable as $$
  select array(select distinct x from unnest(string_to_array(coalesce(p_package, ''), '+') || array[coalesce(p_current, '')]) x where x in ('N5','N4','N3'));
$$;

create or replace function public.student_fee_state(p_student uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('net', greatest(0, s.total_fee - s.discount), 'paid', coalesce(p.paid, 0),
                            'due', greatest(0, greatest(0, s.total_fee - s.discount) - coalesce(p.paid, 0)))
  from public.students s
  left join (select student_id, sum(amount) as paid from public.payments where purpose is distinct from 'processing' group by student_id) p on p.student_id = s.id
  where s.id = p_student;
$$;

-- why a linked student cannot read yet (null = may read)
create or replace function public.student_block_reason(s public.students) returns text
language sql stable security definer set search_path = public as $$
  select case when s.portal_blocked then 'blocked'
              when s.status = 'dropped' then 'dropped'
              when (public.student_fee_state(s.id) ->> 'due')::integer > 0 then 'due'
              else null end;
$$;

create or replace function public.can_read_material(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s join public.materials m on m.file_path = p_path
    where s.auth_user_id = auth.uid() and auth.uid() is not null and m.published
      and (m.level = 'all' or m.level = any(public.student_levels(s.package, s.current_level)))
      and public.student_block_reason(s) is null);
$$;

-- ---------- private file storage for materials ----------
insert into storage.buckets (id, name, public, file_size_limit) values ('materials', 'materials', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "staff read materials" on storage.objects;
create policy "staff read materials" on storage.objects for select using (bucket_id = 'materials' and public.is_staff());
drop policy if exists "student read materials" on storage.objects;
create policy "student read materials" on storage.objects for select to authenticated using (bucket_id = 'materials' and public.can_read_material(name));
drop policy if exists "staff upload materials" on storage.objects;
create policy "staff upload materials" on storage.objects for insert with check (bucket_id = 'materials' and public.is_staff());
drop policy if exists "staff update materials" on storage.objects;
create policy "staff update materials" on storage.objects for update using (bucket_id = 'materials' and public.is_staff());
drop policy if exists "admin delete materials" on storage.objects;
create policy "admin delete materials" on storage.objects for delete using (bucket_id = 'materials' and public.is_admin());

-- ---------- linking a login to a student (admission no + phone) ----------
create table if not exists public.student_link_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  at timestamptz not null default now(),
  ok boolean not null default false
);
alter table public.student_link_attempts enable row level security; -- no policies: only the functions below use it

create or replace function public.link_student(p_admission_no text, p_phone text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); ph text; s public.students;
begin
  if uid is null then return 'login'; end if;
  if public.is_staff() then return 'staff'; end if;
  if exists (select 1 from public.students where auth_user_id = uid) then return 'already'; end if;
  if (select count(*) from public.student_link_attempts where user_id = uid and not ok and at > now() - interval '1 hour') >= 5 then return 'busy'; end if;
  ph := right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 10);
  if length(ph) < 10 then return 'bad_phone'; end if;
  select * into s from public.students
   where upper(btrim(admission_no)) = upper(btrim(coalesce(p_admission_no, '')))
     and (right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10) = ph
          or right(regexp_replace(coalesce(guardian_phone, ''), '[^0-9]', '', 'g'), 10) = ph)
   limit 1;
  if not found then
    insert into public.student_link_attempts (user_id, ok) values (uid, false);
    return 'not_found';
  end if;
  if s.auth_user_id is not null and s.auth_user_id <> uid then return 'taken'; end if;
  update public.students set auth_user_id = uid where id = s.id;
  insert into public.student_link_attempts (user_id, ok) values (uid, true);
  return 'ok';
end $$;

-- ---------- everything the student site shows ----------
create or replace function public.student_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.students; st jsonb; why text; lv text[]; mats jsonb; counts jsonb;
begin
  if uid is null then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  select * into s from public.students where auth_user_id = uid;
  if not found then
    return jsonb_build_object('linked', false, 'staff', public.is_staff(),
      'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp'));
  end if;
  why := public.student_block_reason(s);
  lv := public.student_levels(s.package, s.current_level);
  select coalesce(jsonb_object_agg(level, n), '{}'::jsonb) into counts
    from (select level, count(*) n from public.materials where published and (level = 'all' or level = any(lv)) group by level) c;
  if why is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'level', level, 'kind', kind, 'chapter', chapter,
                                                 'description', description, 'file_path', file_path, 'file_name', file_name,
                                                 'size_bytes', size_bytes, 'url', url)
                              order by case level when 'all' then 0 when 'N5' then 1 when 'N4' then 2 else 3 end, sort_order, chapter, title), '[]'::jsonb)
      into mats from public.materials where published and (level = 'all' or level = any(lv));
  else mats := '[]'::jsonb; end if;
  return jsonb_build_object('linked', true,
    'institute', jsonb_build_object('bn', st ->> 'institute_bn', 'phone', st ->> 'phone', 'whatsapp', st ->> 'whatsapp'),
    'student', jsonb_build_object('name_bn', s.name_bn, 'name_en', s.name_en, 'admission_no', s.admission_no, 'package', s.package,
                                  'current_level', s.current_level, 'batch', s.batch, 'status', s.status, 'next_due_date', s.next_due_date),
    'levels', to_jsonb(lv), 'fee', public.student_fee_state(s.id), 'blocked', why, 'counts', counts, 'materials', mats);
end $$;

revoke all on function public.student_fee_state(uuid) from public;
revoke all on function public.student_block_reason(public.students) from public;
revoke all on function public.can_read_material(text) from public;
revoke all on function public.link_student(text, text) from public;
revoke all on function public.student_me() from public;
grant execute on function public.can_read_material(text) to authenticated;
grant execute on function public.link_student(text, text) to authenticated;
grant execute on function public.student_me() to authenticated;

select 'SAKURA_V14_OK' as result;
