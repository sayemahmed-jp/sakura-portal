-- =====================================================================
-- Sakura Portal · v16: three kinds of login — director, office staff, teacher
-- * profiles.role: 'admin' (পরিচালক), 'staff' (অফিস স্টাফ), 'teacher' (শিক্ষক)
-- * is_staff()  now means office (admin or staff) — everything that used it stays office-only
-- * is_member() means any portal login, teachers included
-- * Teachers get: attendance, classes, exams & marks, study materials, mock tests,
--   the calendar, and a class list of students WITHOUT phone, address, NID/passport,
--   fees or documents (student_roster). Nothing about money, admissions or Japan files.
-- * Students (student site) are unchanged: they have no profile, so none of this applies.
-- Safe to run more than once.
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','staff','teacher'));

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','staff'));
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to anon, authenticated;

-- ---------- what every portal login (teachers too) may use ----------
drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select using (public.is_member());
drop policy if exists "staff read settings" on public.settings;
create policy "staff read settings" on public.settings for select using (public.is_member());

do $$
declare t text;
begin
  -- teachers take attendance, run exams, write marks, and build materials and mock tests
  foreach t in array array['sessions','attendance','exams','exam_results','materials','mock_tests','mock_questions'] loop
    execute format('drop policy if exists "staff select %1$s" on public.%1$s', t);
    execute format('create policy "staff select %1$s" on public.%1$s for select using (public.is_member())', t);
    execute format('drop policy if exists "staff insert %1$s" on public.%1$s', t);
    execute format('create policy "staff insert %1$s" on public.%1$s for insert with check (public.is_member())', t);
    execute format('drop policy if exists "staff update %1$s" on public.%1$s', t);
    execute format('create policy "staff update %1$s" on public.%1$s for update using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;
drop policy if exists "staff select mock_attempts" on public.mock_attempts;
create policy "staff select mock_attempts" on public.mock_attempts for select using (public.is_member());
drop policy if exists "staff select holidays" on public.holidays;
create policy "staff select holidays" on public.holidays for select using (public.is_member());

-- study materials files (and listening audio for mock tests)
drop policy if exists "staff read materials" on storage.objects;
create policy "staff read materials" on storage.objects for select using (bucket_id = 'materials' and public.is_member());
drop policy if exists "staff upload materials" on storage.objects;
create policy "staff upload materials" on storage.objects for insert with check (bucket_id = 'materials' and public.is_member());
drop policy if exists "staff update materials" on storage.objects;
create policy "staff update materials" on storage.objects for update using (bucket_id = 'materials' and public.is_member());

-- teacher names for the attendance page
create or replace view public.teacher_list as
  select id, name, levels, active from public.teachers where public.is_member();
revoke all on public.teacher_list from public, anon;
grant select on public.teacher_list to authenticated;

-- class list for teachers: no phone, address, NID/passport, guardian, fees or notes
create or replace view public.student_roster as
  select id, admission_no, admission_date, name_bn, name_en, gender, package, current_level, batch, status, start_date, japan_stage, created_at
  from public.students where public.is_member();
revoke all on public.student_roster from public, anon;
grant select on public.student_roster to authenticated;

-- the student site: any portal login (teachers too) is told it is a staff login
create or replace function public.link_student(p_admission_no text, p_phone text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); ph text; s public.students;
begin
  if uid is null then return 'login'; end if;
  if public.is_member() then return 'staff'; end if;
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

create or replace function public.student_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.students; st jsonb; why text; lv text[]; mats jsonb; counts jsonb;
begin
  if uid is null then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  select * into s from public.students where auth_user_id = uid;
  if not found then
    return jsonb_build_object('linked', false, 'staff', public.is_member(),
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

select 'SAKURA_V16_OK' as result;
