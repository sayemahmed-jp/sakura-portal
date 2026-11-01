-- =====================================================================
-- Sakura Portal · v11: public website & online admission form
-- * public_info()     — fees, phone, address etc. for the website (no student data)
-- * submit_inquiry()  — the website form adds a row to "আগ্রহী ছাত্র"
--   (checked and rate-limited; visitors can never read any data)
-- Safe to run more than once.
-- =====================================================================

create or replace function public.public_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'institute_bn', data ->> 'institute_bn', 'institute_en', data ->> 'institute_en', 'institute_ja', data ->> 'institute_ja',
    'phone', data ->> 'phone', 'whatsapp', data ->> 'whatsapp', 'email', data ->> 'email', 'address', data ->> 'address',
    'director_en', data ->> 'director_en', 'director_ja', data ->> 'director_ja',
    'fees', data -> 'fees', 'textbooks', data -> 'textbooks', 'hours_per_class', data -> 'hours_per_class')
  from public.settings where id = 1;
$$;

create or replace function public.submit_inquiry(p_name text, p_phone text, p_interest text, p_note text, p_source text default 'website')
returns text language plpgsql volatile security definer set search_path = public as $$
declare ph text; nm text;
begin
  nm := btrim(coalesce(p_name, ''));
  ph := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  if length(nm) < 2 or length(nm) > 80 then return 'bad_name'; end if;
  if length(regexp_replace(ph, '[^0-9]', '', 'g')) not between 9 and 15 then return 'bad_phone'; end if;
  if coalesce(p_interest, '') not in ('N5','N4','N3','japan','other') then p_interest := 'other'; end if;
  if coalesce(p_source, '') not in ('website','facebook','whatsapp','referral','other') then p_source := 'website'; end if;
  -- the same number twice within 10 minutes, or a flood of web submissions: ignore quietly
  if exists (select 1 from public.inquiries where regexp_replace(phone, '[^0-9+]', '', 'g') = ph and created_at > now() - interval '10 minutes') then return 'ok'; end if;
  if (select count(*) from public.inquiries where created_at > now() - interval '1 hour' and created_by is null) > 30 then return 'busy'; end if;
  insert into public.inquiries (created_on, name, phone, source, interest, status, next_follow_up, notes, created_by)
  values (current_date, nm, ph, p_source, p_interest, 'new', current_date,
          'ওয়েবসাইটের ফর্ম থেকে' || case when btrim(coalesce(p_note, '')) <> '' then ': ' || left(btrim(p_note), 500) else '' end, null);
  return 'ok';
end $$;

revoke all on function public.public_info() from public;
revoke all on function public.submit_inquiry(text, text, text, text, text) from public;
grant execute on function public.public_info() to anon, authenticated;
grant execute on function public.submit_inquiry(text, text, text, text, text) to anon, authenticated;

select 'SAKURA_V11_OK' as result;
