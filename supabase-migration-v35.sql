-- =====================================================================
-- Sakura Portal · v35: টাকা পাঠানোর প্রমাণ (bKash / Nagad / bank) from the student site
-- * pay_proofs — the student says "I sent ৳X by bKash, TrxID …" with an optional screenshot;
--   the office checks its own bKash/Nagad statement, then records the payment (receipt) or rejects it
-- * storage bucket "payproof" (private): files under <student id>/…; a student sees only their own
-- * student_payproofs() — the institute's payment numbers + the student's own proofs
-- * student_payproof_submit(...) — send a proof (at most 3 waiting; the same TrxID only once)
-- Nothing here changes a student's fees: only a payment the office records does.
-- Safe to run more than once.
-- =====================================================================
create table if not exists public.pay_proofs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  method text not null check (method in ('bkash','nagad','bank')),
  amount integer not null check (amount > 0 and amount <= 1000000),
  trx_id text not null default '',
  sender text not null default '',
  paid_on date not null,
  file_path text,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reply text not null default '',
  payment_id uuid references public.payments(id) on delete set null,
  checked_by text default '',
  checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pay_proofs_created_idx on public.pay_proofs(created_at desc);
create unique index if not exists pay_proofs_trx_uniq on public.pay_proofs(upper(trx_id)) where trx_id <> '' and status <> 'rejected';
alter table public.pay_proofs enable row level security;
grant select, update, delete on public.pay_proofs to authenticated;
drop policy if exists "member select pay_proofs" on public.pay_proofs;
create policy "member select pay_proofs" on public.pay_proofs for select using (public.is_member());
drop policy if exists "member update pay_proofs" on public.pay_proofs;
create policy "member update pay_proofs" on public.pay_proofs for update using (public.is_member()) with check (public.is_member());
drop policy if exists "member delete pay_proofs" on public.pay_proofs;
create policy "member delete pay_proofs" on public.pay_proofs for delete using (public.is_member());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payproof', 'payproof', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "payproof read" on storage.objects;
create policy "payproof read" on storage.objects for select to authenticated
  using (bucket_id = 'payproof' and (public.is_member() or (storage.foldername(name))[1] = public.my_student_id()::text));
drop policy if exists "payproof student upload" on storage.objects;
create policy "payproof student upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'payproof' and (storage.foldername(name))[1] = public.my_student_id()::text);
drop policy if exists "payproof delete" on storage.objects;
create policy "payproof delete" on storage.objects for delete to authenticated
  using (bucket_id = 'payproof' and public.is_member());

create or replace function public.student_payproofs() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid uuid; st jsonb;
begin
  select id into sid from public.students where auth_user_id = auth.uid();
  if sid is null then return null; end if;
  select data into st from public.settings where id = 1; st := coalesce(st, '{}'::jsonb);
  return jsonb_build_object(
    'numbers', jsonb_build_object('bkash', coalesce(st ->> 'pay_bkash', ''), 'nagad', coalesce(st ->> 'pay_nagad', ''), 'bank', coalesce(st ->> 'pay_bank', '')),
    'list', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'method', p.method, 'amount', p.amount, 'trx_id', p.trx_id, 'sender', p.sender, 'paid_on', p.paid_on,
              'has_file', p.file_path is not null, 'note', p.note, 'status', p.status, 'reply', p.reply, 'receipt_no', (select receipt_no from public.payments x where x.id = p.payment_id),
              'checked_at', p.checked_at, 'created_at', p.created_at) order by p.created_at desc)
            from (select * from public.pay_proofs where student_id = sid order by created_at desc limit 30) p), '[]'::jsonb));
end $$;

create or replace function public.student_payproof_submit(p_method text, p_amount integer, p_trx text, p_sender text, p_paid_on date, p_file text, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s public.students; trx text := upper(btrim(coalesce(p_trx, '')));
begin
  select * into s from public.students where auth_user_id = auth.uid();
  if not found or s.status = 'dropped' then raise exception 'not_linked'; end if;
  if p_method not in ('bkash','nagad','bank') then raise exception 'bad_method'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000 then raise exception 'bad_amount'; end if;
  if p_paid_on is null or p_paid_on > public.bd_today() or p_paid_on < public.bd_today() - 60 then raise exception 'bad_date'; end if;
  if p_method <> 'bank' and length(trx) < 6 then raise exception 'need_trx'; end if;
  if trx = '' and coalesce(p_file, '') = '' then raise exception 'need_trx'; end if;
  if coalesce(p_file, '') <> '' and position((s.id::text || '/') in p_file) <> 1 then raise exception 'bad_file'; end if;
  if (select count(*) from public.pay_proofs where student_id = s.id and status = 'pending') >= 3 then raise exception 'busy'; end if;
  if trx <> '' and (exists (select 1 from public.pay_proofs where upper(trx_id) = trx and status <> 'rejected')
                    or exists (select 1 from public.payments where upper(btrim(coalesce(trx_id, ''))) = trx)) then raise exception 'dup_trx'; end if;
  insert into public.pay_proofs (student_id, method, amount, trx_id, sender, paid_on, file_path, note)
  values (s.id, p_method, p_amount, trx, left(btrim(coalesce(p_sender, '')), 20), p_paid_on, nullif(p_file, ''), left(btrim(coalesce(p_note, '')), 500));
  return public.student_payproofs();
end $$;
revoke all on function public.student_payproofs() from public;
revoke all on function public.student_payproof_submit(text, integer, text, text, date, text, text) from public;
grant execute on function public.student_payproofs() to authenticated;
grant execute on function public.student_payproof_submit(text, integer, text, text, date, text, text) to authenticated;
select 'SAKURA_V35_OK' as result;
