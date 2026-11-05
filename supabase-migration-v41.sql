-- =====================================================================
-- Sakura Portal · v41: one change, updated everywhere
-- * the director's name: changing it on the ID card / login changes "ডিরেক্টরের নাম (ইংরেজি)" in
--   Settings, and changing it in Settings changes the director's login name (and so the ID card)
-- * a teacher in the শিক্ষক list and the same person's portal login are matched by e-mail:
--   a new name or phone in one is copied to the other (login name and ID card phone)
-- Safe to run more than once.
-- =====================================================================
create or replace function public.sync_profile_name() returns trigger
language plpgsql security definer set search_path = public as $$
declare em text;
begin
  if pg_trigger_depth() > 1 or new.name is not distinct from old.name or btrim(coalesce(new.name, '')) = '' then return new; end if;
  if new.role = 'admin' and (select count(*) from public.profiles where role = 'admin') = 1 then
    update public.settings set data = jsonb_set(coalesce(data, '{}'::jsonb), '{director_en}', to_jsonb(new.name)) where id = 1 and coalesce(data ->> 'director_en', '') <> new.name;
  end if;
  select lower(email) into em from auth.users where id = new.id;
  if em is not null then update public.teachers set name = new.name where lower(btrim(coalesce(email, ''))) = em and name is distinct from new.name; end if;
  return new;
end $$;
drop trigger if exists sync_profile_name on public.profiles;
create trigger sync_profile_name after update of name on public.profiles for each row execute function public.sync_profile_name();

create or replace function public.sync_settings_director() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text := btrim(coalesce(new.data ->> 'director_en', ''));
begin
  if pg_trigger_depth() > 1 or nm = '' or nm is not distinct from btrim(coalesce(old.data ->> 'director_en', '')) then return new; end if;
  if (select count(*) from public.profiles where role = 'admin') = 1 then update public.profiles set name = nm where role = 'admin' and name is distinct from nm; end if;
  return new;
end $$;
drop trigger if exists sync_settings_director on public.settings;
create trigger sync_settings_director after update on public.settings for each row execute function public.sync_settings_director();

create or replace function public.sync_teacher_login() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if pg_trigger_depth() > 1 or btrim(coalesce(new.email, '')) = '' then return new; end if;
  select id into pid from auth.users where lower(email) = lower(btrim(new.email)) limit 1;
  if pid is null then return new; end if;
  if btrim(coalesce(new.name, '')) <> '' then update public.profiles set name = new.name where id = pid and name is distinct from new.name; end if;
  if btrim(coalesce(new.phone, '')) <> '' then update public.staff_cards set phone = left(new.phone, 20), updated_at = now() where profile_id = pid and phone is distinct from left(new.phone, 20); end if;
  return new;
end $$;
drop trigger if exists sync_teacher_login on public.teachers;
create trigger sync_teacher_login after insert or update of name, phone, email on public.teachers for each row execute function public.sync_teacher_login();
select 'SAKURA_V41_OK' as result;
