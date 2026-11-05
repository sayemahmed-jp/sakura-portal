-- =====================================================================
-- Sakura Portal · v39: আইডি কার্ড for the director, office staff and teachers
-- * staff_cards — one card per portal login: an ID number made automatically (SJI-D-001 director,
--   SJI-S-001 office staff, SJI-T-001 teacher), designation, phone, blood group, photo, dates
-- * a card is created automatically whenever a new login is added (and now for everyone who exists)
-- * only the director sees and edits every card; everyone else sees only their own (my_staff_card)
--   and may change only their own phone, blood group and photo (my_staff_card_update)
-- * storage bucket "staffphoto" (private): <login id>/… — the director sees all, each person their own
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.staff_cards (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  staff_no text unique,
  designation text not null default '',
  phone text not null default '',
  blood_group text not null default '',
  photo_path text not null default '',
  joined_on date default current_date,
  valid_until date,
  updated_at timestamptz not null default now()
);
alter table public.staff_cards enable row level security;
grant select, insert, update, delete on public.staff_cards to authenticated;
drop policy if exists "admin all staff_cards" on public.staff_cards;
create policy "admin all staff_cards" on public.staff_cards for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "own staff_card" on public.staff_cards;
create policy "own staff_card" on public.staff_cards for select using (profile_id = auth.uid());

create or replace function public.next_staff_no(p_role text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare pre text := 'SJI-' || case p_role when 'admin' then 'D' when 'teacher' then 'T' else 'S' end || '-'; n int;
begin
  perform pg_advisory_xact_lock(hashtext('staff_no'));
  select coalesce(max(substring(staff_no from length(pre) + 1)::int), 0) + 1 into n from public.staff_cards where staff_no like pre || '%' and substring(staff_no from length(pre) + 1) ~ '^\d+$';
  return pre || lpad(n::text, 3, '0');
end $$;
revoke all on function public.next_staff_no(text) from public;

create or replace function public.profile_card() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.staff_cards (profile_id, staff_no, designation, valid_until)
  values (new.id, public.next_staff_no(new.role), case new.role when 'admin' then 'পরিচালক' when 'teacher' then 'শিক্ষক' else 'অফিস স্টাফ' end, (current_date + interval '2 years')::date)
  on conflict (profile_id) do nothing;
  return new;
end $$;
drop trigger if exists profile_card on public.profiles;
create trigger profile_card after insert on public.profiles for each row execute function public.profile_card();

-- everyone who already has a login gets a card, oldest first
do $$ declare p record; begin
  for p in select pr.* from public.profiles pr where not exists (select 1 from public.staff_cards c where c.profile_id = pr.id) order by pr.created_at loop
    insert into public.staff_cards (profile_id, staff_no, designation, valid_until)
    values (p.id, public.next_staff_no(p.role), case p.role when 'admin' then 'পরিচালক' when 'teacher' then 'শিক্ষক' else 'অফিস স্টাফ' end, (current_date + interval '2 years')::date);
  end loop; end $$;

create or replace function public.my_staff_card_update(p_phone text, p_blood text, p_photo text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if coalesce(p_photo, '') <> '' and position((auth.uid()::text || '/') in p_photo) <> 1 then raise exception 'bad_file'; end if;
  update public.staff_cards set phone = left(btrim(coalesce(p_phone, phone)), 20), blood_group = left(btrim(coalesce(p_blood, blood_group)), 5),
    photo_path = case when coalesce(p_photo, '') = '' then photo_path else p_photo end, updated_at = now()
   where profile_id = auth.uid();
end $$;
revoke all on function public.my_staff_card_update(text, text, text) from public;
grant execute on function public.my_staff_card_update(text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('staffphoto', 'staffphoto', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "staffphoto read" on storage.objects;
create policy "staffphoto read" on storage.objects for select to authenticated
  using (bucket_id = 'staffphoto' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists "staffphoto upload" on storage.objects;
create policy "staffphoto upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'staffphoto' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
select 'SAKURA_V39_OK' as result;
