-- Sakura Portal · destination questions: the answer is now に instead of へ (both are right; に is the one used most).
-- Only questions whose correct option was へ change; the option list keeps no へ, so there is still one right answer.
-- Safe to run more than once.
update public.mock_questions q set
  options = jsonb_set(q.options, array[q.correct::text], '"に"'::jsonb),
  explanation = replace(replace(replace(replace(q.explanation,
      'গন্তব্য বোঝাতে へ (বা に): にほんへ きました।', 'গন্তব্য বোঝাতে に (বা へ): にほんに きました।'),
      'গন্তব্যের দিক → へ (に-ও চলে)।', 'গন্তব্য → に (へ-ও চলে)।'),
      'জায়গা + へ (বা に)।', 'জায়গা + に (বা へ)।'),
      'কোথাও আসা → へ (বা に)।', 'কোথাও আসা → জায়গা + に (বা へ)।')
where (q.options->>q.correct) = 'へ' and not (q.options ? 'に');
select 'ROWS:'||count(*)||' still へ' from public.mock_questions q where (q.options->>q.correct) = 'へ';
