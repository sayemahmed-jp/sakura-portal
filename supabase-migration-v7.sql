-- =====================================================================
-- Sakura Portal · v7: activity log (কাজের রেকর্ড)
-- Every add / change / delete is written by the database itself, so nobody can
-- skip it from the portal. Only the admin can read it, and nobody can edit or
-- delete it through the portal (only from this SQL editor).
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  user_name text default '',
  action text not null check (action in ('insert','update','delete')),
  table_name text not null,
  row_id text,
  student_id uuid,
  old_data jsonb,
  new_data jsonb
);
create index if not exists audit_log_at_idx on public.audit_log(at desc);
create index if not exists audit_log_student_idx on public.audit_log(student_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists "admin read audit" on public.audit_log;
create policy "admin read audit" on public.audit_log for select using (public.is_admin());

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb; n jsonb; d_old jsonb := '{}'::jsonb; d_new jsonb := '{}'::jsonb;
  k text; rid text; sid text; who text;
begin
  if tg_op <> 'INSERT' then o := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then n := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      if k <> 'updated_at' and (o -> k) is distinct from (n -> k) then
        d_old := d_old || jsonb_build_object(k, o -> k);
        d_new := d_new || jsonb_build_object(k, n -> k);
      end if;
    end loop;
    if d_new = '{}'::jsonb then return null; end if;  -- nothing really changed
  end if;
  rid := coalesce(n ->> 'id', o ->> 'id');
  sid := coalesce(n ->> 'student_id', o ->> 'student_id', case when tg_table_name = 'students' then rid end);
  select name into who from public.profiles where id = auth.uid();
  insert into public.audit_log (user_id, user_name, action, table_name, row_id, student_id, old_data, new_data)
  values (auth.uid(), coalesce(who, ''), lower(tg_op), tg_table_name, rid, nullif(sid, '')::uuid,
          case tg_op when 'INSERT' then null when 'UPDATE' then d_old else o end,
          case tg_op when 'DELETE' then null when 'UPDATE' then d_new else n end);
  return null;
end $$;

do $$
declare t text;
begin
  -- every add, change and delete
  foreach t in array array['students','payments','sessions','documents','expenses','inquiries','exams','jp_schools','applications','teachers','settings','profiles'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_trigger()', t);
    end if;
  end loop;
  -- attendance and marks are entered in bulk every day: log only later changes and deletions
  foreach t in array array['attendance','exam_results'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
      execute format('create trigger audit_%1$s after update or delete on public.%1$s for each row execute function public.audit_trigger()', t);
    end if;
  end loop;
end $$;

select 'SAKURA_V7_OK' as result;
