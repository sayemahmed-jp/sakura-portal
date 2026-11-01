-- =====================================================================
-- Sakura Portal · v13: director-only areas
-- * expenses (খরচ, বেতন, লাভ-ক্ষতি)  — only the director can see or add
-- * teachers (বেতনের হার, NID, ঠিকানা) — only the director; staff get just
--   the names through teacher_list (for picking a teacher on the attendance page)
-- * course fee / discount / processing fee — staff cannot give a discount,
--   set a processing fee, or put a fee below the package price
-- (commissions and the activity log were already director-only)
-- Safe to run more than once.
-- =====================================================================

-- ---------- expenses: director only ----------
drop policy if exists "staff select expenses" on public.expenses;
drop policy if exists "staff insert expenses" on public.expenses;
drop policy if exists "admin select expenses" on public.expenses;
create policy "admin select expenses" on public.expenses for select using (public.is_admin());
drop policy if exists "admin insert expenses" on public.expenses;
create policy "admin insert expenses" on public.expenses for insert with check (public.is_admin());

-- ---------- teachers: director only, names for staff ----------
drop policy if exists "staff select teachers" on public.teachers;
drop policy if exists "admin select teachers" on public.teachers;
create policy "admin select teachers" on public.teachers for select using (public.is_admin());

create or replace view public.teacher_list as
  select id, name, levels, active from public.teachers where public.is_staff();
revoke all on public.teacher_list from public, anon;
grant select on public.teacher_list to authenticated;

-- ---------- fees: only the director may give discounts ----------
create or replace function public.guard_student_fees() returns trigger
language plpgsql security definer set search_path = public as $$
declare list_price integer;
begin
  -- SQL editor / server jobs (no logged-in user) and the director are not limited
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.discount, 0) <> 0 then raise exception 'ছাড় দিতে পারেন শুধু পরিচালক (only the director can give a discount)'; end if;
    if coalesce(new.processing_fee, 0) <> 0 then raise exception 'প্রসেসিং ফি ঠিক করতে পারেন শুধু পরিচালক (only the director can set the processing fee)'; end if;
  else
    if new.discount is distinct from old.discount then raise exception 'ছাড় বদলাতে পারেন শুধু পরিচালক (only the director can change the discount)'; end if;
    if new.processing_fee is distinct from old.processing_fee then raise exception 'প্রসেসিং ফি বদলাতে পারেন শুধু পরিচালক (only the director can change the processing fee)'; end if;
    if new.total_fee is not distinct from old.total_fee then return new; end if;
  end if;
  -- package price from Settings; if Settings were never saved, the portal's built-in prices
  select nullif(data -> 'fees' ->> new.package, '')::integer into list_price from public.settings where id = 1;
  if list_price is null then
    list_price := ('{"N5":20000,"N4":20000,"N3":22000,"N5+N4":35000,"N5+N4+N3":45000}'::jsonb ->> new.package)::integer;
  end if;
  if list_price is not null and coalesce(new.total_fee, 0) < list_price then
    raise exception 'মোট ফি প্যাকেজের দামের (৳%) চেয়ে কম রাখতে পারেন শুধু পরিচালক (only the director can lower the fee)', list_price;
  end if;
  return new;
end $$;

drop trigger if exists guard_student_fees on public.students;
create trigger guard_student_fees before insert or update on public.students
  for each row execute function public.guard_student_fees();

select 'SAKURA_V13_OK' as result;
