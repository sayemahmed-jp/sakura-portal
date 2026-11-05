-- =====================================================================
-- Sakura Portal · v40: উপ-পরিচালক (deputy director) role
-- * profiles.role can now also be 'deputy' (উপ-পরিচালক); invites can be made for it
-- * a deputy can see and do everything a director can with the institute's data
--   (fees, reports, expenses, settings, every student) — is_admin() now covers both
-- * only the director (role 'admin') manages people: inviting, changing roles, removing logins,
--   and seeing or editing other people's ID cards — the new is_director()
-- * an ID card's designation follows a role change (when it still had the old role's default)
-- Safe to run more than once.
-- =====================================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','deputy','staff','teacher'));
alter table public.staff_invites drop constraint if exists staff_invites_role_check;
alter table public.staff_invites add constraint staff_invites_role_check check (role in ('admin','deputy','staff','teacher'));

create or replace function public.is_director() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','deputy'));
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','deputy','staff'));
$$;
grant execute on function public.is_director() to authenticated;

-- people management stays with the director only
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all using (public.is_director()) with check (public.is_director());
drop policy if exists "admin all staff_invites" on public.staff_invites;
create policy "admin all staff_invites" on public.staff_invites for all using (public.is_director()) with check (public.is_director());
create or replace function public.admin_people() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_director() then raise exception 'not_allowed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'role', p.role, 'created_at', p.created_at,
                                                       'email', u.email, 'last_sign_in_at', u.last_sign_in_at) order by p.created_at)
                   from public.profiles p left join auth.users u on u.id = p.id), '[]'::jsonb);
end $$;
drop policy if exists "admin all staff_cards" on public.staff_cards;
create policy "admin all staff_cards" on public.staff_cards for all using (public.is_director()) with check (public.is_director());
drop policy if exists "staffphoto read" on storage.objects;
create policy "staffphoto read" on storage.objects for select to authenticated
  using (bucket_id = 'staffphoto' and (public.is_director() or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists "staffphoto upload" on storage.objects;
create policy "staffphoto upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'staffphoto' and (public.is_director() or (storage.foldername(name))[1] = auth.uid()::text));

-- ID cards: defaults for the new role, and the designation follows a role change
create or replace function public.role_title(p_role text) returns text language sql immutable as $$
  select case p_role when 'admin' then 'পরিচালক' when 'deputy' then 'উপ-পরিচালক' when 'teacher' then 'শিক্ষক' else 'অফিস স্টাফ' end $$;
create or replace function public.next_staff_no(p_role text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare pre text := 'SJI-' || case when p_role in ('admin','deputy') then 'D' when p_role = 'teacher' then 'T' else 'S' end || '-'; n int;
begin
  perform pg_advisory_xact_lock(hashtext('staff_no'));
  select coalesce(max(substring(staff_no from length(pre) + 1)::int), 0) + 1 into n from public.staff_cards where staff_no like pre || '%' and substring(staff_no from length(pre) + 1) ~ '^\d+$';
  return pre || lpad(n::text, 3, '0');
end $$;
create or replace function public.profile_card() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.staff_cards (profile_id, staff_no, designation, valid_until)
  values (new.id, public.next_staff_no(new.role), public.role_title(new.role), (current_date + interval '2 years')::date)
  on conflict (profile_id) do nothing;
  return new;
end $$;
create or replace function public.profile_role_title() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    update public.staff_cards set designation = public.role_title(new.role), updated_at = now()
     where profile_id = new.id and (designation = '' or designation = public.role_title(old.role));
  end if;
  return new;
end $$;
drop trigger if exists profile_role_title on public.profiles;
create trigger profile_role_title after update of role on public.profiles for each row execute function public.profile_role_title();
select 'SAKURA_V40_OK' as result;
