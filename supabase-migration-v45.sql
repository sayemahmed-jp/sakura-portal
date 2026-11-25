-- Sakura Portal v45 · office staff may give a discount when the director allows it.
-- * Settings → "স্টাফের ছাড় দেওয়ার অনুমতি" (settings.data.staff_discount = true) lets staff set the discount
--   at admission. The portal asks for a reason and shows every staff discount to the director until marked seen.
-- * With the switch off (default) the old rule stays: only the director gives discounts.
-- * Processing fee and the list price stay director-only.
-- Safe to run more than once.
create or replace function public.guard_student_fees() returns trigger
language plpgsql security definer set search_path = public as $$
declare list_price integer; staff_disc boolean;
begin
  -- SQL editor / server jobs (no logged-in user) and the director are not limited
  if auth.uid() is null or public.is_admin() then return new; end if;
  select coalesce((data ->> 'staff_discount')::boolean, false) into staff_disc from public.settings where id = 1;
  staff_disc := coalesce(staff_disc, false);
  if tg_op = 'INSERT' then
    if coalesce(new.discount, 0) <> 0 and not staff_disc then raise exception 'ছাড় দিতে পারেন শুধু পরিচালক (only the director can give a discount)'; end if;
    if coalesce(new.processing_fee, 0) <> 0 then raise exception 'প্রসেসিং ফি ঠিক করতে পারেন শুধু পরিচালক (only the director can set the processing fee)'; end if;
  else
    if new.discount is distinct from old.discount and not staff_disc then raise exception 'ছাড় বদলাতে পারেন শুধু পরিচালক (only the director can change the discount)'; end if;
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

select 'SAKURA_V45_OK' as result;
