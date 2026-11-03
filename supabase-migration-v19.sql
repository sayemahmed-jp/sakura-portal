-- =====================================================================
-- Sakura Portal · v19: mock tests are grouped by kind, and a place for listening practice
-- * mock_tests.category: full (পূর্ণ মক), kanji (কানজি), grammar (ব্যাকরণ),
--   listening (শোনার অনুশীলন), other (অন্যান্য) — existing tests are sorted by their titles
-- * student_mock_list() also returns the category, so the student site groups tests the same way
-- * two empty listening practice tests (N5, N4) are made, hidden, ready for audio to be added
--   (students never see a test until it has questions and is turned on)
-- Safe to run more than once.
-- =====================================================================

alter table public.mock_tests add column if not exists category text not null default 'other';
alter table public.mock_tests drop constraint if exists mock_tests_category_check;
alter table public.mock_tests add constraint mock_tests_category_check check (category in ('full','kanji','grammar','listening','other'));

update public.mock_tests set category = case
    when title like '%মক টেস্ট%' then 'full'
    when title like '%কানজি%' then 'kanji'
    when title like '%ব্যাকরণ%' then 'grammar'
    when title like '%শোনা%' then 'listening'
    else 'other' end
 where category = 'other';

insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order)
select v.title, v.level, 'listening', 'শোনার অনুশীলন · অডিও যোগ করা হবে', 20, 60, false, v.so
  from (values ('N5 শোনার অনুশীলন ১', 'N5', 300), ('N4 শোনার অনুশীলন ১', 'N4', 330)) v(title, level, so)
 where not exists (select 1 from public.mock_tests m where m.title = v.title);

create or replace function public.student_mock_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.students;
begin
  begin s := public.mock_student(); exception when others then return '[]'::jsonb; end;
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'level', t.level, 'category', t.category, 'description', t.description,
      'duration_min', t.duration_min, 'pass_pct', t.pass_pct, 'max_attempts', t.max_attempts,
      'questions', (select count(*) from public.mock_questions q where q.test_id = t.id),
      'attempts', (select count(*) from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null),
      'best', (select max(score) from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null),
      'last_attempt', (select id from public.mock_attempts a where a.test_id = t.id and a.student_id = s.id and a.submitted_at is not null order by a.submitted_at desc limit 1),
      'open_attempt', null)
    order by case t.level when 'N5' then 1 when 'N4' then 2 else 3 end,
             case t.category when 'full' then 1 when 'kanji' then 2 when 'grammar' then 3 when 'listening' then 4 else 5 end, t.sort_order, t.created_at)
    from public.mock_tests t where t.published and t.level = any(public.student_levels(s.package, s.current_level))
      and exists (select 1 from public.mock_questions q where q.test_id = t.id)), '[]'::jsonb);
end $$;

select 'SAKURA_V19_OK' as result, category, count(*) from public.mock_tests group by category order by category;
