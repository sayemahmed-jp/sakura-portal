-- Sakura Portal · easy tests that come before the existing ones: for N5 and N4, about 10 easy tests in each section
-- (full mock, kanji, grammar). Original questions written for Sakura. Added as hidden drafts: a teacher checks them, then turns them on.
-- Also renames the first easy kanji/grammar tests to number ১ and moves them to the top. Safe to run more than once.
update public.mock_tests set title = replace(title, ' (শুরু)', ' ১'), sort_order = -10 where title in ('N5 সহজ কানজি (শুরু)','N5 সহজ ব্যাকরণ (শুরু)','N4 সহজ কানজি (শুরু)','N4 সহজ ব্যাকরণ (শুরু)');
do $seed$ declare t uuid; begin
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ২$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ২$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -9) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「月曜日」-এর পড়া কোনটি?$m$, $m$["はなします", "げつようび", "はいります", "わかります"]$m$::jsonb, 1, $m$月曜日 = げつようび (সোমবার)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「日曜日」-এর পড়া কোনটি?$m$, $m$["にちようび", "せんしゅう", "はいります", "きんようび"]$m$::jsonb, 0, $m$日曜日 = にちようび (রবিবার)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「金曜日」-এর পড়া কোনটি?$m$, $m$["はなします", "はいります", "げつようび", "きんようび"]$m$::jsonb, 3, $m$金曜日 = きんようび (শুক্রবার)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「お金」-এর পড়া কোনটি?$m$, $m$["みます", "じゅう", "さかな", "おかね"]$m$::jsonb, 3, $m$お金 = おかね (টাকা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「ひとつ」কানজিতে কোনটি?$m$, $m$["今日", "明日", "電気", "一つ"]$m$::jsonb, 3, $m$ひとつ = 一つ (একটা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ふたつ」কানজিতে কোনটি?$m$, $m$["二つ", "学生", "電気", "今日"]$m$::jsonb, 0, $m$ふたつ = 二つ (দুইটা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「いつつ」কানজিতে কোনটি?$m$, $m$["五つ", "先生", "学校", "午後"]$m$::jsonb, 0, $m$いつつ = 五つ (পাঁচটা)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「六」মানে কী?$m$, $m$["উপরে", "বন্ধু", "সাত", "ছয়"]$m$::jsonb, 3, $m$六 (ろく) = ছয়।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「七」মানে কী?$m$, $m$["বৃষ্টি", "হাত", "সাত", "এখন"]$m$::jsonb, 2, $m$七 (なな) = সাত।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「八」মানে কী?$m$, $m$["দাঁড়ানো", "আট", "পড়া", "ছাত্র"]$m$::jsonb, 1, $m$八 (はち) = আট।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ৩$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ৩$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -8) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「九」-এর পড়া কোনটি?$m$, $m$["おおい", "でんき", "じかん", "きゅう"]$m$::jsonb, 3, $m$九 = きゅう (নয়)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「十」-এর পড়া কোনটি?$m$, $m$["ふるい", "じゅう", "じかん", "でます"]$m$::jsonb, 1, $m$十 = じゅう (দশ)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「百」-এর পড়া কোনটি?$m$, $m$["ひゃく", "ことし", "でます", "おおい"]$m$::jsonb, 0, $m$百 = ひゃく (একশো)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「千」-এর পড়া কোনটি?$m$, $m$["せん", "はち", "あめ", "ろく"]$m$::jsonb, 0, $m$千 = せん (এক হাজার)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「まん」কানজিতে কোনটি?$m$, $m$["万", "上", "今", "耳"]$m$::jsonb, 0, $m$まん = 万 (দশ হাজার)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「えん」কানজিতে কোনটি?$m$, $m$["道", "外", "円", "万"]$m$::jsonb, 2, $m$えん = 円 (ইয়েন (জাপানি টাকা))।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「うえ」কানজিতে কোনটি?$m$, $m$["九", "西", "円", "上"]$m$::jsonb, 3, $m$うえ = 上 (উপরে)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「下」মানে কী?$m$, $m$["ট্রেন", "দুপুরের পরে (PM)", "নিচে", "উত্তর"]$m$::jsonb, 2, $m$下 (した) = নিচে।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「中」মানে কী?$m$, $m$["বোঝা", "ভিতরে", "নাম", "(আমার) বাবা"]$m$::jsonb, 1, $m$中 (なか) = ভিতরে।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「外」মানে কী?$m$, $m$["ছাত্র", "বাইরে", "লেখা", "বন্ধু"]$m$::jsonb, 1, $m$外 (そと) = বাইরে।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ৪$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ৪$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -7) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「右」-এর পড়া কোনটি?$m$, $m$["そと", "みみ", "いま", "みぎ"]$m$::jsonb, 3, $m$右 = みぎ (ডান দিক)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「左」-এর পড়া কোনটি?$m$, $m$["でんき", "ひだり", "じかん", "ひゃく"]$m$::jsonb, 1, $m$左 = ひだり (বাম দিক)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「前」-এর পড়া কোনটি?$m$, $m$["まえ", "えき", "はん", "なな"]$m$::jsonb, 0, $m$前 = まえ (সামনে)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「後ろ」-এর পড়া কোনটি?$m$, $m$["ながい", "うしろ", "なまえ", "ひゃく"]$m$::jsonb, 1, $m$後ろ = うしろ (পিছনে)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「め」কানজিতে কোনটি?$m$, $m$["本", "花", "耳", "目"]$m$::jsonb, 3, $m$め = 目 (চোখ)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「みみ」কানজিতে কোনটি?$m$, $m$["耳", "六", "母", "八"]$m$::jsonb, 0, $m$みみ = 耳 (কান)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「て」কানজিতে কোনটি?$m$, $m$["空", "手", "十", "左"]$m$::jsonb, 1, $m$て = 手 (হাত)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「足」মানে কী?$m$, $m$["পা", "আগামী বছর", "ঢোকা", "দোকান"]$m$::jsonb, 0, $m$足 (あし) = পা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「雨」মানে কী?$m$, $m$["শুক্রবার", "ভিতরে", "কান", "বৃষ্টি"]$m$::jsonb, 3, $m$雨 (あめ) = বৃষ্টি।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「天気」মানে কী?$m$, $m$["ছোট", "আবহাওয়া", "পুরুষ মানুষ", "লম্বা"]$m$::jsonb, 1, $m$天気 (てんき) = আবহাওয়া।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ৫$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ৫$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -6) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「花」-এর পড়া কোনটি?$m$, $m$["はな", "そら", "にし", "した"]$m$::jsonb, 0, $m$花 = はな (ফুল)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「空」-এর পড়া কোনটি?$m$, $m$["した", "なな", "えき", "そら"]$m$::jsonb, 3, $m$空 = そら (আকাশ)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「車」-এর পড়া কোনটি?$m$, $m$["くるま", "うしろ", "あした", "きます"]$m$::jsonb, 0, $m$車 = くるま (গাড়ি)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「電車」-এর পড়া কোনটি?$m$, $m$["ともだち", "でんしゃ", "がっこう", "たべます"]$m$::jsonb, 1, $m$電車 = でんしゃ (ট্রেন)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「えき」কানজিতে কোনটি?$m$, $m$["東", "南", "上", "駅"]$m$::jsonb, 3, $m$えき = 駅 (স্টেশন)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「みち」কানজিতে কোনটি?$m$, $m$["道", "円", "六", "本"]$m$::jsonb, 0, $m$みち = 道 (রাস্তা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「みせ」কানজিতে কোনটি?$m$, $m$["店", "父", "八", "雨"]$m$::jsonb, 0, $m$みせ = 店 (দোকান)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「学校」মানে কী?$m$, $m$["স্কুল", "স্টেশন", "নিচে", "ভিতরে"]$m$::jsonb, 0, $m$学校 (がっこう) = স্কুল।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「先生」মানে কী?$m$, $m$["সোমবার", "আগামীকাল", "শিক্ষক", "স্কুল"]$m$::jsonb, 2, $m$先生 (せんせい) = শিক্ষক।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「学生」মানে কী?$m$, $m$["দশ", "বই", "ছাত্র", "গাড়ি"]$m$::jsonb, 2, $m$学生 (がくせい) = ছাত্র।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ৬$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ৬$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -5) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「友だち」-এর পড়া কোনটি?$m$, $m$["でんしゃ", "ともだち", "のみます", "まいにち"]$m$::jsonb, 1, $m$友だち = ともだち (বন্ধু)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「父」-এর পড়া কোনটি?$m$, $m$["ちち", "えん", "いま", "くに"]$m$::jsonb, 0, $m$父 = ちち ((আমার) বাবা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「母」-এর পড়া কোনটি?$m$, $m$["はは", "はな", "ろく", "みみ"]$m$::jsonb, 0, $m$母 = はは ((আমার) মা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「子ども」-এর পড়া কোনটি?$m$, $m$["やすい", "こども", "くるま", "いつつ"]$m$::jsonb, 1, $m$子ども = こども (শিশু)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「おとこのひと」কানজিতে কোনটি?$m$, $m$["出ます", "女の人", "男の人", "月曜日"]$m$::jsonb, 2, $m$おとこのひと = 男の人 (পুরুষ মানুষ)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「おんなのひと」কানজিতে কোনটি?$m$, $m$["女の人", "月曜日", "来ます", "日曜日"]$m$::jsonb, 0, $m$おんなのひと = 女の人 (মহিলা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「なまえ」কানজিতে কোনটি?$m$, $m$["時間", "名前", "一つ", "古い"]$m$::jsonb, 1, $m$なまえ = 名前 (নাম)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「本」মানে কী?$m$, $m$["বই", "দোকান", "দেখা", "স্টেশন"]$m$::jsonb, 0, $m$本 (ほん) = বই।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「今」মানে কী?$m$, $m$["শোনা", "ছোট", "বোঝা", "এখন"]$m$::jsonb, 3, $m$今 (いま) = এখন।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「今日」মানে কী?$m$, $m$["আজ", "ঢোকা", "শিশু", "দাঁড়ানো"]$m$::jsonb, 0, $m$今日 (きょう) = আজ।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ৭$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ৭$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -4) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「明日」-এর পড়া কোনটি?$m$, $m$["じかん", "なまえ", "ひとつ", "あした"]$m$::jsonb, 3, $m$明日 = あした (আগামীকাল)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「毎日」-এর পড়া কোনটি?$m$, $m$["かいます", "まいにち", "あいます", "かきます"]$m$::jsonb, 1, $m$毎日 = まいにち (প্রতিদিন)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「午前」-এর পড়া কোনটি?$m$, $m$["ごぜん", "でます", "きょう", "あした"]$m$::jsonb, 0, $m$午前 = ごぜん (দুপুরের আগে (AM))।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「午後」-এর পড়া কোনটি?$m$, $m$["まん", "みせ", "くに", "ごご"]$m$::jsonb, 3, $m$午後 = ごご (দুপুরের পরে (PM))।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「じかん」কানজিতে কোনটি?$m$, $m$["安い", "時間", "一つ", "高い"]$m$::jsonb, 1, $m$じかん = 時間 (সময়)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「はん」কানজিতে কোনটি?$m$, $m$["母", "中", "半", "千"]$m$::jsonb, 2, $m$はん = 半 (সাড়ে / অর্ধেক)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「ことし」কানজিতে কোনটি?$m$, $m$["一つ", "先生", "今年", "多い"]$m$::jsonb, 2, $m$ことし = 今年 (এ বছর)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「来年」মানে কী?$m$, $m$["আগামী বছর", "এক হাজার", "দশ হাজার", "দেখা"]$m$::jsonb, 0, $m$来年 (らいねん) = আগামী বছর।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「先週」মানে কী?$m$, $m$["এ বছর", "টাকা", "ভিতরে", "গত সপ্তাহ"]$m$::jsonb, 3, $m$先週 (せんしゅう) = গত সপ্তাহ।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「国」মানে কী?$m$, $m$["স্কুল", "দেশ", "আবহাওয়া", "দাঁড়ানো"]$m$::jsonb, 1, $m$国 (くに) = দেশ।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ৮$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ৮$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -3) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「小さい」-এর পড়া কোনটি?$m$, $m$["せんせい", "がっこう", "たちます", "ちいさい"]$m$::jsonb, 3, $m$小さい = ちいさい (ছোট)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「高い」-এর পড়া কোনটি?$m$, $m$["こども", "たかい", "でんき", "くるま"]$m$::jsonb, 1, $m$高い = たかい (উঁচু / দামি)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「安い」-এর পড়া কোনটি?$m$, $m$["ふるい", "やすい", "てんき", "くるま"]$m$::jsonb, 1, $m$安い = やすい (সস্তা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「新しい」-এর পড়া কোনটি?$m$, $m$["にちようび", "あたらしい", "はなします", "げつようび"]$m$::jsonb, 1, $m$新しい = あたらしい (নতুন)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「ふるい」কানজিতে কোনটি?$m$, $m$["古い", "時間", "先週", "後ろ"]$m$::jsonb, 0, $m$ふるい = 古い (পুরোনো)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ながい」কানজিতে কোনটি?$m$, $m$["今日", "長い", "白い", "明日"]$m$::jsonb, 1, $m$ながい = 長い (লম্বা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「しろい」কানজিতে কোনটি?$m$, $m$["白い", "高い", "学校", "安い"]$m$::jsonb, 0, $m$しろい = 白い (সাদা)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「多い」মানে কী?$m$, $m$["অনেক", "বিশ্রাম নেওয়া", "খাওয়া", "পুরুষ মানুষ"]$m$::jsonb, 0, $m$多い (おおい) = অনেক।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「少ない」মানে কী?$m$, $m$["প্রতিদিন", "কম", "শুক্রবার", "শিক্ষক"]$m$::jsonb, 1, $m$少ない (すくない) = কম।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「行きます」মানে কী?$m$, $m$["এ বছর", "যাওয়া", "অনেক", "দুপুরের আগে (AM)"]$m$::jsonb, 1, $m$行きます (いきます) = যাওয়া।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ৯$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ৯$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -2) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「来ます」-এর পড়া কোনটি?$m$, $m$["きます", "てんき", "なまえ", "でんき"]$m$::jsonb, 0, $m$来ます = きます (আসা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「見ます」-এর পড়া কোনটি?$m$, $m$["しろい", "やすい", "くるま", "みます"]$m$::jsonb, 3, $m$見ます = みます (দেখা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「聞きます」-এর পড়া কোনটি?$m$, $m$["かいます", "ききます", "らいねん", "まいにち"]$m$::jsonb, 1, $m$聞きます = ききます (শোনা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「書きます」-এর পড়া কোনটি?$m$, $m$["でんしゃ", "のみます", "かきます", "らいねん"]$m$::jsonb, 2, $m$書きます = かきます (লেখা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「よみます」কানজিতে কোনটি?$m$, $m$["会います", "食べます", "読みます", "飲みます"]$m$::jsonb, 2, $m$よみます = 読みます (পড়া)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「はなします」কানজিতে কোনটি?$m$, $m$["話します", "会います", "読みます", "行きます"]$m$::jsonb, 0, $m$はなします = 話します (কথা বলা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「たべます」কানজিতে কোনটি?$m$, $m$["話します", "飲みます", "食べます", "休みます"]$m$::jsonb, 2, $m$たべます = 食べます (খাওয়া)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「飲みます」মানে কী?$m$, $m$["বই", "হাত", "পান করা", "ছয়"]$m$::jsonb, 2, $m$飲みます (のみます) = পান করা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「休みます」মানে কী?$m$, $m$["(আমার) বাবা", "বিশ্রাম নেওয়া", "নিচে", "চোখ"]$m$::jsonb, 1, $m$休みます (やすみます) = বিশ্রাম নেওয়া।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「入ります」মানে কী?$m$, $m$["মাছ", "সামনে", "ঢোকা", "আগামীকাল"]$m$::jsonb, 2, $m$入ります (はいります) = ঢোকা।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি ১০$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি ১০$m$, 'N5', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -1) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「出ます」-এর পড়া কোনটি?$m$, $m$["でます", "きょう", "ひとつ", "おかね"]$m$::jsonb, 0, $m$出ます = でます (বের হওয়া)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「立ちます」-এর পড়া কোনটি?$m$, $m$["かいます", "たちます", "がっこう", "たべます"]$m$::jsonb, 1, $m$立ちます = たちます (দাঁড়ানো)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「買います」-এর পড়া কোনটি?$m$, $m$["がくせい", "ちいさい", "でんしゃ", "かいます"]$m$::jsonb, 3, $m$買います = かいます (কেনা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「会います」-এর পড়া কোনটি?$m$, $m$["せんせい", "がっこう", "かきます", "あいます"]$m$::jsonb, 3, $m$会います = あいます (দেখা করা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「わかります」কানজিতে কোনটি?$m$, $m$["分かります", "書きます", "食べます", "会います"]$m$::jsonb, 0, $m$わかります = 分かります (বোঝা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「でんき」কানজিতে কোনটি?$m$, $m$["多い", "電気", "学校", "天気"]$m$::jsonb, 1, $m$でんき = 電気 (বাতি / বিদ্যুৎ)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「きた」কানজিতে কোনটি?$m$, $m$["左", "北", "中", "本"]$m$::jsonb, 1, $m$きた = 北 (উত্তর)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「南」মানে কী?$m$, $m$["দক্ষিণ", "রাস্তা", "ছাত্র", "পান করা"]$m$::jsonb, 0, $m$南 (みなみ) = দক্ষিণ।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「東」মানে কী?$m$, $m$["সাদা", "দেখা করা", "পূর্ব", "স্টেশন"]$m$::jsonb, 2, $m$東 (ひがし) = পূর্ব।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「西」মানে কী?$m$, $m$["পশ্চিম", "বাম দিক", "মাছ", "লম্বা"]$m$::jsonb, 0, $m$西 (にし) = পশ্চিম।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ২$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ২$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -9) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$たなかさん（　）にほんじんです。$m$, $m$["へ", "で", "を", "は"]$m$::jsonb, 3, $m$কারো পরিচয় দিতে → …は …です।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$これは にほんご（　）ほんです。$m$, $m$["に", "を", "の", "で"]$m$::jsonb, 2, $m$"জাপানি ভাষার বই" → にほんごの ほん।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$まいにち みず（　）のみます。$m$, $m$["を", "に", "へ", "で"]$m$::jsonb, 0, $m$যা পান করি তার পরে を।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$わたしは がっこう（　）いきます。$m$, $m$["に", "で", "を", "の"]$m$::jsonb, 0, $m$কোথাও যাওয়া → জায়গা + に (বা へ)।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$こうえん（　）あそびます。$m$, $m$["へ", "を", "で", "の"]$m$::jsonb, 2, $m$কাজটা যেখানে হয় → জায়গা + で।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$6じ（　）うちへ かえります。$m$, $m$["で", "を", "の", "に"]$m$::jsonb, 3, $m$নির্দিষ্ট সময়ের পরে に।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$バス（　）がっこうへ いきます。$m$, $m$["を", "に", "の", "で"]$m$::jsonb, 3, $m$যানবাহন / উপায় → で।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$はは（　）いっしょに かいものを します。$m$, $m$["を", "へ", "で", "と"]$m$::jsonb, 3, $m$"মায়ের সাথে" → ははと いっしょに।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$へやに ねこ（　）います。$m$, $m$["へ", "が", "で", "を"]$m$::jsonb, 1, $m$います / あります-এর আগে が।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$わたしは りんご（　）すきです。$m$, $m$["で", "が", "へ", "を"]$m$::jsonb, 1, $m$すき-র আগে が।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ৩$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ৩$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -8) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$つくえの した（　）かばんが あります。$m$, $m$["で", "へ", "に", "を"]$m$::jsonb, 2, $m$জিনিস কোথায় আছে → জায়গা + に あります।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$9じ（　）5じまで はたらきます。$m$, $m$["の", "から", "が", "を"]$m$::jsonb, 1, $m$"৯টা থেকে" → から।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$ぎんこうは 3じ（　）です。$m$, $m$["が", "へ", "まで", "を"]$m$::jsonb, 2, $m$"৩টা পর্যন্ত" → まで।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$たなかさんは がくせいです。わたし（　）がくせいです。$m$, $m$["に", "も", "を", "で"]$m$::jsonb, 1, $m$"আমিও" → も।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$A「これは だれの かさですか。」
B「わたし（　）です。」$m$, $m$["が", "に", "を", "の"]$m$::jsonb, 3, $m$"আমার (টা)" → わたしの।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$A「あれは（　）ですか。」
B「ゆうびんきょくです。」$m$, $m$["なん", "だれ", "いくら", "いつ"]$m$::jsonb, 0, $m$"ওটা কী?" → なんですか।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$A「（　）が せんせいですか。」
B「あの ひとです。」$m$, $m$["だれ", "なに", "どこ", "いつ"]$m$::jsonb, 0, $m$"কে" → だれ।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$A「トイレは（　）ですか。」
B「あそこです。」$m$, $m$["どこ", "いつ", "だれ", "なに"]$m$::jsonb, 0, $m$"কোথায়" → どこ।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$A「たんじょうびは（　）ですか。」
B「5がつ 3かです。」$m$, $m$["いつ", "なに", "どこ", "だれ"]$m$::jsonb, 0, $m$"কবে" → いつ।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$A「この りんごは（　）ですか。」
B「100えんです。」$m$, $m$["どこ", "いくら", "だれ", "いつ"]$m$::jsonb, 1, $m$দাম জিজ্ঞেস → いくら।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ৪$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ৪$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -7) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$A「おくには（　）ですか。」
B「バングラデシュです。」$m$, $m$["だれ", "いつ", "いくら", "どちら"]$m$::jsonb, 3, $m$দেশ জিজ্ঞেস করতে ভদ্রভাবে → どちら।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$きのう えいがを（　）。$m$, $m$["みましょう", "みません", "みました", "みます"]$m$::jsonb, 2, $m$きのう (গতকাল) → অতীত みました।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$あした ともだちに（　）。$m$, $m$["あいました", "あいましたか", "あいます", "あいませんでした"]$m$::jsonb, 2, $m$あした (আগামীকাল) → ます রূপ।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$A「コーヒーを のみますか。」
B「はい、（　）。」$m$, $m$["のみました", "のみません", "のみませんでした", "のみます"]$m$::jsonb, 3, $m$はい → হ্যাঁ-বাচক উত্তর।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$けさ いそがしかったです。あさごはんを（　）。$m$, $m$["たべませんでした", "たべません", "たべましょう", "たべます"]$m$::jsonb, 0, $m$অতীতে "খাইনি" → ませんでした।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$A「いっしょに ひるごはんを たべませんか。」
B「ええ、（　）。」$m$, $m$["たべた", "たべましょう", "たべません", "たべませんでした"]$m$::jsonb, 1, $m$আমন্ত্রণে রাজি → ええ、…ましょう।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$この へやは（　）です。$m$, $m$["しずかな", "しずかに", "しずかで", "しずか"]$m$::jsonb, 3, $m$な-বিশেষণ + です → な লাগে না।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$これは（　）かばんです。$m$, $m$["あたらしい", "あたらしいの", "あたらしく", "あたらしいな"]$m$::jsonb, 0, $m$い-বিশেষণ সরাসরি নামের আগে বসে।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$あの こうえんは（　）です。$m$, $m$["きれいの", "きれいな", "きれいに", "きれい"]$m$::jsonb, 3, $m$きれい হলো な-বিশেষণ (い দিয়ে শেষ হলেও)।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$きのうは（　）です。$m$, $m$["さむい", "さむかった", "さむいでした", "さむく"]$m$::jsonb, 1, $m$い-বিশেষণের অতীত → かった।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ৫$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ৫$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -6) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$この ケーキは あまり（　）。$m$, $m$["おいしいです", "おいしいでした", "おいしくないです", "おいしかったです"]$m$::jsonb, 2, $m$あまり-র পরে না-বাচক লাগে।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$にほんごは むずかしいです（　）、おもしろいです。$m$, $m$["を", "で", "が", "の"]$m$::jsonb, 2, $m$উল্টো কথা জুড়তে → が (কিন্তু)।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$まどを（　）ください。$m$, $m$["あけた", "あける", "あけ", "あけて"]$m$::jsonb, 3, $m$অনুরোধ → て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$ここに なまえを（　）ください。$m$, $m$["かきて", "かく", "かいて", "かいた"]$m$::jsonb, 2, $m$かきます-এর て-রূপ → かいて।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$ちょっと（　）ください。$m$, $m$["まち", "まつ", "まった", "まって"]$m$::jsonb, 3, $m$まちます-এর て-রূপ → まって।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$いま あめが（　）います。$m$, $m$["ふり", "ふる", "ふった", "ふって"]$m$::jsonb, 3, $m$এখন চলছে → て-রূপ + います।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$わたしは ジュース（　）のみたいです。$m$, $m$["を", "へ", "の", "で"]$m$::jsonb, 0, $m$যা পান করতে চাই তার পরে を (বা が)।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$わたしは あたらしい くつが（　）です。$m$, $m$["ほしの", "ほしいな", "ほしい", "ほしく"]$m$::jsonb, 2, $m$কিছু চাই → …が ほしいです।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$へやの なかに だれ（　）いません。$m$, $m$["で", "が", "も", "を"]$m$::jsonb, 2, $m$"কেউ নেই" → だれも …ません।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$きょうは なにも（　）。$m$, $m$["たべます", "たべましょう", "たべませんでした", "たべました"]$m$::jsonb, 2, $m$なにも-র পরে না-বাচক।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ৬$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ৬$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -5) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$えきの まえに ほんや（　）あります。$m$, $m$["を", "へ", "で", "が"]$m$::jsonb, 3, $m$あります-এর আগে が।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$つくえの うえに ほん（　）ノートが あります。$m$, $m$["と", "へ", "を", "で"]$m$::jsonb, 0, $m$"বই আর খাতা" → と।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$りんご（　）みかんを かいました。$m$, $m$["で", "へ", "と", "に"]$m$::jsonb, 2, $m$দুটো জিনিস জুড়তে → と।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$わたしの いえは えき（　）ちかいです。$m$, $m$["へ", "から", "を", "で"]$m$::jsonb, 1, $m$"স্টেশন থেকে কাছে" → から (বা に)।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$にほんへ ひこうき（　）いきます。$m$, $m$["の", "が", "で", "を"]$m$::jsonb, 2, $m$যানবাহন → で।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$はし（　）ごはんを たべます。$m$, $m$["を", "へ", "に", "で"]$m$::jsonb, 3, $m$কী দিয়ে → で।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$にほんごで「thank you」は（　）いいますか。$m$, $m$["だれ", "どこ", "なに", "なんと"]$m$::jsonb, 3, $m$"কী বলে" → なんと いいますか।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$A「げんきですか。」
B「はい、（　）。」$m$, $m$["げんきじゃありません", "げんきに", "げんきです", "げんきな"]$m$::jsonb, 2, $m$はい → げんきです।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$わたしの へやは あまり ひろく（　）。$m$, $m$["あります", "です", "でした", "ありません"]$m$::jsonb, 3, $m$あまり + না-বাচক → ひろくありません।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$きょうしつに がくせいが（　）います。$m$, $m$["5まい", "5ほん", "5こ", "5にん"]$m$::jsonb, 3, $m$মানুষ গোনা → にん।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ৭$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ৭$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -4) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$えんぴつが（　）あります。$m$, $m$["3だい", "3ぼん", "3まい", "3にん"]$m$::jsonb, 1, $m$লম্বা সরু জিনিস → ほん (ぼん)।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$かみを（　）ください。$m$, $m$["2まい", "2さつ", "2にん", "2ほん"]$m$::jsonb, 0, $m$পাতলা জিনিস (কাগজ) → まい।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$りんごを（　）かいました。$m$, $m$["3ぼん", "3にん", "3まい", "みっつ"]$m$::jsonb, 3, $m$সাধারণ জিনিস → ひとつ・ふたつ・みっつ।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$くるまが（　）あります。$m$, $m$["2まい", "2だい", "2にん", "2ほん"]$m$::jsonb, 1, $m$গাড়ি / যন্ত্র → だい।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$こども（　）とき、よく あそびました。$m$, $m$["を", "で", "が", "の"]$m$::jsonb, 3, $m$"ছোটবেলায়" → こどもの とき।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$これ（　）ください。$m$, $m$["を", "に", "で", "が"]$m$::jsonb, 0, $m$কিছু চাওয়া → …を ください।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$さとうさんは にほんご（　）じょうずです。$m$, $m$["で", "へ", "が", "を"]$m$::jsonb, 2, $m$じょうず-র আগে が।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$わたしは にほんごが すこし（　）。$m$, $m$["わかりましょう", "わかりたい", "わかります", "わかってください"]$m$::jsonb, 2, $m$"একটু বুঝি" → すこし わかります।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$あしたは にちようびです（　）、がっこうは やすみです。$m$, $m$["を", "まで", "の", "から"]$m$::jsonb, 3, $m$কারণ → から।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$あの ひとは せが（　）です。$m$, $m$["ひろい", "ながい", "おもい", "たかい"]$m$::jsonb, 3, $m$লম্বা মানুষ → せが たかい।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ৮$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ৮$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -3) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$A「どうぞ。」
B「（　）。」$m$, $m$["ありがとうございます", "はじめまして", "おはようございます", "おやすみなさい"]$m$::jsonb, 0, $m$কিছু দিলে → ありがとうございます।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$ごはんを たべる まえに「（　）」と いいます。$m$, $m$["ただいま", "いただきます", "いってきます", "ごちそうさまでした"]$m$::jsonb, 1, $m$খাওয়ার আগে → いただきます।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$うちへ かえった とき、「（　）」と いいます。$m$, $m$["いただきます", "おやすみなさい", "いってきます", "ただいま"]$m$::jsonb, 3, $m$বাসায় ফিরে → ただいま।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$はじめて あった ひとに「（　）」と いいます。$m$, $m$["おやすみなさい", "はじめまして", "ただいま", "いただきます"]$m$::jsonb, 1, $m$প্রথম পরিচয়ে → はじめまして।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$ねる まえに「（　）」と いいます。$m$, $m$["おやすみなさい", "いただきます", "おはようございます", "ただいま"]$m$::jsonb, 0, $m$ঘুমানোর আগে → おやすみなさい।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$きのう デパート（　）くつを かいました。$m$, $m$["の", "を", "へ", "で"]$m$::jsonb, 3, $m$কেনাকাটা যেখানে হয়েছে → で।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$らいしゅう、にほん（　）きます。$m$, $m$["の", "に", "で", "を"]$m$::jsonb, 1, $m$কোথাও আসা → জায়গা + に (বা へ)।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$ともだち（　）てがみを かきます。$m$, $m$["に", "を", "の", "で"]$m$::jsonb, 0, $m$"বন্ধুকে" → に।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$せんせい（　）ほんを かりました。$m$, $m$["に", "で", "を", "が"]$m$::jsonb, 0, $m$"শিক্ষকের কাছ থেকে ধার" → に (বা から)।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$この みちを まっすぐ（　）ください。$m$, $m$["いって", "いき", "いく", "いった"]$m$::jsonb, 0, $m$いきます-এর て-রূপ → いって।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ৯$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ৯$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -2) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$A「にほんの たべものは（　）ですか。」
B「とても おいしいです。」$m$, $m$["どう", "どこ", "だれ", "いつ"]$m$::jsonb, 0, $m$"কেমন" → どうですか।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$A「（　）えいがを みましたか。」
B「アニメを みました。」$m$, $m$["どう", "どんな", "だれ", "どこ"]$m$::jsonb, 1, $m$নামের আগে "কেমন" → どんな।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$この へやは とても（　）です。$m$, $m$["あかるいな", "あかるい", "あかるくて", "あかるく"]$m$::jsonb, 1, $m$い-বিশেষণ + です।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$たなかさんは（　）ひとです。$m$, $m$["しんせつ", "しんせつの", "しんせつに", "しんせつな"]$m$::jsonb, 3, $m$な-বিশেষণ নামের আগে → な।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$この みせは やすくて、（　）です。$m$, $m$["おいしいな", "おいしい", "おいしく", "おいしいの"]$m$::jsonb, 1, $m$い-বিশেষণ + です।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$あさ、こうえんを（　）。$m$, $m$["さんぽに", "さんぽで", "さんぽします", "さんぽを"]$m$::jsonb, 2, $m$"পার্কে হাঁটি" → こうえんを さんぽします।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$ここで しゃしんを（　）ないで ください。$m$, $m$["とり", "とる", "とら", "とって"]$m$::jsonb, 2, $m$নিষেধ → ない-রূপ + で ください।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$A「これは（　）の ペンですか。」
B「やまださんのです。」$m$, $m$["いつ", "なに", "どこ", "だれ"]$m$::jsonb, 3, $m$"কার" → だれの।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$わたしは いぬ（　）ねこが すきです。$m$, $m$["と", "を", "に", "で"]$m$::jsonb, 0, $m$"কুকুর আর বিড়াল" → と।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$きのうは あめ（　）。$m$, $m$["じゃありません", "です", "でした", "ではない"]$m$::jsonb, 2, $m$গতকাল → অতীত でした।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ ১০$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ ১০$m$, 'N5', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -1) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$にほんの なつは とても（　）です。$m$, $m$["あつくて", "あつく", "あついな", "あつい"]$m$::jsonb, 3, $m$い-বিশেষণ + です।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$わたしの かぞく（　）バングラデシュに います。$m$, $m$["を", "で", "は", "へ"]$m$::jsonb, 2, $m$বিষয় → は।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$しゅくだいが（　）から、あそびません。$m$, $m$["あり", "あるい", "あって", "あります"]$m$::jsonb, 3, $m$ます-রূপ + から = কারণ।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$ゆうべ テレビを みました。（　）ねました。$m$, $m$["どこ", "でも", "それから", "だれ"]$m$::jsonb, 2, $m$"তারপর" → それから।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$にほんごは むずかしいです。（　）、たのしいです。$m$, $m$["でも", "だから", "では", "それから"]$m$::jsonb, 0, $m$"কিন্তু" → でも।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$A「いま なんじですか。」
B「12じ（　）です。」$m$, $m$["はん", "まい", "ぷん", "じかん"]$m$::jsonb, 0, $m$"সাড়ে বারোটা" → 12じはん।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$1しゅうかん（　）2かい ジムへ いきます。$m$, $m$["が", "で", "に", "を"]$m$::jsonb, 2, $m$"সপ্তাহে দুইবার" → に।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$A「おなまえは？」
B「サヤム（　）。」$m$, $m$["ます", "でした", "か", "です"]$m$::jsonb, 3, $m$নাম বলা → …です।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$わたしは まいばん 10じ（　）ねます。$m$, $m$["の", "に", "で", "を"]$m$::jsonb, 1, $m$নির্দিষ্ট সময়ের পরে に।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$A「やまださんは どこですか。」
B「いま しょくどう（　）います。」$m$, $m$["と", "へ", "に", "を"]$m$::jsonb, 2, $m$কেউ কোথায় আছে → জায়গা + に います।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ১$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ১$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -10) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「来年」-এর পড়া কোনটি?$m$, $m$["らいねん", "がくせい", "ききます", "せんせい"]$m$::jsonb, 0, $m$来年 = らいねん (আগামী বছর)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「名前」-এর পড়া কোনটি?$m$, $m$["うしろ", "なまえ", "きょう", "おおい"]$m$::jsonb, 1, $m$名前 = なまえ (নাম)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「新しい」-এর পড়া কোনটি?$m$, $m$["あたらしい", "はいります", "せんしゅう", "はなします"]$m$::jsonb, 0, $m$新しい = あたらしい (নতুন)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「読みます」-এর পড়া কোনটি?$m$, $m$["よみます", "たちます", "ともだち", "いきます"]$m$::jsonb, 0, $m$読みます = よみます (পড়া)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「駅」-এর পড়া কোনটি?$m$, $m$["そら", "えき", "そと", "はは"]$m$::jsonb, 1, $m$駅 = えき (স্টেশন)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ひま」মানে কী?$m$, $m$["অবসর", "শীত", "বিড়াল", "ঘুম থেকে ওঠা"]$m$::jsonb, 0, $m$ひま = অবসর।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「かばん」মানে কী?$m$, $m$["গ্রীষ্ম", "সকাল", "টেবিল", "ব্যাগ"]$m$::jsonb, 3, $m$かばん = ব্যাগ।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「あさ」মানে কী?$m$, $m$["বসন্ত", "ভাত", "সকাল", "ক্যামেরা"]$m$::jsonb, 2, $m$あさ = সকাল।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「きれい」মানে কী?$m$, $m$["রুটি", "সুন্দর / পরিষ্কার", "ট্যাক্সি", "টিভি"]$m$::jsonb, 1, $m$きれい = সুন্দর / পরিষ্কার।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「たまご」মানে কী?$m$, $m$["ব্যস্ত", "টেবিল", "সকাল", "ডিম"]$m$::jsonb, 3, $m$たまご = ডিম।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$あした ともだちに（　）。$m$, $m$["あいましたか", "あいませんでした", "あいました", "あいます"]$m$::jsonb, 3, $m$あした (আগামীকাল) → ます রূপ।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$わたしの へやは あまり ひろく（　）。$m$, $m$["でした", "あります", "です", "ありません"]$m$::jsonb, 3, $m$あまり + না-বাচক → ひろくありません।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$A「いっしょに ひるごはんを たべませんか。」
B「ええ、（　）。」$m$, $m$["たべましょう", "たべませんでした", "たべません", "たべた"]$m$::jsonb, 0, $m$আমন্ত্রণে রাজি → ええ、…ましょう।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$A「（　）が せんせいですか。」
B「あの ひとです。」$m$, $m$["なに", "どこ", "いつ", "だれ"]$m$::jsonb, 3, $m$"কে" → だれ।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$1しゅうかん（　）2かい ジムへ いきます。$m$, $m$["を", "で", "に", "が"]$m$::jsonb, 2, $m$"সপ্তাহে দুইবার" → に।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$A「この りんごは（　）ですか。」
B「100えんです。」$m$, $m$["だれ", "いつ", "どこ", "いくら"]$m$::jsonb, 3, $m$দাম জিজ্ঞেস → いくら।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$6じ（　）うちへ かえります。$m$, $m$["の", "に", "で", "を"]$m$::jsonb, 1, $m$নির্দিষ্ট সময়ের পরে に।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$これは（　）かばんです。$m$, $m$["あたらしいな", "あたらしく", "あたらしいの", "あたらしい"]$m$::jsonb, 3, $m$い-বিশেষণ সরাসরি নামের আগে বসে।$m$, $m$$m$),
      (t, 'reading', 19, $m$わたしは サヤムです。バングラデシュから きました。いま、にほんごを べんきょうして います。まいにち 2じかん べんきょうします。$m$, $m$サヤムさんは どこから きましたか。$m$, $m$["にほん", "バングラデシュ", "インド", "アメリカ"]$m$::jsonb, 1, $m$লেখায় আছে → バングラデシュ।$m$, $m$$m$),
      (t, 'reading', 20, $m$わたしは サヤムです。バングラデシュから きました。いま、にほんごを べんきょうして います。まいにち 2じかん べんきょうします。$m$, $m$まいにち なんじかん べんきょうしますか。$m$, $m$["1じかん", "2じかん", "3じかん", "4じかん"]$m$::jsonb, 1, $m$লেখায় আছে → 2じかん।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ২$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ২$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -9) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「安い」-এর পড়া কোনটি?$m$, $m$["やすい", "じかん", "なまえ", "たかい"]$m$::jsonb, 0, $m$安い = やすい (সস্তা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「毎日」-এর পড়া কোনটি?$m$, $m$["のみます", "らいねん", "まいにち", "がくせい"]$m$::jsonb, 2, $m$毎日 = まいにち (প্রতিদিন)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「古い」-এর পড়া কোনটি?$m$, $m$["いつつ", "ふるい", "てんき", "きゅう"]$m$::jsonb, 1, $m$古い = ふるい (পুরোনো)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「七」-এর পড়া কোনটি?$m$, $m$["ごご", "なな", "あめ", "はは"]$m$::jsonb, 1, $m$七 = なな (সাত)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「行きます」-এর পড়া কোনটি?$m$, $m$["いきます", "がくせい", "らいねん", "まいにち"]$m$::jsonb, 0, $m$行きます = いきます (যাওয়া)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ホテル」মানে কী?$m$, $m$["হোটেল", "খাতা", "বসন্ত", "ঘড়ি"]$m$::jsonb, 0, $m$ホテル = হোটেল।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「みかん」মানে কী?$m$, $m$["কমলা", "দরজা", "ঘর", "টয়লেট"]$m$::jsonb, 0, $m$みかん = কমলা।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「トイレ」মানে কী?$m$, $m$["ঘর", "টয়লেট", "ঘুমানো", "বাস"]$m$::jsonb, 1, $m$トイレ = টয়লেট।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「ぼうし」মানে কী?$m$, $m$["ভাত", "আনন্দের", "টুপি", "শীত"]$m$::jsonb, 2, $m$ぼうし = টুপি।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「すき」মানে কী?$m$, $m$["রাত", "পছন্দ", "জানালা", "ঘড়ি"]$m$::jsonb, 1, $m$すき = পছন্দ।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$まどを（　）ください。$m$, $m$["あけ", "あけて", "あける", "あけた"]$m$::jsonb, 1, $m$অনুরোধ → て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$はじめて あった ひとに「（　）」と いいます。$m$, $m$["おやすみなさい", "ただいま", "はじめまして", "いただきます"]$m$::jsonb, 2, $m$প্রথম পরিচয়ে → はじめまして।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$A「たんじょうびは（　）ですか。」
B「5がつ 3かです。」$m$, $m$["どこ", "だれ", "いつ", "なに"]$m$::jsonb, 2, $m$"কবে" → いつ।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$きょうしつに がくせいが（　）います。$m$, $m$["5まい", "5ほん", "5こ", "5にん"]$m$::jsonb, 3, $m$মানুষ গোনা → にん।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$この へやは とても（　）です。$m$, $m$["あかるくて", "あかるく", "あかるい", "あかるいな"]$m$::jsonb, 2, $m$い-বিশেষণ + です।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$わたしは あたらしい くつが（　）です。$m$, $m$["ほしい", "ほしの", "ほしく", "ほしいな"]$m$::jsonb, 0, $m$কিছু চাই → …が ほしいです।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$あの こうえんは（　）です。$m$, $m$["きれいな", "きれいの", "きれい", "きれいに"]$m$::jsonb, 2, $m$きれい হলো な-বিশেষণ (い দিয়ে শেষ হলেও)।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$うちへ かえった とき、「（　）」と いいます。$m$, $m$["おやすみなさい", "いってきます", "いただきます", "ただいま"]$m$::jsonb, 3, $m$বাসায় ফিরে → ただいま।$m$, $m$$m$),
      (t, 'reading', 19, $m$きのうは にちようびでした。わたしは ともだちと こうえんへ いきました。こうえんで サッカーを しました。そのあと、レストランで ごはんを たべました。$m$, $m$きのうは なんようびでしたか。$m$, $m$["どようび", "きんようび", "にちようび", "げつようび"]$m$::jsonb, 2, $m$লেখায় আছে → にちようび।$m$, $m$$m$),
      (t, 'reading', 20, $m$きのうは にちようびでした。わたしは ともだちと こうえんへ いきました。こうえんで サッカーを しました。そのあと、レストランで ごはんを たべました。$m$, $m$こうえんで なにを しましたか。$m$, $m$["すいえい", "サッカー", "テニス", "やきゅう"]$m$::jsonb, 1, $m$লেখায় আছে → サッカー।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ৩$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ৩$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -8) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「休みます」-এর পড়া কোনটি?$m$, $m$["わかります", "はなします", "あたらしい", "やすみます"]$m$::jsonb, 3, $m$休みます = やすみます (বিশ্রাম নেওয়া)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「五つ」-এর পড়া কোনটি?$m$, $m$["ふるい", "きょう", "ひだり", "いつつ"]$m$::jsonb, 3, $m$五つ = いつつ (পাঁচটা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「八」-এর পড়া কোনটি?$m$, $m$["した", "はち", "にし", "みみ"]$m$::jsonb, 1, $m$八 = はち (আট)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「飲みます」-এর পড়া কোনটি?$m$, $m$["でんしゃ", "のみます", "たべます", "がっこう"]$m$::jsonb, 1, $m$飲みます = のみます (পান করা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「時間」-এর পড়া কোনটি?$m$, $m$["さかな", "きょう", "ひゃく", "じかん"]$m$::jsonb, 3, $m$時間 = じかん (সময়)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「くつ」মানে কী?$m$, $m$["অপছন্দ", "জুতা", "টয়লেট", "খেলা"]$m$::jsonb, 1, $m$くつ = জুতা।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「はる」মানে কী?$m$, $m$["শীত", "বসন্ত", "বিড়াল", "ট্যাক্সি"]$m$::jsonb, 1, $m$はる = বসন্ত।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「いす」মানে কী?$m$, $m$["বসন্ত", "বাস", "পাখি", "চেয়ার"]$m$::jsonb, 3, $m$いす = চেয়ার।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「カメラ」মানে কী?$m$, $m$["বসন্ত", "কলম", "ক্যামেরা", "গরম"]$m$::jsonb, 2, $m$カメラ = ক্যামেরা।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「おきます」মানে কী?$m$, $m$["ক্যামেরা", "চেয়ার", "ঘুম থেকে ওঠা", "সুস্বাদু"]$m$::jsonb, 2, $m$おきます = ঘুম থেকে ওঠা।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$この へやは（　）です。$m$, $m$["しずかで", "しずかに", "しずかな", "しずか"]$m$::jsonb, 3, $m$な-বিশেষণ + です → な লাগে না।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$A「おなまえは？」
B「サヤム（　）。」$m$, $m$["です", "でした", "か", "ます"]$m$::jsonb, 0, $m$নাম বলা → …です।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$A「これは だれの かさですか。」
B「わたし（　）です。」$m$, $m$["を", "が", "に", "の"]$m$::jsonb, 3, $m$"আমার (টা)" → わたしの।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$あの ひとは せが（　）です。$m$, $m$["たかい", "ながい", "ひろい", "おもい"]$m$::jsonb, 0, $m$লম্বা মানুষ → せが たかい।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$A「（　）えいがを みましたか。」
B「アニメを みました。」$m$, $m$["どこ", "だれ", "どう", "どんな"]$m$::jsonb, 3, $m$নামের আগে "কেমন" → どんな।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$へやの なかに だれ（　）いません。$m$, $m$["が", "で", "も", "を"]$m$::jsonb, 2, $m$"কেউ নেই" → だれも …ません।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$わたしは いぬ（　）ねこが すきです。$m$, $m$["を", "に", "と", "で"]$m$::jsonb, 2, $m$"কুকুর আর বিড়াল" → と।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$たなかさんは（　）ひとです。$m$, $m$["しんせつな", "しんせつ", "しんせつに", "しんせつの"]$m$::jsonb, 0, $m$な-বিশেষণ নামের আগে → な।$m$, $m$$m$),
      (t, 'reading', 19, $m$わたしの へやは あまり ひろくないです。でも、まどが おおきくて、あかるいです。つくえの うえに パソコンが あります。$m$, $m$へやは どうですか。$m$, $m$["とても ひろい", "くらくて せまい", "ひろくないが、あかるい", "ひろくて くらい"]$m$::jsonb, 2, $m$লেখায় আছে → ひろくないが、あかるい।$m$, $m$$m$),
      (t, 'reading', 20, $m$わたしの へやは あまり ひろくないです。でも、まどが おおきくて、あかるいです。つくえの うえに パソコンが あります。$m$, $m$つくえの うえに なにが ありますか。$m$, $m$["とけい", "テレビ", "パソコン", "ほん"]$m$::jsonb, 2, $m$লেখায় আছে → パソコン।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ৪$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ৪$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -7) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「今年」-এর পড়া কোনটি?$m$, $m$["さかな", "ことし", "たかい", "じゅう"]$m$::jsonb, 1, $m$今年 = ことし (এ বছর)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「半」-এর পড়া কোনটি?$m$, $m$["せん", "にし", "いま", "はん"]$m$::jsonb, 3, $m$半 = はん (সাড়ে / অর্ধেক)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「天気」-এর পড়া কোনটি?$m$, $m$["てんき", "ひだり", "たかい", "うしろ"]$m$::jsonb, 0, $m$天気 = てんき (আবহাওয়া)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「父」-এর পড়া কোনটি?$m$, $m$["はは", "ごご", "ろく", "ちち"]$m$::jsonb, 3, $m$父 = ちち ((আমার) বাবা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「月曜日」-এর পড়া কোনটি?$m$, $m$["やすみます", "あたらしい", "げつようび", "きんようび"]$m$::jsonb, 2, $m$月曜日 = げつようび (সোমবার)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「パン」মানে কী?$m$, $m$["খেলা", "বাস", "ভাত", "রুটি"]$m$::jsonb, 3, $m$パン = রুটি।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「あそびます」মানে কী?$m$, $m$["জুতা", "শীত", "খেলা", "খাতা"]$m$::jsonb, 2, $m$あそびます = খেলা।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「ごはん」মানে কী?$m$, $m$["ঠান্ডা", "ভাত", "হোটেল", "আপেল"]$m$::jsonb, 1, $m$ごはん = ভাত।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「ふゆ」মানে কী?$m$, $m$["হোটেল", "চশমা", "খেলা", "শীত"]$m$::jsonb, 3, $m$ふゆ = শীত।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「ねます」মানে কী?$m$, $m$["ঘুমানো", "বিমান", "দরজা", "ব্যাগ"]$m$::jsonb, 0, $m$ねます = ঘুমানো।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$A「どうぞ。」
B「（　）。」$m$, $m$["おやすみなさい", "ありがとうございます", "おはようございます", "はじめまして"]$m$::jsonb, 1, $m$কিছু দিলে → ありがとうございます।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$さとうさんは にほんご（　）じょうずです。$m$, $m$["で", "へ", "が", "を"]$m$::jsonb, 2, $m$じょうず-র আগে が।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$ともだち（　）てがみを かきます。$m$, $m$["の", "で", "を", "に"]$m$::jsonb, 3, $m$"বন্ধুকে" → に।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$A「これは（　）の ペンですか。」
B「やまださんのです。」$m$, $m$["なに", "だれ", "いつ", "どこ"]$m$::jsonb, 1, $m$"কার" → だれの।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$A「トイレは（　）ですか。」
B「あそこです。」$m$, $m$["どこ", "いつ", "なに", "だれ"]$m$::jsonb, 0, $m$"কোথায়" → どこ।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$これは にほんご（　）ほんです。$m$, $m$["を", "の", "に", "で"]$m$::jsonb, 1, $m$"জাপানি ভাষার বই" → にほんごの ほん।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$きのう えいがを（　）。$m$, $m$["みましょう", "みました", "みません", "みます"]$m$::jsonb, 1, $m$きのう (গতকাল) → অতীত みました।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$この みちを まっすぐ（　）ください。$m$, $m$["いき", "いって", "いく", "いった"]$m$::jsonb, 1, $m$いきます-এর て-রূপ → いって।$m$, $m$$m$),
      (t, 'reading', 19, $m$たなかさんは まいあさ 6じに おきます。7じに あさごはんを たべます。8じに でんしゃで かいしゃへ いきます。$m$, $m$たなかさんは なんじに おきますか。$m$, $m$["7じ", "6じ", "8じ", "9じ"]$m$::jsonb, 1, $m$লেখায় আছে → 6じ।$m$, $m$$m$),
      (t, 'reading', 20, $m$たなかさんは まいあさ 6じに おきます。7じに あさごはんを たべます。8じに でんしゃで かいしゃへ いきます。$m$, $m$なんで かいしゃへ いきますか。$m$, $m$["くるま", "じてんしゃ", "バス", "でんしゃ"]$m$::jsonb, 3, $m$লেখায় আছে → でんしゃ।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ৫$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ৫$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -6) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「二つ」-এর পড়া কোনটি?$m$, $m$["てんき", "ふたつ", "ひとつ", "いつつ"]$m$::jsonb, 1, $m$二つ = ふたつ (দুইটা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「今日」-এর পড়া কোনটি?$m$, $m$["きょう", "ひがし", "ひゃく", "てんき"]$m$::jsonb, 0, $m$今日 = きょう (আজ)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「先生」-এর পড়া কোনটি?$m$, $m$["らいねん", "あいます", "たべます", "せんせい"]$m$::jsonb, 3, $m$先生 = せんせい (শিক্ষক)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「前」-এর পড়া কোনটি?$m$, $m$["ちち", "まえ", "はん", "はは"]$m$::jsonb, 1, $m$前 = まえ (সামনে)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「上」-এর পড়া কোনটি?$m$, $m$["そら", "うえ", "あめ", "いま"]$m$::jsonb, 1, $m$上 = うえ (উপরে)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ジュース」মানে কী?$m$, $m$["জুস", "ধোয়া", "জানালা", "সকাল"]$m$::jsonb, 0, $m$ジュース = জুস।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「きらい」মানে কী?$m$, $m$["টেবিল", "অবসর", "অপছন্দ", "ঘড়ি"]$m$::jsonb, 2, $m$きらい = অপছন্দ।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「テレビ」মানে কী?$m$, $m$["ট্যাক্সি", "চেয়ার", "ভাত", "টিভি"]$m$::jsonb, 3, $m$テレビ = টিভি।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「うたいます」মানে কী?$m$, $m$["গান গাওয়া", "বিমান", "টুপি", "বিড়াল"]$m$::jsonb, 0, $m$うたいます = গান গাওয়া।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「りんご」মানে কী?$m$, $m$["সাঁতার কাটা", "আপেল", "রেস্তোরাঁ", "টিভি"]$m$::jsonb, 1, $m$りんご = আপেল।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$わたしは にほんごが すこし（　）。$m$, $m$["わかりましょう", "わかります", "わかってください", "わかりたい"]$m$::jsonb, 1, $m$"একটু বুঝি" → すこし わかります।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$わたしは まいばん 10じ（　）ねます。$m$, $m$["の", "で", "を", "に"]$m$::jsonb, 3, $m$নির্দিষ্ট সময়ের পরে に।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$A「にほんの たべものは（　）ですか。」
B「とても おいしいです。」$m$, $m$["いつ", "どこ", "だれ", "どう"]$m$::jsonb, 3, $m$"কেমন" → どうですか।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$わたしは ジュース（　）のみたいです。$m$, $m$["の", "へ", "で", "を"]$m$::jsonb, 3, $m$যা পান করতে চাই তার পরে を (বা が)।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$きのう デパート（　）くつを かいました。$m$, $m$["で", "を", "の", "へ"]$m$::jsonb, 0, $m$কেনাকাটা যেখানে হয়েছে → で।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$わたしの かぞく（　）バングラデシュに います。$m$, $m$["を", "は", "で", "へ"]$m$::jsonb, 1, $m$বিষয় → は।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$ちょっと（　）ください。$m$, $m$["まった", "まち", "まつ", "まって"]$m$::jsonb, 3, $m$まちます-এর て-রূপ → まって।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$ごはんを たべる まえに「（　）」と いいます。$m$, $m$["ごちそうさまでした", "いただきます", "ただいま", "いってきます"]$m$::jsonb, 1, $m$খাওয়ার আগে → いただきます।$m$, $m$$m$),
      (t, 'reading', 19, $m$やまださんへ　きょうは 3じに かいぎが あります。かいぎしつに きて ください。しりょうを わすれないで ください。　すずき$m$, $m$かいぎは なんじですか。$m$, $m$["3じ", "4じ", "1じ", "2じ"]$m$::jsonb, 0, $m$লেখায় আছে → 3じ।$m$, $m$$m$),
      (t, 'reading', 20, $m$やまださんへ　きょうは 3じに かいぎが あります。かいぎしつに きて ください。しりょうを わすれないで ください。　すずき$m$, $m$やまださんは なにを もって いきますか。$m$, $m$["かさ", "さいふ", "おべんとう", "しりょう"]$m$::jsonb, 3, $m$লেখায় আছে → しりょう।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ৬$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ৬$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -5) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「空」-এর পড়া কোনটি?$m$, $m$["まえ", "そら", "そと", "くに"]$m$::jsonb, 1, $m$空 = そら (আকাশ)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「九」-এর পড়া কোনটি?$m$, $m$["でんき", "いつつ", "ごぜん", "きゅう"]$m$::jsonb, 3, $m$九 = きゅう (নয়)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「国」-এর পড়া কোনটি?$m$, $m$["はは", "ろく", "くに", "にし"]$m$::jsonb, 2, $m$国 = くに (দেশ)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「書きます」-এর পড়া কোনটি?$m$, $m$["かきます", "ちいさい", "あいます", "のみます"]$m$::jsonb, 0, $m$書きます = かきます (লেখা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「見ます」-এর পড়া কোনটি?$m$, $m$["みます", "きょう", "ながい", "きゅう"]$m$::jsonb, 0, $m$見ます = みます (দেখা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「タクシー」মানে কী?$m$, $m$["কলম", "জুস", "ট্যাক্সি", "ক্যামেরা"]$m$::jsonb, 2, $m$タクシー = ট্যাক্সি।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「めがね」মানে কী?$m$, $m$["চশমা", "জুস", "দরজা", "ঠান্ডা"]$m$::jsonb, 0, $m$めがね = চশমা।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「まど」মানে কী?$m$, $m$["জানালা", "বিমান", "টিভি", "গ্রীষ্ম"]$m$::jsonb, 0, $m$まど = জানালা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「バス」মানে কী?$m$, $m$["বাস", "সুন্দর / পরিষ্কার", "ডিম", "ট্যাক্সি"]$m$::jsonb, 0, $m$バス = বাস।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「つくえ」মানে কী?$m$, $m$["ট্যাক্সি", "আপেল", "চেয়ার", "টেবিল"]$m$::jsonb, 3, $m$つくえ = টেবিল।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$へやに ねこ（　）います。$m$, $m$["で", "が", "へ", "を"]$m$::jsonb, 1, $m$います / あります-এর আগে が।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$りんご（　）みかんを かいました。$m$, $m$["と", "へ", "で", "に"]$m$::jsonb, 0, $m$দুটো জিনিস জুড়তে → と।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$つくえの うえに ほん（　）ノートが あります。$m$, $m$["を", "へ", "で", "と"]$m$::jsonb, 3, $m$"বই আর খাতা" → と।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$わたしは りんご（　）すきです。$m$, $m$["を", "で", "が", "へ"]$m$::jsonb, 2, $m$すき-র আগে が।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$にほんごで「thank you」は（　）いいますか。$m$, $m$["なに", "どこ", "だれ", "なんと"]$m$::jsonb, 3, $m$"কী বলে" → なんと いいますか।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$らいしゅう、にほん（　）きます。$m$, $m$["に", "の", "で", "を"]$m$::jsonb, 0, $m$কোথাও আসা → জায়গা + に (বা へ)।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$A「げんきですか。」
B「はい、（　）。」$m$, $m$["げんきに", "げんきな", "げんきじゃありません", "げんきです"]$m$::jsonb, 3, $m$はい → げんきです।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$9じ（　）5じまで はたらきます。$m$, $m$["の", "が", "を", "から"]$m$::jsonb, 3, $m$"৯টা থেকে" → から।$m$, $m$$m$),
      (t, 'reading', 19, $m$わたしは くだものが すきです。りんごと みかんが すきです。でも、バナナは あまり すきじゃ ありません。$m$, $m$すきな くだものは どれですか。$m$, $m$["みかん と バナナ", "りんご と みかん", "ぶどう だけ", "バナナ と りんご"]$m$::jsonb, 1, $m$লেখায় আছে → りんご と みかん।$m$, $m$$m$),
      (t, 'reading', 20, $m$わたしは くだものが すきです。りんごと みかんが すきです。でも、バナナは あまり すきじゃ ありません。$m$, $m$バナナは どうですか。$m$, $m$["たべた ことが ない", "いちばん すき", "あまり すきじゃない", "とても すき"]$m$::jsonb, 2, $m$লেখায় আছে → あまり すきじゃない।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ৭$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ৭$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -4) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「中」-এর পড়া কোনটি?$m$, $m$["あし", "ごご", "なか", "した"]$m$::jsonb, 2, $m$中 = なか (ভিতরে)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「明日」-এর পড়া কোনটি?$m$, $m$["おかね", "ふたつ", "あした", "うしろ"]$m$::jsonb, 2, $m$明日 = あした (আগামীকাল)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「魚」-এর পড়া কোনটি?$m$, $m$["じゅう", "たかい", "さかな", "じかん"]$m$::jsonb, 2, $m$魚 = さかな (মাছ)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「分かります」-এর পড়া কোনটি?$m$, $m$["せんしゅう", "わかります", "きんようび", "はいります"]$m$::jsonb, 1, $m$分かります = わかります (বোঝা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「左」-এর পড়া কোনটি?$m$, $m$["あした", "ひだり", "でんき", "きます"]$m$::jsonb, 1, $m$左 = ひだり (বাম দিক)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「へや」মানে কী?$m$, $m$["ঠান্ডা", "জুতা", "অপছন্দ", "ঘর"]$m$::jsonb, 3, $m$へや = ঘর।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「あらいます」মানে কী?$m$, $m$["রুটি", "ধোয়া", "আনন্দের", "বসন্ত"]$m$::jsonb, 1, $m$あらいます = ধোয়া।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「ドア」মানে কী?$m$, $m$["দরজা", "শীত", "রাত", "পছন্দ"]$m$::jsonb, 0, $m$ドア = দরজা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「あつい」মানে কী?$m$, $m$["ডিম", "ঠান্ডা", "বসন্ত", "গরম"]$m$::jsonb, 3, $m$あつい = গরম।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「およぎます」মানে কী?$m$, $m$["সাঁতার কাটা", "টেবিল", "আপেল", "অপছন্দ"]$m$::jsonb, 0, $m$およぎます = সাঁতার কাটা।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$A「あれは（　）ですか。」
B「ゆうびんきょくです。」$m$, $m$["なん", "いくら", "いつ", "だれ"]$m$::jsonb, 0, $m$"ওটা কী?" → なんですか।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$りんごを（　）かいました。$m$, $m$["みっつ", "3にん", "3まい", "3ぼん"]$m$::jsonb, 0, $m$সাধারণ জিনিস → ひとつ・ふたつ・みっつ।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$A「おくには（　）ですか。」
B「バングラデシュです。」$m$, $m$["いくら", "どちら", "いつ", "だれ"]$m$::jsonb, 1, $m$দেশ জিজ্ঞেস করতে ভদ্রভাবে → どちら।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$ねる まえに「（　）」と いいます。$m$, $m$["おはようございます", "いただきます", "おやすみなさい", "ただいま"]$m$::jsonb, 2, $m$ঘুমানোর আগে → おやすみなさい।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$いま あめが（　）います。$m$, $m$["ふって", "ふり", "ふった", "ふる"]$m$::jsonb, 0, $m$এখন চলছে → て-রূপ + います।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$えんぴつが（　）あります。$m$, $m$["3まい", "3だい", "3ぼん", "3にん"]$m$::jsonb, 2, $m$লম্বা সরু জিনিস → ほん (ぼん)।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$はし（　）ごはんを たべます。$m$, $m$["で", "へ", "を", "に"]$m$::jsonb, 0, $m$কী দিয়ে → で।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$くるまが（　）あります。$m$, $m$["2まい", "2だい", "2にん", "2ほん"]$m$::jsonb, 1, $m$গাড়ি / যন্ত্র → だい।$m$, $m$$m$),
      (t, 'reading', 19, $m$あしたは ははの たんじょうびです。わたしは デパートで はなを かいました。あかい はなです。ははは あかい いろが すきです。$m$, $m$あしたは なんの ひですか。$m$, $m$["ちちの たんじょうび", "わたしの たんじょうび", "がっこうの やすみ", "ははの たんじょうび"]$m$::jsonb, 3, $m$লেখায় আছে → ははの たんじょうび।$m$, $m$$m$),
      (t, 'reading', 20, $m$あしたは ははの たんじょうびです。わたしは デパートで はなを かいました。あかい はなです。ははは あかい いろが すきです。$m$, $m$なにを かいましたか。$m$, $m$["しろい はな", "ケーキ", "あかい はな", "かばん"]$m$::jsonb, 2, $m$লেখায় আছে → あかい はな।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ৮$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ৮$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -3) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「一つ」-এর পড়া কোনটি?$m$, $m$["ひゃく", "さかな", "ひとつ", "でんき"]$m$::jsonb, 2, $m$一つ = ひとつ (একটা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「会います」-এর পড়া কোনটি?$m$, $m$["がっこう", "あいます", "すくない", "せんせい"]$m$::jsonb, 1, $m$会います = あいます (দেখা করা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「目」-এর পড়া কোনটি?$m$, $m$["えき", "て", "みち", "め"]$m$::jsonb, 3, $m$目 = め (চোখ)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「小さい」-এর পড়া কোনটি?$m$, $m$["よみます", "すくない", "ともだち", "ちいさい"]$m$::jsonb, 3, $m$小さい = ちいさい (ছোট)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「西」-এর পড়া কোনটি?$m$, $m$["くに", "えん", "そら", "にし"]$m$::jsonb, 3, $m$西 = にし (পশ্চিম)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「たのしい」মানে কী?$m$, $m$["রুটি", "ঘর", "শীত", "আনন্দের"]$m$::jsonb, 3, $m$たのしい = আনন্দের।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「なつ」মানে কী?$m$, $m$["ধোয়া", "গ্রীষ্ম", "চশমা", "হোটেল"]$m$::jsonb, 1, $m$なつ = গ্রীষ্ম।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「ペン」মানে কী?$m$, $m$["ব্যস্ত", "হোটেল", "কলম", "জুতা"]$m$::jsonb, 2, $m$ペン = কলম।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「とり」মানে কী?$m$, $m$["সুস্বাদু", "পাখি", "ঘর", "টেবিল"]$m$::jsonb, 1, $m$とり = পাখি।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「おいしい」মানে কী?$m$, $m$["খেলা", "টুপি", "জুতা", "সুস্বাদু"]$m$::jsonb, 3, $m$おいしい = সুস্বাদু।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$こうえん（　）あそびます。$m$, $m$["で", "へ", "を", "の"]$m$::jsonb, 0, $m$কাজটা যেখানে হয় → জায়গা + で।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$かみを（　）ください。$m$, $m$["2にん", "2ほん", "2まい", "2さつ"]$m$::jsonb, 2, $m$পাতলা জিনিস (কাগজ) → まい।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$A「いま なんじですか。」
B「12じ（　）です。」$m$, $m$["まい", "ぷん", "はん", "じかん"]$m$::jsonb, 2, $m$"সাড়ে বারোটা" → 12じはん।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$ゆうべ テレビを みました。（　）ねました。$m$, $m$["でも", "どこ", "それから", "だれ"]$m$::jsonb, 2, $m$"তারপর" → それから।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$まいにち みず（　）のみます。$m$, $m$["へ", "で", "を", "に"]$m$::jsonb, 2, $m$যা পান করি তার পরে を।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$にほんごは むずかしいです。（　）、たのしいです。$m$, $m$["それから", "でも", "だから", "では"]$m$::jsonb, 1, $m$"কিন্তু" → でも।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$あさ、こうえんを（　）。$m$, $m$["さんぽで", "さんぽします", "さんぽを", "さんぽに"]$m$::jsonb, 1, $m$"পার্কে হাঁটি" → こうえんを さんぽします।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$にほんの なつは とても（　）です。$m$, $m$["あついな", "あつい", "あつくて", "あつく"]$m$::jsonb, 1, $m$い-বিশেষণ + です।$m$, $m$$m$),
      (t, 'reading', 19, $m$この みせは あさ 10じに あきます。よる 8じに しまります。すいようびは やすみです。$m$, $m$みせは なんじに しまりますか。$m$, $m$["6じ", "10じ", "8じ", "9じ"]$m$::jsonb, 2, $m$লেখায় আছে → 8じ।$m$, $m$$m$),
      (t, 'reading', 20, $m$この みせは あさ 10じに あきます。よる 8じに しまります。すいようびは やすみです。$m$, $m$みせが やすみの ひは いつですか。$m$, $m$["げつようび", "きんようび", "すいようび", "にちようび"]$m$::jsonb, 2, $m$লেখায় আছে → すいようび।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ৯$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ৯$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -2) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「先週」-এর পড়া কোনটি?$m$, $m$["げつようび", "あたらしい", "せんしゅう", "はなします"]$m$::jsonb, 2, $m$先週 = せんしゅう (গত সপ্তাহ)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「少ない」-এর পড়া কোনটি?$m$, $m$["すくない", "ききます", "のみます", "あいます"]$m$::jsonb, 0, $m$少ない = すくない (কম)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「十」-এর পড়া কোনটি?$m$, $m$["きょう", "じゅう", "ふるい", "ひゃく"]$m$::jsonb, 1, $m$十 = じゅう (দশ)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「来ます」-এর পড়া কোনটি?$m$, $m$["あした", "ことし", "ながい", "きます"]$m$::jsonb, 3, $m$来ます = きます (আসা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「長い」-এর পড়া কোনটি?$m$, $m$["ふるい", "たかい", "ながい", "ことし"]$m$::jsonb, 2, $m$長い = ながい (লম্বা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ひこうき」মানে কী?$m$, $m$["ঘর", "পাখি", "গ্রীষ্ম", "বিমান"]$m$::jsonb, 3, $m$ひこうき = বিমান।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「ノート」মানে কী?$m$, $m$["খাতা", "সাঁতার কাটা", "চেয়ার", "কলম"]$m$::jsonb, 0, $m$ノート = খাতা।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「よる」মানে কী?$m$, $m$["গ্রীষ্ম", "চেয়ার", "রাত", "খাতা"]$m$::jsonb, 2, $m$よる = রাত।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「いそがしい」মানে কী?$m$, $m$["গান গাওয়া", "সাঁতার কাটা", "খাতা", "ব্যস্ত"]$m$::jsonb, 3, $m$いそがしい = ব্যস্ত।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「とけい」মানে কী?$m$, $m$["ঘুমানো", "ঘড়ি", "সকাল", "টয়লেট"]$m$::jsonb, 1, $m$とけい = ঘড়ি।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$しゅくだいが（　）から、あそびません。$m$, $m$["あるい", "あって", "あります", "あり"]$m$::jsonb, 2, $m$ます-রূপ + から = কারণ।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$バス（　）がっこうへ いきます。$m$, $m$["で", "を", "の", "に"]$m$::jsonb, 0, $m$যানবাহন / উপায় → で।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$この ケーキは あまり（　）。$m$, $m$["おいしいでした", "おいしかったです", "おいしいです", "おいしくないです"]$m$::jsonb, 3, $m$あまり-র পরে না-বাচক লাগে।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$きのうは あめ（　）。$m$, $m$["です", "でした", "ではない", "じゃありません"]$m$::jsonb, 1, $m$গতকাল → অতীত でした।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$わたしは がっこう（　）いきます。$m$, $m$["に", "を", "の", "で"]$m$::jsonb, 0, $m$কোথাও যাওয়া → জায়গা + に (বা へ)।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$こども（　）とき、よく あそびました。$m$, $m$["で", "を", "が", "の"]$m$::jsonb, 3, $m$"ছোটবেলায়" → こどもの とき।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$ここで しゃしんを（　）ないで ください。$m$, $m$["とり", "とって", "とら", "とる"]$m$::jsonb, 2, $m$নিষেধ → ない-রূপ + で ください।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$せんせい（　）ほんを かりました。$m$, $m$["を", "が", "で", "に"]$m$::jsonb, 3, $m$"শিক্ষকের কাছ থেকে ধার" → に (বা から)।$m$, $m$$m$),
      (t, 'reading', 19, $m$わたしは にほんで はたらきたいです。だから、にほんごを べんきょうして います。らいねん、にほんへ いきます。$m$, $m$この ひとは なにを したいですか。$m$, $m$["えいごを べんきょうしたい", "にほんで りょこうしたい", "バングラデシュで はたらきたい", "にほんで はたらきたい"]$m$::jsonb, 3, $m$লেখায় আছে → にほんで はたらきたい।$m$, $m$$m$),
      (t, 'reading', 20, $m$わたしは にほんで はたらきたいです。だから、にほんごを べんきょうして います。らいねん、にほんへ いきます。$m$, $m$いつ にほんへ いきますか。$m$, $m$["ことし", "あした", "らいねん", "こんしゅう"]$m$::jsonb, 2, $m$লেখায় আছে → らいねん।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ মক টেস্ট ১০$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ মক টেস্ট ১০$m$, 'N5', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -1) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「下」-এর পড়া কোনটি?$m$, $m$["えん", "せん", "した", "まえ"]$m$::jsonb, 2, $m$下 = した (নিচে)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「高い」-এর পড়া কোনটি?$m$, $m$["たかい", "きゅう", "くるま", "みなみ"]$m$::jsonb, 0, $m$高い = たかい (উঁচু / দামি)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「子ども」-এর পড়া কোনটি?$m$, $m$["じかん", "ことし", "こども", "ふたつ"]$m$::jsonb, 2, $m$子ども = こども (শিশু)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「金曜日」-এর পড়া কোনটি?$m$, $m$["はいります", "きんようび", "にちようび", "はなします"]$m$::jsonb, 1, $m$金曜日 = きんようび (শুক্রবার)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「後ろ」-এর পড়া কোনটি?$m$, $m$["ふたつ", "ひがし", "あした", "うしろ"]$m$::jsonb, 3, $m$後ろ = うしろ (পিছনে)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「さむい」মানে কী?$m$, $m$["ঠান্ডা", "রেস্তোরাঁ", "আনন্দের", "জুতা"]$m$::jsonb, 0, $m$さむい = ঠান্ডা।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「ねこ」মানে কী?$m$, $m$["গরম", "বিড়াল", "পছন্দ", "গ্রীষ্ম"]$m$::jsonb, 1, $m$ねこ = বিড়াল।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「レストラン」মানে কী?$m$, $m$["ডিম", "আনন্দের", "বাস", "রেস্তোরাঁ"]$m$::jsonb, 3, $m$レストラン = রেস্তোরাঁ।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「ひま」মানে কী?$m$, $m$["অবসর", "টেবিল", "দরজা", "জানালা"]$m$::jsonb, 0, $m$ひま = অবসর।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「かばん」মানে কী?$m$, $m$["সকাল", "ব্যাগ", "জানালা", "জুতা"]$m$::jsonb, 1, $m$かばん = ব্যাগ।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$A「やまださんは どこですか。」
B「いま しょくどう（　）います。」$m$, $m$["に", "へ", "と", "を"]$m$::jsonb, 0, $m$কেউ কোথায় আছে → জায়গা + に います।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$はは（　）いっしょに かいものを します。$m$, $m$["で", "へ", "と", "を"]$m$::jsonb, 2, $m$"মায়ের সাথে" → ははと いっしょに।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$たなかさんは がくせいです。わたし（　）がくせいです。$m$, $m$["も", "を", "で", "に"]$m$::jsonb, 0, $m$"আমিও" → も।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$あしたは にちようびです（　）、がっこうは やすみです。$m$, $m$["を", "から", "まで", "の"]$m$::jsonb, 1, $m$কারণ → から।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$にほんごは むずかしいです（　）、おもしろいです。$m$, $m$["の", "を", "で", "が"]$m$::jsonb, 3, $m$উল্টো কথা জুড়তে → が (কিন্তু)।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$けさ いそがしかったです。あさごはんを（　）。$m$, $m$["たべます", "たべません", "たべませんでした", "たべましょう"]$m$::jsonb, 2, $m$অতীতে "খাইনি" → ませんでした।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$えきの まえに ほんや（　）あります。$m$, $m$["を", "が", "へ", "で"]$m$::jsonb, 1, $m$あります-এর আগে が।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$つくえの した（　）かばんが あります。$m$, $m$["を", "で", "に", "へ"]$m$::jsonb, 2, $m$জিনিস কোথায় আছে → জায়গা + に あります।$m$, $m$$m$),
      (t, 'reading', 19, $m$きょうは さむいです。そとは ゆきが ふって います。わたしは うちで あたたかい おちゃを のんで います。$m$, $m$きょうの てんきは どうですか。$m$, $m$["あつくて、はれて いる", "すずしくて、くもり", "あたたかくて、あめ", "さむくて、ゆきが ふって いる"]$m$::jsonb, 3, $m$লেখায় আছে → さむくて、ゆきが ふって いる।$m$, $m$$m$),
      (t, 'reading', 20, $m$きょうは さむいです。そとは ゆきが ふって います。わたしは うちで あたたかい おちゃを のんで います。$m$, $m$この ひとは いま なにを して いますか。$m$, $m$["おちゃを のんで いる", "そとで あそんで いる", "ねて いる", "かいものを して いる"]$m$::jsonb, 0, $m$লেখায় আছে → おちゃを のんで いる।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ২$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ২$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -9) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「遠い」-এর পড়া কোনটি?$m$, $m$["やさい", "くろい", "かるい", "とおい"]$m$::jsonb, 3, $m$遠い = とおい (দূরে)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「重い」-এর পড়া কোনটি?$m$, $m$["ひろい", "げんき", "べんり", "おもい"]$m$::jsonb, 3, $m$重い = おもい (ভারী)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「軽い」-এর পড়া কোনটি?$m$, $m$["かいぎ", "くらい", "あかい", "かるい"]$m$::jsonb, 3, $m$軽い = かるい (হালকা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「暑い」-এর পড়া কোনটি?$m$, $m$["あかい", "あつい", "べんり", "えいが"]$m$::jsonb, 1, $m$暑い = あつい (গরম (আবহাওয়া))।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「さむい」কানজিতে কোনটি?$m$, $m$["仕事", "料理", "暑い", "寒い"]$m$::jsonb, 3, $m$さむい = 寒い (ঠান্ডা (আবহাওয়া))।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ひろい」কানজিতে কোনটি?$m$, $m$["意味", "答え", "牛乳", "広い"]$m$::jsonb, 3, $m$ひろい = 広い (প্রশস্ত)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「つよい」কানজিতে কোনটি?$m$, $m$["強い", "暗い", "空港", "音楽"]$m$::jsonb, 0, $m$つよい = 強い (শক্তিশালী)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「弱い」মানে কী?$m$, $m$["ধরা / বহন করা", "দুর্বল", "কাজ করা", "শরৎ"]$m$::jsonb, 1, $m$弱い (よわい) = দুর্বল।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「悪い」মানে কী?$m$, $m$["লাল", "শীত", "গবেষণা", "খারাপ"]$m$::jsonb, 3, $m$悪い (わるい) = খারাপ।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「赤い」মানে কী?$m$, $m$["লাল", "রান্নাঘর", "ক্লাসরুম", "সমস্যা"]$m$::jsonb, 0, $m$赤い (あかい) = লাল।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ৩$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ৩$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -8) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「黒い」-এর পড়া কোনটি?$m$, $m$["くろい", "あつい", "げんき", "きます"]$m$::jsonb, 0, $m$黒い = くろい (কালো)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「明るい」-এর পড়া কোনটি?$m$, $m$["くうこう", "まちます", "たてもの", "あかるい"]$m$::jsonb, 3, $m$明るい = あかるい (উজ্জ্বল)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「暗い」-এর পড়া কোনটি?$m$, $m$["あかい", "きます", "ひろい", "くらい"]$m$::jsonb, 3, $m$暗い = くらい (অন্ধকার)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「楽しい」-এর পড়া কোনটি?$m$, $m$["ゆうがた", "たのしい", "まちます", "かします"]$m$::jsonb, 1, $m$楽しい = たのしい (আনন্দের)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「べんり」কানজিতে কোনটি?$m$, $m$["便利", "親切", "医者", "野菜"]$m$::jsonb, 0, $m$べんり = 便利 (সুবিধাজনক)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ゆうめい」কানজিতে কোনটি?$m$, $m$["仕事", "有名", "質問", "暗い"]$m$::jsonb, 1, $m$ゆうめい = 有名 (বিখ্যাত)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「げんき」কানজিতে কোনটি?$m$, $m$["強い", "元気", "特別", "弱い"]$m$::jsonb, 1, $m$げんき = 元気 (সুস্থ)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「親切」মানে কী?$m$, $m$["দয়ালু", "শেষ হওয়া", "কাগজ", "দুর্বল"]$m$::jsonb, 0, $m$親切 (しんせつ) = দয়ালু।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「特別」মানে কী?$m$, $m$["হালকা", "অক্ষর", "বিশেষ", "সিনেমা"]$m$::jsonb, 2, $m$特別 (とくべつ) = বিশেষ।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「大切」মানে কী?$m$, $m$["গুরুত্বপূর্ণ", "আনন্দের", "লাল", "(কারো কাছে) শেখা"]$m$::jsonb, 0, $m$大切 (たいせつ) = গুরুত্বপূর্ণ।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ৪$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ৪$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -7) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「兄」-এর পড়া কোনটি?$m$, $m$["かみ", "はる", "あに", "あね"]$m$::jsonb, 2, $m$兄 = あに ((আমার) বড় ভাই)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「姉」-এর পড়া কোনটি?$m$, $m$["はる", "あき", "あね", "かぜ"]$m$::jsonb, 2, $m$姉 = あね ((আমার) বড় বোন)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「弟」-এর পড়া কোনটি?$m$, $m$["うんてん", "おとうと", "しゃしん", "かします"]$m$::jsonb, 1, $m$弟 = おとうと (ছোট ভাই)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「妹」-এর পড়া কোনটি?$m$, $m$["ぎんこう", "いもうと", "かします", "とくべつ"]$m$::jsonb, 1, $m$妹 = いもうと (ছোট বোন)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「おっと」কানজিতে কোনটি?$m$, $m$["紙", "歌", "夫", "字"]$m$::jsonb, 2, $m$おっと = 夫 (স্বামী)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「いしゃ」কানজিতে কোনটি?$m$, $m$["研究", "医者", "軽い", "仕事"]$m$::jsonb, 1, $m$いしゃ = 医者 (ডাক্তার)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「てんいん」কানজিতে কোনটি?$m$, $m$["有名", "工場", "社長", "店員"]$m$::jsonb, 3, $m$てんいん = 店員 (দোকানকর্মী)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「社長」মানে কী?$m$, $m$["গুরুত্বপূর্ণ", "দুধ", "কোম্পানির প্রধান", "হাঁটা"]$m$::jsonb, 2, $m$社長 (しゃちょう) = কোম্পানির প্রধান।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「仕事」মানে কী?$m$, $m$["বাড়ির কাজ", "বিকেল", "অপেক্ষা করা", "কাজ / চাকরি"]$m$::jsonb, 3, $m$仕事 (しごと) = কাজ / চাকরি।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「会議」মানে কী?$m$, $m$["শুরু হওয়া", "সাইকেল", "প্রশ্ন", "মিটিং"]$m$::jsonb, 3, $m$会議 (かいぎ) = মিটিং।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ৫$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ৫$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -6) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「研究」-এর পড়া কোনটি?$m$, $m$["しゃちょう", "ならいます", "けんきゅう", "じてんしゃ"]$m$::jsonb, 2, $m$研究 = けんきゅう (গবেষণা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「質問」-এর পড়া কোনটি?$m$, $m$["しゃしん", "あかるい", "もんだい", "しつもん"]$m$::jsonb, 3, $m$質問 = しつもん (প্রশ্ন)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「答え」-এর পড়া কোনটি?$m$, $m$["こたえ", "ひろい", "べんり", "くろい"]$m$::jsonb, 0, $m$答え = こたえ (উত্তর)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「意味」-এর পড়া কোনটি?$m$, $m$["いみ", "うた", "もり", "はる"]$m$::jsonb, 0, $m$意味 = いみ (অর্থ)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「もんだい」কানজিতে কোনটি?$m$, $m$["建物", "問題", "強い", "宿題"]$m$::jsonb, 1, $m$もんだい = 問題 (সমস্যা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「しけん」কানজিতে কোনটি?$m$, $m$["試験", "意味", "宿題", "運転"]$m$::jsonb, 0, $m$しけん = 試験 (পরীক্ষা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「しゅくだい」কানজিতে কোনটি?$m$, $m$["弱い", "宿題", "元気", "建物"]$m$::jsonb, 1, $m$しゅくだい = 宿題 (বাড়ির কাজ)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「教室」মানে কী?$m$, $m$["বানানো", "ক্লাসরুম", "তাড়াহুড়া করা", "(জামা) পরা"]$m$::jsonb, 1, $m$教室 (きょうしつ) = ক্লাসরুম।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「図書館」মানে কী?$m$, $m$["লাইব্রেরি", "কাগজ", "ছবি", "গ্রীষ্ম"]$m$::jsonb, 0, $m$図書館 (としょかん) = লাইব্রেরি।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「銀行」মানে কী?$m$, $m$["দুর্বল", "দৌড়ানো", "ব্যাংক", "সমস্যা"]$m$::jsonb, 2, $m$銀行 (ぎんこう) = ব্যাংক।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ৬$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ৬$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -5) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「空港」-এর পড়া কোনটি?$m$, $m$["くうこう", "しつもん", "ゆうめい", "しゃしん"]$m$::jsonb, 0, $m$空港 = くうこう (বিমানবন্দর)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「工場」-এর পড়া কোনটি?$m$, $m$["こうじょう", "はしります", "つかいます", "きょうしつ"]$m$::jsonb, 0, $m$工場 = こうじょう (কারখানা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「建物」-এর পড়া কোনটি?$m$, $m$["おんがく", "くうこう", "たてもの", "ゆうめい"]$m$::jsonb, 2, $m$建物 = たてもの (ভবন)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「部屋」-এর পড়া কোনটি?$m$, $m$["よる", "へや", "にく", "もり"]$m$::jsonb, 1, $m$部屋 = へや (ঘর)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「だいどころ」কানজিতে কোনটি?$m$, $m$["世界", "建物", "銀行", "台所"]$m$::jsonb, 3, $m$だいどころ = 台所 (রান্নাঘর)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「りょうり」কানজিতে কোনটি?$m$, $m$["軽い", "弱い", "料理", "会議"]$m$::jsonb, 2, $m$りょうり = 料理 (রান্না / খাবার)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「やさい」কানজিতে কোনটি?$m$, $m$["広い", "便利", "野菜", "黒い"]$m$::jsonb, 2, $m$やさい = 野菜 (সবজি)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「肉」মানে কী?$m$, $m$["হাঁটা", "ব্যবহার করা", "(আমার) বড় বোন", "মাংস"]$m$::jsonb, 3, $m$肉 (にく) = মাংস।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「牛乳」মানে কী?$m$, $m$["দুধ", "কোম্পানির প্রধান", "পাঠানো", "ডাক্তার"]$m$::jsonb, 0, $m$牛乳 (ぎゅうにゅう) = দুধ।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「お茶」মানে কী?$m$, $m$["চা", "ঘর", "(আমার) বড় ভাই", "উজ্জ্বল"]$m$::jsonb, 0, $m$お茶 (おちゃ) = চা।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ৭$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ৭$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -4) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「昼」-এর পড়া কোনটি?$m$, $m$["あね", "うた", "よる", "ひる"]$m$::jsonb, 3, $m$昼 = ひる (দুপুর)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「夜」-এর পড়া কোনটি?$m$, $m$["ひる", "よる", "うみ", "ふゆ"]$m$::jsonb, 1, $m$夜 = よる (রাত)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「夕方」-এর পড়া কোনটি?$m$, $m$["ぎんこう", "まちます", "おんがく", "ゆうがた"]$m$::jsonb, 3, $m$夕方 = ゆうがた (বিকেল)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「春」-এর পড়া কোনটি?$m$, $m$["ひる", "はる", "ふゆ", "あき"]$m$::jsonb, 1, $m$春 = はる (বসন্ত)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「なつ」কানজিতে কোনটি?$m$, $m$["夜", "昼", "歌", "夏"]$m$::jsonb, 3, $m$なつ = 夏 (গ্রীষ্ম)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「あき」কানজিতে কোনটি?$m$, $m$["風", "姉", "昼", "秋"]$m$::jsonb, 3, $m$あき = 秋 (শরৎ)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「ふゆ」কানজিতে কোনটি?$m$, $m$["弟", "冬", "歌", "字"]$m$::jsonb, 1, $m$ふゆ = 冬 (শীত)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「海」মানে কী?$m$, $m$["বিকেল", "মাংস", "হালকা", "সমুদ্র"]$m$::jsonb, 3, $m$海 (うみ) = সমুদ্র।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「池」মানে কী?$m$, $m$["(কারো কাছে) শেখা", "ছোট বোন", "খারাপ", "পুকুর"]$m$::jsonb, 3, $m$池 (いけ) = পুকুর।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「森」মানে কী?$m$, $m$["দয়ালু", "বন", "শেষ হওয়া", "অন্ধকার"]$m$::jsonb, 1, $m$森 (もり) = বন।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ৮$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ৮$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -3) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「風」-এর পড়া কোনটি?$m$, $m$["はる", "かぜ", "あき", "へや"]$m$::jsonb, 1, $m$風 = かぜ (বাতাস)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「雪」-এর পড়া কোনটি?$m$, $m$["あに", "はる", "もり", "ゆき"]$m$::jsonb, 3, $m$雪 = ゆき (তুষার)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「世界」-এর পড়া কোনটি?$m$, $m$["とおい", "こたえ", "せかい", "ひろい"]$m$::jsonb, 2, $m$世界 = せかい (বিশ্ব)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「地図」-এর পড়া কোনটি?$m$, $m$["ちず", "あね", "かぜ", "はる"]$m$::jsonb, 0, $m$地図 = ちず (মানচিত্র)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「しゃしん」কানজিতে কোনটি?$m$, $m$["暑い", "料理", "映画", "写真"]$m$::jsonb, 3, $m$しゃしん = 写真 (ছবি)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「えいが」কানজিতে কোনটি?$m$, $m$["映画", "広い", "答え", "有名"]$m$::jsonb, 0, $m$えいが = 映画 (সিনেমা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「おんがく」কানজিতে কোনটি?$m$, $m$["質問", "音楽", "重い", "暑い"]$m$::jsonb, 1, $m$おんがく = 音楽 (সংগীত)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「歌」মানে কী?$m$, $m$["হালকা", "গান", "প্রশ্ন", "উত্তর"]$m$::jsonb, 1, $m$歌 (うた) = গান।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「字」মানে কী?$m$, $m$["গুরুত্বপূর্ণ", "অক্ষর", "খারাপ", "অপেক্ষা করা"]$m$::jsonb, 1, $m$字 (じ) = অক্ষর।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「紙」মানে কী?$m$, $m$["কাগজ", "ঠান্ডা (আবহাওয়া)", "সাঁতার কাটা", "ডাক্তার"]$m$::jsonb, 0, $m$紙 (かみ) = কাগজ।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ৯$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ৯$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -2) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「自転車」-এর পড়া কোনটি?$m$, $m$["ならいます", "はしります", "じてんしゃ", "こうじょう"]$m$::jsonb, 2, $m$自転車 = じてんしゃ (সাইকেল)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「運転」-এর পড়া কোনটি?$m$, $m$["かします", "ゆうがた", "しんせつ", "うんてん"]$m$::jsonb, 3, $m$運転 = うんてん (গাড়ি চালানো)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「始まります」-এর পড়া কোনটি?$m$, $m$["はじまります", "ぎゅうにゅう", "はたらきます", "おわります"]$m$::jsonb, 0, $m$始まります = はじまります (শুরু হওয়া)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「終わります」-এর পড়া কোনটি?$m$, $m$["きょうしつ", "おわります", "はしります", "およぎます"]$m$::jsonb, 1, $m$終わります = おわります (শেষ হওয়া)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「はたらきます」কানজিতে কোনটি?$m$, $m$["貸します", "待ちます", "走ります", "働きます"]$m$::jsonb, 3, $m$はたらきます = 働きます (কাজ করা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「おしえます」কানজিতে কোনটি?$m$, $m$["急ぎます", "働きます", "作ります", "教えます"]$m$::jsonb, 3, $m$おしえます = 教えます (শেখানো)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「ならいます」কানজিতে কোনটি?$m$, $m$["習います", "教えます", "走ります", "働きます"]$m$::jsonb, 0, $m$ならいます = 習います ((কারো কাছে) শেখা)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「思います」মানে কী?$m$, $m$["মনে করা", "পুকুর", "শেখানো", "দয়ালু"]$m$::jsonb, 0, $m$思います (おもいます) = মনে করা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「使います」মানে কী?$m$, $m$["ঘর", "ব্যবহার করা", "দুধ", "সমস্যা"]$m$::jsonb, 1, $m$使います (つかいます) = ব্যবহার করা।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「作ります」মানে কী?$m$, $m$["শীত", "(আমার) বড় ভাই", "বানানো", "সাঁতার কাটা"]$m$::jsonb, 2, $m$作ります (つくります) = বানানো।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি ১০$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি ১০$m$, 'N4', 'kanji', $m$সহজ কানজি · পড়া, লেখা ও অর্থ · ১০টি প্রশ্ন$m$, 10, 50, false, -1) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「送ります」-এর পড়া কোনটি?$m$, $m$["はしります", "おくります", "けんきゅう", "だいどころ"]$m$::jsonb, 1, $m$送ります = おくります (পাঠানো)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「持ちます」-এর পড়া কোনটি?$m$, $m$["あかるい", "くうこう", "うんてん", "もちます"]$m$::jsonb, 3, $m$持ちます = もちます (ধরা / বহন করা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「待ちます」-এর পড়া কোনটি?$m$, $m$["ぎんこう", "まちます", "おんがく", "くうこう"]$m$::jsonb, 1, $m$待ちます = まちます (অপেক্ষা করা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「歩きます」-এর পড়া কোনটি?$m$, $m$["あるきます", "おくります", "じてんしゃ", "だいどころ"]$m$::jsonb, 0, $m$歩きます = あるきます (হাঁটা)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「はしります」কানজিতে কোনটি?$m$, $m$["貸します", "習います", "走ります", "借ります"]$m$::jsonb, 2, $m$はしります = 走ります (দৌড়ানো)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「およぎます」কানজিতে কোনটি?$m$, $m$["泳ぎます", "使います", "働きます", "送ります"]$m$::jsonb, 0, $m$およぎます = 泳ぎます (সাঁতার কাটা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「いそぎます」কানজিতে কোনটি?$m$, $m$["作ります", "歩きます", "走ります", "急ぎます"]$m$::jsonb, 3, $m$いそぎます = 急ぎます (তাড়াহুড়া করা)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「着ます」মানে কী?$m$, $m$["তুষার", "(জামা) পরা", "সাইকেল", "শীত"]$m$::jsonb, 1, $m$着ます (きます) = (জামা) পরা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「借ります」মানে কী?$m$, $m$["লাইব্রেরি", "সিনেমা", "ধার নেওয়া", "কাগজ"]$m$::jsonb, 2, $m$借ります (かります) = ধার নেওয়া।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「貸します」মানে কী?$m$, $m$["গুরুত্বপূর্ণ", "গাড়ি চালানো", "মাংস", "ধার দেওয়া"]$m$::jsonb, 3, $m$貸します (かします) = ধার দেওয়া।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ২$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ২$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -9) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$にほんごを はなす ことが（　）。$m$, $m$["できます", "します", "あります", "なります"]$m$::jsonb, 0, $m$অভিধান রূপ + ことが できます = পারি।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$ふじさんに のぼった こと（　）あります。$m$, $m$["を", "が", "で", "に"]$m$::jsonb, 1, $m$た-রূপ + ことが あります = আগে করেছি।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$まどを あけても（　）ですか。$m$, $m$["いい", "よし", "よく", "いく"]$m$::jsonb, 0, $m$て-রূপ + も いいですか = …করতে পারি?$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$ここで たばこを すっては（　）。$m$, $m$["いきます", "あります", "いけません", "いいです"]$m$::jsonb, 2, $m$て-রূপ + は いけません = নিষেধ।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$あした あめが（　）ら、しあいは ありません。$m$, $m$["ふった", "ふる", "ふって", "ふらない"]$m$::jsonb, 0, $m$た-রূপ + ら = যদি…।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$ごはんを（　）あとで、くすりを のみます。$m$, $m$["たべない", "たべて", "たべる", "たべた"]$m$::jsonb, 3, $m$た-রূপ + あとで = …করার পরে।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$ねる（　）、はを みがきます。$m$, $m$["まえに", "ながら", "あとで", "のに"]$m$::jsonb, 0, $m$অভিধান রূপ + まえに = …করার আগে।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$おんがくを（　）ながら べんきょうします。$m$, $m$["きく", "きいた", "きいて", "きき"]$m$::jsonb, 3, $m$ます-রূপের কাণ্ড + ながら = …করতে করতে।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$この かばんは かるくて、（　）です。$m$, $m$["べんりな", "べんりの", "べんりに", "べんり"]$m$::jsonb, 3, $m$な-বিশেষণ + です → な লাগে না।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$にほんへ いったら、すしを（　）と おもいます。$m$, $m$["たべて", "たべれ", "たべよう", "たべ"]$m$::jsonb, 2, $m$ইচ্ছা-রূপ + と おもいます = …করব ভাবছি।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ৩$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ৩$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -8) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$あしたは しけんが ある（　）、きょうは はやく ねます。$m$, $m$["けど", "ので", "まで", "のに"]$m$::jsonb, 1, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$いっしょうけんめい べんきょうした（　）、しけんに おちました。$m$, $m$["から", "のに", "ので", "ため"]$m$::jsonb, 1, $m$আশার উল্টো ফল → のに।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$そらが くらく なりました。あめが ふり（　）です。$m$, $m$["みたい", "よう", "らしい", "そう"]$m$::jsonb, 3, $m$দেখে মনে হচ্ছে এখনই হবে → ます-কাণ্ড + そう।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$へやを きれいに（　）。$m$, $m$["ありました", "なりました", "いました", "しました"]$m$::jsonb, 3, $m$を থাকলে → きれいに します।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$さむく（　）ましたね。$m$, $m$["し", "なり", "あり", "い"]$m$::jsonb, 1, $m$অবস্থা বদলানো → い-বিশেষণ + く なります।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$にほんごが じょうずに（　）たいです。$m$, $m$["あり", "なり", "い", "し"]$m$::jsonb, 1, $m$"ভালো হতে চাই" → じょうずに なりたい।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$しゅくだいを わすれて（　）。$m$, $m$["おきました", "ありました", "みました", "しまいました"]$m$::jsonb, 3, $m$অনিচ্ছায় ঘটে গেছে → て しまいました।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$パーティーの まえに、ビールを かって（　）ましょう。$m$, $m$["あり", "くれ", "おき", "なり"]$m$::jsonb, 2, $m$আগে থেকে প্রস্তুতি → て おきます।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$この ふくを きて（　）も いいですか。$m$, $m$["み", "さ", "あり", "なり"]$m$::jsonb, 0, $m$চেষ্টা করে দেখা → て みます।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$せんせいが わたしに じしょを（　）。$m$, $m$["くれました", "もらいました", "やりました", "あげました"]$m$::jsonb, 0, $m$অন্য কেউ আমাকে দিলে → くれました।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ৪$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ৪$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -7) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$わたしは ともだちに プレゼントを（　）。$m$, $m$["いただいて", "あげました", "ください", "くれました"]$m$::jsonb, 1, $m$আমি অন্যকে দিলে → あげました।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$わたしは あねに ペンを かして（　）。$m$, $m$["なりました", "くれました", "ください", "もらいました"]$m$::jsonb, 3, $m$আমি কারো কাছ থেকে উপকার পেলে → て もらいました।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$この もんだいは むずかし（　）て、わかりません。$m$, $m$["やす", "たい", "すぎ", "そう"]$m$::jsonb, 2, $m$"খুব বেশি কঠিন" → むずかしすぎて।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$あめが ふって いる（　）、かさを もって いきます。$m$, $m$["けど", "から", "まで", "のに"]$m$::jsonb, 1, $m$কারণ → から।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$あした くる（　）どうか、わかりません。$m$, $m$["を", "に", "が", "か"]$m$::jsonb, 3, $m$"আসবে কিনা" → …か どうか।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$かれが なにを（　）か、しりません。$m$, $m$["して", "して いる", "し", "すれ"]$m$::jsonb, 1, $m$প্রশ্নবাচক শব্দ + সাধারণ রূপ + か।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$さいふを おとさない（　）に、きを つけて ください。$m$, $m$["まえ", "らしい", "そう", "よう"]$m$::jsonb, 3, $m$"যাতে না হয়" → ない-রূপ + ように।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$にほんごが はなせる（　）に なりました。$m$, $m$["よう", "ため", "こと", "そう"]$m$::jsonb, 0, $m$পারা শুরু হলো → …ように なりました।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$らいねん にほんへ いく（　）に しました。$m$, $m$["ため", "そう", "こと", "まで"]$m$::jsonb, 2, $m$নিজে সিদ্ধান্ত নিলাম → ことに しました।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$この へやは しずか（　）、ひろいです。$m$, $m$["な", "に", "で", "の"]$m$::jsonb, 2, $m$な-বিশেষণ জুড়তে → で।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ৫$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ৫$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -6) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$たなかさんは やさしく（　）、おもしろい ひとです。$m$, $m$["に", "と", "て", "で"]$m$::jsonb, 2, $m$い-বিশেষণ জুড়তে → くて।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$この りんごは あかくて（　）そうです。$m$, $m$["おいしく", "おいしい", "おいしかった", "おいし"]$m$::jsonb, 3, $m$い-বিশেষণ + そう → い বাদ দিয়ে そう।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$もし じかんが（　）ば、いっしょに いきましょう。$m$, $m$["あり", "ある", "あれ", "あっ"]$m$::jsonb, 2, $m$ば-শর্ত → あれば।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$くすりを のめば、すぐ（　）よ。$m$, $m$["なおった", "なおります", "なおりました", "なおって"]$m$::jsonb, 1, $m$শর্তের পরে ফল → ます রূপ।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$あの ひとは せんせい（　）しれません。$m$, $m$["かも", "のに", "まで", "ので"]$m$::jsonb, 0, $m$"হয়তো" → かもしれません।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$きょうは にちようびだ（　）、ぎんこうは やすみでしょう。$m$, $m$["まで", "から", "けど", "のに"]$m$::jsonb, 1, $m$কারণ → から।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$あしたは はれる（　）。$m$, $m$["でしょう", "ましょう", "たい", "ください"]$m$::jsonb, 0, $m$অনুমান → でしょう।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$この しごとは きょうじゅうに（　）なければ なりません。$m$, $m$["した", "して", "し", "する"]$m$::jsonb, 2, $m$"করতেই হবে" → ない-রূপ (し) + なければ なりません।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$あしたは がっこうへ（　）なくても いいです。$m$, $m$["いく", "いか", "いって", "いき"]$m$::jsonb, 1, $m$"না গেলেও চলবে" → いかなくても いい।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$わたしは いぬに てを（　）。$m$, $m$["かまれました", "かませました", "かみました", "かんで"]$m$::jsonb, 0, $m$কেউ আমার সাথে কিছু করলে → কর্মবাচ্য (かまれました)।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ৬$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ৬$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -5) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$せんせいに ほめ（　）ました。$m$, $m$["たり", "させ", "られ", "て"]$m$::jsonb, 2, $m$"প্রশংসিত হলাম" → ほめられました।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$ははは わたしに やさいを たべ（　）ました。$m$, $m$["ない", "たく", "たり", "させ"]$m$::jsonb, 3, $m$কাউকে দিয়ে করানো → させます।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$やすみの ひは そうじを したり、せんたくを（　）します。$m$, $m$["する", "した", "して", "したり"]$m$::jsonb, 3, $m$…たり …たり します = এটা-ওটা করি।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$にほんへ いく まえに、パスポートを（　）おきます。$m$, $m$["とり", "とった", "とって", "とる"]$m$::jsonb, 2, $m$て-রূপ + おきます।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$この ボタンを おす（　）、ドアが あきます。$m$, $m$["と", "のに", "まで", "けど"]$m$::jsonb, 0, $m$সবসময় ঘটে → অভিধান রূপ + と।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$みちが わからない（　）、ちずを みました。$m$, $m$["まで", "のに", "より", "ので"]$m$::jsonb, 3, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$バスより でんしゃ（　）はやいです。$m$, $m$["から", "まで", "の ほうが", "より"]$m$::jsonb, 2, $m$তুলনা → Aより Bの ほうが।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$にほんで いちばん（　）やまは ふじさんです。$m$, $m$["たかい", "たかさ", "たかくて", "たかく"]$m$::jsonb, 0, $m$নামের আগে い-বিশেষণ → たかい।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$くだものの なかで りんごが（　）すきです。$m$, $m$["もっと", "あまり", "ぜんぜん", "いちばん"]$m$::jsonb, 3, $m$সবচেয়ে → いちばん।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$わたしの いえは がっこうから あまり（　）。$m$, $m$["とおくて", "とおかったです", "とおいです", "とおくないです"]$m$::jsonb, 3, $m$あまり + না-বাচক।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ৭$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ৭$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -4) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$しつもんが あったら、いつでも（　）ください。$m$, $m$["きく", "きいた", "きき", "きいて"]$m$::jsonb, 3, $m$て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$あの えいがは まだ（　）。$m$, $m$["みましょう", "みます", "みて いません", "みました"]$m$::jsonb, 2, $m$まだ + "এখনো করিনি" → て いません।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$もう ひるごはんを（　）か。—はい、たべました。$m$, $m$["たべません", "たべました", "たべます", "たべましょう"]$m$::jsonb, 1, $m$もう + অতীত।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$あたまが いたい（　）、がっこうを やすみました。$m$, $m$["のに", "ので", "けど", "まで"]$m$::jsonb, 1, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$にほんごを ならう（　）、にほんへ いきます。$m$, $m$["まで", "ために", "より", "ように"]$m$::jsonb, 1, $m$উদ্দেশ্য (নিজের ইচ্ছায় করা কাজ) → ために।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$けいたいでんわを（　）ながら あるかないで ください。$m$, $m$["みる", "みて", "みた", "み"]$m$::jsonb, 3, $m$ます-কাণ্ড + ながら।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$この かんじの よみかたを（　）ください。$m$, $m$["おしえて", "おしえ", "おしえた", "おしえる"]$m$::jsonb, 0, $m$て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$にほんの せいかつに もう（　）。$m$, $m$["なれ", "なれました", "なれて", "なれる"]$m$::jsonb, 1, $m$もう + অতীত (অভ্যস্ত হয়ে গেছি)।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$わたしは にく（　）さかなの ほうが すきです。$m$, $m$["から", "ほど", "より", "まで"]$m$::jsonb, 2, $m$তুলনা → AよりBの ほうが।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$きょねんの なつ（　）ことしの なつの ほうが あついです。$m$, $m$["まで", "から", "より", "ほど"]$m$::jsonb, 2, $m$তুলনা → より।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ৮$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ৮$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -3) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$へやに だれか（　）ようです。$m$, $m$["いて", "い", "いれ", "いる"]$m$::jsonb, 3, $m$সাধারণ রূপ + ようです = মনে হচ্ছে।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$てを あらって（　）、ごはんを たべます。$m$, $m$["より", "まで", "ので", "から"]$m$::jsonb, 3, $m$て-রূপ + から = …করার পরে।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$まどが あいて（　）。$m$, $m$["います", "おきます", "みます", "あります"]$m$::jsonb, 0, $m$নিজে থেকে হওয়া অবস্থা (自動詞) → て います।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$まどが しめて（　）。$m$, $m$["います", "なります", "あります", "きます"]$m$::jsonb, 2, $m$কেউ করে রেখেছে (他動詞 + が) → て あります।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$この きっさてんは コーヒーが おいしい（　）、ゆうめいです。$m$, $m$["ので", "けど", "のに", "まで"]$m$::jsonb, 0, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$にほんごの べんきょうは たいへんです（　）、たのしいです。$m$, $m$["ので", "まで", "から", "が"]$m$::jsonb, 3, $m$উল্টো কথা → が।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$あついですね。まどを（　）か。$m$, $m$["あけて", "あけ", "あけました", "あけましょう"]$m$::jsonb, 3, $m$প্রস্তাব → ましょうか।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$にもつ、おもそうですね。てつだい（　）か。$m$, $m$["ました", "ましょう", "て", "たい"]$m$::jsonb, 1, $m$সাহায্যের প্রস্তাব → ましょうか।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$かいぎは なんじに はじまるか（　）。$m$, $m$["しりませんか", "しって いますか", "しりますか", "しって ください"]$m$::jsonb, 1, $m$"জানেন কি?" → しって いますか।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$わたしは まだ にほんへ いった ことが（　）。$m$, $m$["いません", "ありません", "しません", "あります"]$m$::jsonb, 1, $m$まだ + না-বাচক।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ৯$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ৯$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -2) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$その にもつ、（　）ましょうか。$m$, $m$["もった", "もって", "もつ", "もち"]$m$::jsonb, 3, $m$ます-কাণ্ড + ましょうか।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$ここに くるまを とめない（　）ください。$m$, $m$["で", "に", "て", "と"]$m$::jsonb, 0, $m$নিষেধ → ない-রূপ + で ください।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$わすれ（　）ように、メモを します。$m$, $m$["ず", "ない", "なく", "て"]$m$::jsonb, 1, $m$"যাতে না ভুলি" → わすれないように।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$にほんでは、くつを ぬいで いえに（　）。$m$, $m$["はいります", "はいって", "はいれ", "はいり"]$m$::jsonb, 0, $m$বাক্যের শেষে → ます রূপ।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$あには いますが、あね（　）いません。$m$, $m$["を", "は", "で", "に"]$m$::jsonb, 1, $m$তুলনা করে বলা → は।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$きのうの パーティーは（　）でしたか。—とても たのしかったです。$m$, $m$["どう", "どこ", "だれ", "いつ"]$m$::jsonb, 0, $m$"কেমন" → どう।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$にほんに きて から、もう 1ねんに（　）。$m$, $m$["います", "します", "あります", "なります"]$m$::jsonb, 3, $m$সময় পার হলো → …に なります।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$わたしは ピアノが（　）。$m$, $m$["ひきます", "ひけます", "ひく", "ひいて"]$m$::jsonb, 1, $m$が-এর পরে সম্ভাব্য রূপ → ひけます।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$にほんごで メールが（　）ように なりました。$m$, $m$["かく", "かき", "かける", "かいて"]$m$::jsonb, 2, $m$が-এর পরে সম্ভাব্য রূপ → かける।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$この みずは のんでも（　）ですか。$m$, $m$["ください", "いけません", "なりません", "だいじょうぶ"]$m$::jsonb, 3, $m$"খেলে সমস্যা নেই তো?" → だいじょうぶ।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ ১০$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ ১০$m$, 'N4', 'grammar', $m$সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, -1) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$あしたの パーティーに（　）つもりです。$m$, $m$["いった", "いく", "いって", "いき"]$m$::jsonb, 1, $m$অভিধান রূপ + つもり = ইচ্ছা আছে।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$なつやすみに りょこうする（　）です。$m$, $m$["つもり", "ため", "より", "まで"]$m$::jsonb, 0, $m$পরিকল্পনা → つもりです।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$ともだちが わたしの にもつを もって（　）。$m$, $m$["あげました", "やりました", "くれました", "もらいました"]$m$::jsonb, 2, $m$অন্যজন আমার জন্য করলে → て くれました।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$この もんだいは かんたん（　）、すぐ わかります。$m$, $m$["なので", "まで", "より", "なのに"]$m$::jsonb, 0, $m$な-বিশেষণ + なので = কারণ।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$くらく なる（　）に、かえりましょう。$m$, $m$["あと", "ので", "ながら", "まえ"]$m$::jsonb, 3, $m$অভিধান রূপ + まえに।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$あの ひとは さっきから ずっと でんわで（　）います。$m$, $m$["はなして", "はなす", "はなし", "はなした"]$m$::jsonb, 0, $m$চলমান → て います।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$わたしの しゅみは しゃしんを とる（　）です。$m$, $m$["ところ", "ため", "まで", "こと"]$m$::jsonb, 3, $m$ক্রিয়াকে নাম বানাতে → こと।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$えきに ついたら、（　）ください。$m$, $m$["でんわして", "でんわし", "でんわする", "でんわした"]$m$::jsonb, 0, $m$て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$しずかに して ください。あかちゃんが（　）いますから。$m$, $m$["ねた", "ね", "ねて", "ねる"]$m$::jsonb, 2, $m$চলমান অবস্থা → て います।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$しけんに ごうかく（　）、とても うれしいです。$m$, $m$["できた", "でき", "できて", "できる"]$m$::jsonb, 2, $m$অনুভূতির কারণ → て-রূপ।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ১$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ১$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -10) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「研究」-এর পড়া কোনটি?$m$, $m$["おしえます", "けんきゅう", "つくります", "おくります"]$m$::jsonb, 1, $m$研究 = けんきゅう (গবেষণা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「建物」-এর পড়া কোনটি?$m$, $m$["かします", "もんだい", "しんせつ", "たてもの"]$m$::jsonb, 3, $m$建物 = たてもの (ভবন)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「世界」-এর পড়া কোনটি?$m$, $m$["かいぎ", "いしゃ", "かるい", "せかい"]$m$::jsonb, 3, $m$世界 = せかい (বিশ্ব)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「教室」-এর পড়া কোনটি?$m$, $m$["としょかん", "きょうしつ", "つかいます", "あるきます"]$m$::jsonb, 1, $m$教室 = きょうしつ (ক্লাসরুম)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「宿題」-এর পড়া কোনটি?$m$, $m$["おしえます", "あるきます", "おくります", "しゅくだい"]$m$::jsonb, 3, $m$宿題 = しゅくだい (বাড়ির কাজ)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「にげます」মানে কী?$m$, $m$["ভদ্র / যত্নশীল", "সিরিয়াস / পরিশ্রমী", "শক্ত", "পালানো"]$m$::jsonb, 3, $m$にげます = পালানো।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「おちます」মানে কী?$m$, $m$["নিশ্চিন্ত", "দুশ্চিন্তা", "পড়ে যাওয়া", "নরম"]$m$::jsonb, 2, $m$おちます = পড়ে যাওয়া।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「れんらく」মানে কী?$m$, $m$["পরিকল্পনা", "স্বাধীন", "যোগাযোগ", "প্রতিশ্রুতি / অ্যাপয়েন্টমেন্ট"]$m$::jsonb, 2, $m$れんらく = যোগাযোগ।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「けいけん」মানে কী?$m$, $m$["অভিজ্ঞতা", "খোঁজ নেওয়া", "চকচক করা", "সাহায্য করা"]$m$::jsonb, 0, $m$けいけん = অভিজ্ঞতা।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「ひかります」মানে কী?$m$, $m$["পরিচয় করিয়ে দেওয়া", "হারিয়ে ফেলা", "চকচক করা", "ফেলে দেওয়া"]$m$::jsonb, 2, $m$ひかります = চকচক করা।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$やすみの ひは そうじを したり、せんたくを（　）します。$m$, $m$["したり", "した", "する", "して"]$m$::jsonb, 0, $m$…たり …たり します = এটা-ওটা করি।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$しつもんが あったら、いつでも（　）ください。$m$, $m$["きいた", "きく", "きいて", "きき"]$m$::jsonb, 2, $m$て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$えきに ついたら、（　）ください。$m$, $m$["でんわする", "でんわした", "でんわし", "でんわして"]$m$::jsonb, 3, $m$て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$この りんごは あかくて（　）そうです。$m$, $m$["おいしく", "おいしい", "おいしかった", "おいし"]$m$::jsonb, 3, $m$い-বিশেষণ + そう → い বাদ দিয়ে そう।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$にほんごの べんきょうは たいへんです（　）、たのしいです。$m$, $m$["まで", "ので", "から", "が"]$m$::jsonb, 3, $m$উল্টো কথা → が।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$ここに くるまを とめない（　）ください。$m$, $m$["て", "に", "で", "と"]$m$::jsonb, 2, $m$নিষেধ → ない-রূপ + で ください।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$かれが なにを（　）か、しりません。$m$, $m$["して いる", "すれ", "して", "し"]$m$::jsonb, 0, $m$প্রশ্নবাচক শব্দ + সাধারণ রূপ + か।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$ごはんを（　）あとで、くすりを のみます。$m$, $m$["たべる", "たべない", "たべて", "たべた"]$m$::jsonb, 3, $m$た-রূপ + あとで = …করার পরে।$m$, $m$$m$),
      (t, 'reading', 19, $m$先月、わたしは 友だちと 京都へ 旅行に 行きました。古い お寺を たくさん 見ました。天気が よくて、とても 楽しかったです。来年は 北海道へ 行きたいと 思って います。$m$, $m$先月 どこへ 行きましたか。$m$, $m$["東京", "大阪", "北海道", "京都"]$m$::jsonb, 3, $m$লেখায় আছে → 京都।$m$, $m$$m$),
      (t, 'reading', 20, $m$先月、わたしは 友だちと 京都へ 旅行に 行きました。古い お寺を たくさん 見ました。天気が よくて、とても 楽しかったです。来年は 北海道へ 行きたいと 思って います。$m$, $m$来年 どこへ 行きたいですか。$m$, $m$["東京", "京都", "沖縄", "北海道"]$m$::jsonb, 3, $m$লেখায় আছে → 北海道।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ২$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ২$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -9) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「走ります」-এর পড়া কোনটি?$m$, $m$["だいどころ", "きょうしつ", "しゃちょう", "はしります"]$m$::jsonb, 3, $m$走ります = はしります (দৌড়ানো)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「映画」-এর পড়া কোনটি?$m$, $m$["わるい", "あかい", "えいが", "こたえ"]$m$::jsonb, 2, $m$映画 = えいが (সিনেমা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「暑い」-এর পড়া কোনটি?$m$, $m$["しごと", "おっと", "あつい", "しけん"]$m$::jsonb, 2, $m$暑い = あつい (গরম (আবহাওয়া))।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「広い」-এর পড়া কোনটি?$m$, $m$["しごと", "いしゃ", "しけん", "ひろい"]$m$::jsonb, 3, $m$広い = ひろい (প্রশস্ত)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「会議」-এর পড়া কোনটি?$m$, $m$["あかい", "しごと", "かいぎ", "えいが"]$m$::jsonb, 2, $m$会議 = かいぎ (মিটিং)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「あたたかい」মানে কী?$m$, $m$["দুঃখজনক", "উষ্ণ", "একাকী", "খোঁজ নেওয়া"]$m$::jsonb, 1, $m$あたたかい = উষ্ণ।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「しょうかい」মানে কী?$m$, $m$["স্বাধীন", "পরিচয় করিয়ে দেওয়া", "সাহায্য করা", "কড়া"]$m$::jsonb, 1, $m$しょうかい = পরিচয় করিয়ে দেওয়া।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「しらべます」মানে কী?$m$, $m$["যোগাযোগ", "শখ", "নিরাপদ", "খোঁজ নেওয়া"]$m$::jsonb, 3, $m$しらべます = খোঁজ নেওয়া।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「きびしい」মানে কী?$m$, $m$["জটিল", "কুড়িয়ে নেওয়া", "বাসা বদলানো", "কড়া"]$m$::jsonb, 3, $m$きびしい = কড়া।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「こわれます」মানে কী?$m$, $m$["ঠান্ডা (ছুঁলে)", "মোটা", "ক্ষমা চাওয়া", "ভেঙে যাওয়া"]$m$::jsonb, 3, $m$こわれます = ভেঙে যাওয়া।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$しけんに ごうかく（　）、とても うれしいです。$m$, $m$["できて", "でき", "できた", "できる"]$m$::jsonb, 0, $m$অনুভূতির কারণ → て-রূপ।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$しゅくだいを わすれて（　）。$m$, $m$["しまいました", "みました", "おきました", "ありました"]$m$::jsonb, 0, $m$অনিচ্ছায় ঘটে গেছে → て しまいました।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$この もんだいは かんたん（　）、すぐ わかります。$m$, $m$["まで", "なのに", "より", "なので"]$m$::jsonb, 3, $m$な-বিশেষণ + なので = কারণ।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$へやに だれか（　）ようです。$m$, $m$["いる", "いれ", "いて", "い"]$m$::jsonb, 0, $m$সাধারণ রূপ + ようです = মনে হচ্ছে।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$にほんでは、くつを ぬいで いえに（　）。$m$, $m$["はいります", "はいり", "はいれ", "はいって"]$m$::jsonb, 0, $m$বাক্যের শেষে → ます রূপ।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$あの えいがは まだ（　）。$m$, $m$["みました", "みます", "みましょう", "みて いません"]$m$::jsonb, 3, $m$まだ + "এখনো করিনি" → て いません।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$わたしは まだ にほんへ いった ことが（　）。$m$, $m$["いません", "ありません", "しません", "あります"]$m$::jsonb, 1, $m$まだ + না-বাচক।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$にほんへ いく まえに、パスポートを（　）おきます。$m$, $m$["とる", "とって", "とった", "とり"]$m$::jsonb, 1, $m$て-রূপ + おきます।$m$, $m$$m$),
      (t, 'reading', 19, $m$わたしは 毎朝 ジョギングを して います。最初は 10分しか 走れませんでしたが、今は 30分 走れるように なりました。$m$, $m$最初は 何分 走れましたか。$m$, $m$["1時間", "10分", "20分", "30分"]$m$::jsonb, 1, $m$লেখায় আছে → 10分।$m$, $m$$m$),
      (t, 'reading', 20, $m$わたしは 毎朝 ジョギングを して います。最初は 10分しか 走れませんでしたが、今は 30分 走れるように なりました。$m$, $m$今は どうですか。$m$, $m$["走れなく なった", "30分 走れる", "10分しか 走れない", "夜だけ 走って いる"]$m$::jsonb, 1, $m$লেখায় আছে → 30分 走れる।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ৩$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ৩$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -8) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「持ちます」-এর পড়া কোনটি?$m$, $m$["しんせつ", "うんてん", "もちます", "てんいん"]$m$::jsonb, 2, $m$持ちます = もちます (ধরা / বহন করা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「働きます」-এর পড়া কোনটি?$m$, $m$["ぎゅうにゅう", "あるきます", "はじまります", "はたらきます"]$m$::jsonb, 3, $m$働きます = はたらきます (কাজ করা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「問題」-এর পড়া কোনটি?$m$, $m$["もんだい", "しつもん", "たてもの", "ゆうめい"]$m$::jsonb, 0, $m$問題 = もんだい (সমস্যা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「自転車」-এর পড়া কোনটি?$m$, $m$["きょうしつ", "じてんしゃ", "こうじょう", "はしります"]$m$::jsonb, 1, $m$自転車 = じてんしゃ (সাইকেল)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「秋」-এর পড়া কোনটি?$m$, $m$["ちず", "あき", "よる", "にく"]$m$::jsonb, 1, $m$秋 = あき (শরৎ)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「かんたん」মানে কী?$m$, $m$["পরামর্শ", "সহজ", "একাকী", "বিপজ্জনক"]$m$::jsonb, 1, $m$かんたん = সহজ।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「はずかしい」মানে কী?$m$, $m$["অবাক হওয়া", "লজ্জাজনক", "ক্ষমা চাওয়া", "শক্ত"]$m$::jsonb, 1, $m$はずかしい = লজ্জাজনক।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「てつだいます」মানে কী?$m$, $m$["দয়ালু", "সাহায্য করা", "প্রতিশ্রুতি / অ্যাপয়েন্টমেন্ট", "ক্ষমা চাওয়া"]$m$::jsonb, 1, $m$てつだいます = সাহায্য করা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「じゆう」মানে কী?$m$, $m$["একাকী", "ভেঙে যাওয়া", "স্বাধীন", "বাসা বদলানো"]$m$::jsonb, 2, $m$じゆう = স্বাধীন।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「なくします」মানে কী?$m$, $m$["হারিয়ে ফেলা", "শখ", "নিয়মিত যাওয়া", "ঠিক করা"]$m$::jsonb, 0, $m$なくします = হারিয়ে ফেলা।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$わたしは ともだちに プレゼントを（　）。$m$, $m$["くれました", "ください", "いただいて", "あげました"]$m$::jsonb, 3, $m$আমি অন্যকে দিলে → あげました।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$あの ひとは せんせい（　）しれません。$m$, $m$["まで", "ので", "のに", "かも"]$m$::jsonb, 3, $m$"হয়তো" → かもしれません।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$せんせいに ほめ（　）ました。$m$, $m$["たり", "させ", "て", "られ"]$m$::jsonb, 3, $m$"প্রশংসিত হলাম" → ほめられました।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$あたまが いたい（　）、がっこうを やすみました。$m$, $m$["けど", "まで", "ので", "のに"]$m$::jsonb, 2, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$きょねんの なつ（　）ことしの なつの ほうが あついです。$m$, $m$["から", "より", "まで", "ほど"]$m$::jsonb, 1, $m$তুলনা → より।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$この みずは のんでも（　）ですか。$m$, $m$["だいじょうぶ", "ください", "いけません", "なりません"]$m$::jsonb, 0, $m$"খেলে সমস্যা নেই তো?" → だいじょうぶ।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$もし じかんが（　）ば、いっしょに いきましょう。$m$, $m$["あっ", "ある", "あれ", "あり"]$m$::jsonb, 2, $m$ば-শর্ত → あれば।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$あした あめが（　）ら、しあいは ありません。$m$, $m$["ふった", "ふって", "ふる", "ふらない"]$m$::jsonb, 0, $m$た-রূপ + ら = যদি…।$m$, $m$$m$),
      (t, 'reading', 19, $m$（お知らせ）来週の 月曜日は 図書館の 掃除の ため、休みです。本を 返したい 人は 入り口の 前の 箱に 入れて ください。$m$, $m$図書館は いつ 休みですか。$m$, $m$["毎週 月曜日", "今週の 月曜日", "来週の 日曜日", "来週の 月曜日"]$m$::jsonb, 3, $m$লেখায় আছে → 来週の 月曜日।$m$, $m$$m$),
      (t, 'reading', 20, $m$（お知らせ）来週の 月曜日は 図書館の 掃除の ため、休みです。本を 返したい 人は 入り口の 前の 箱に 入れて ください。$m$, $m$本を 返したい 人は どう しますか。$m$, $m$["火曜日に 来る", "入り口の 前の 箱に 入れる", "受付の 人に わたす", "家で 待つ"]$m$::jsonb, 1, $m$লেখায় আছে → 入り口の 前の 箱に 入れる।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ৪$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ৪$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -7) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「思います」-এর পড়া কোনটি?$m$, $m$["あるきます", "おもいます", "はしります", "けんきゅう"]$m$::jsonb, 1, $m$思います = おもいます (মনে করা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「重い」-এর পড়া কোনটি?$m$, $m$["おもい", "べんり", "しごと", "ひろい"]$m$::jsonb, 0, $m$重い = おもい (ভারী)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「貸します」-এর পড়া কোনটি?$m$, $m$["かします", "たいせつ", "もんだい", "もちます"]$m$::jsonb, 0, $m$貸します = かします (ধার দেওয়া)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「悪い」-এর পড়া কোনটি?$m$, $m$["かるい", "あつい", "わるい", "せかい"]$m$::jsonb, 2, $m$悪い = わるい (খারাপ)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「運転」-এর পড়া কোনটি?$m$, $m$["しんせつ", "うんてん", "もんだい", "もちます"]$m$::jsonb, 1, $m$運転 = うんてん (গাড়ি চালানো)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「さびしい」মানে কী?$m$, $m$["সহজ", "পরামর্শ", "নিয়মিত যাওয়া", "একাকী"]$m$::jsonb, 3, $m$さびしい = একাকী।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「しんぱい」মানে কী?$m$, $m$["ভেঙে যাওয়া", "ব্যাখ্যা", "দুশ্চিন্তা", "কুড়িয়ে নেওয়া"]$m$::jsonb, 2, $m$しんぱい = দুশ্চিন্তা।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「やくそく」মানে কী?$m$, $m$["লজ্জাজনক", "সরু", "ভেঙে যাওয়া", "প্রতিশ্রুতি / অ্যাপয়েন্টমেন্ট"]$m$::jsonb, 3, $m$やくそく = প্রতিশ্রুতি / অ্যাপয়েন্টমেন্ট।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「けいかく」মানে কী?$m$, $m$["পরিকল্পনা", "গভীর", "নিশ্চিন্ত", "ভদ্র / যত্নশীল"]$m$::jsonb, 0, $m$けいかく = পরিকল্পনা।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「まじめ」মানে কী?$m$, $m$["যোগাযোগ", "ঠান্ডা (ছুঁলে)", "ভদ্র / যত্নশীল", "সিরিয়াস / পরিশ্রমী"]$m$::jsonb, 3, $m$まじめ = সিরিয়াস / পরিশ্রমী।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$しずかに して ください。あかちゃんが（　）いますから。$m$, $m$["ねて", "ねる", "ね", "ねた"]$m$::jsonb, 0, $m$চলমান অবস্থা → て います।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$わたしは あねに ペンを かして（　）。$m$, $m$["なりました", "もらいました", "ください", "くれました"]$m$::jsonb, 1, $m$আমি কারো কাছ থেকে উপকার পেলে → て もらいました।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$たなかさんは やさしく（　）、おもしろい ひとです。$m$, $m$["と", "に", "で", "て"]$m$::jsonb, 3, $m$い-বিশেষণ জুড়তে → くて।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$にほんごで メールが（　）ように なりました。$m$, $m$["かく", "かいて", "かき", "かける"]$m$::jsonb, 3, $m$が-এর পরে সম্ভাব্য রূপ → かける।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$あしたは がっこうへ（　）なくても いいです。$m$, $m$["いって", "いき", "いか", "いく"]$m$::jsonb, 2, $m$"না গেলেও চলবে" → いかなくても いい।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$けいたいでんわを（　）ながら あるかないで ください。$m$, $m$["みた", "みる", "みて", "み"]$m$::jsonb, 3, $m$ます-কাণ্ড + ながら।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$この きっさてんは コーヒーが おいしい（　）、ゆうめいです。$m$, $m$["のに", "けど", "ので", "まで"]$m$::jsonb, 2, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$にほんへ いったら、すしを（　）と おもいます。$m$, $m$["たべて", "たべよう", "たべ", "たべれ"]$m$::jsonb, 1, $m$ইচ্ছা-রূপ + と おもいます = …করব ভাবছি।$m$, $m$$m$),
      (t, 'reading', 19, $m$田中さんは 料理が 上手です。特に カレーを 作るのが 得意です。週末には よく 友だちを 家に よんで、料理を ごちそう します。$m$, $m$田中さんが 得意な 料理は 何ですか。$m$, $m$["カレー", "ケーキ", "すし", "ラーメン"]$m$::jsonb, 0, $m$লেখায় আছে → カレー।$m$, $m$$m$),
      (t, 'reading', 20, $m$田中さんは 料理が 上手です。特に カレーを 作るのが 得意です。週末には よく 友だちを 家に よんで、料理を ごちそう します。$m$, $m$週末に よく 何を しますか。$m$, $m$["料理を 習う", "レストランへ 行く", "一人で 休む", "友だちに 料理を ごちそうする"]$m$::jsonb, 3, $m$লেখায় আছে → 友だちに 料理を ごちそうする।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ৫$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ৫$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -6) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「夕方」-এর পড়া কোনটি?$m$, $m$["たいせつ", "ゆうがた", "しゃしん", "てんいん"]$m$::jsonb, 1, $m$夕方 = ゆうがた (বিকেল)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「親切」-এর পড়া কোনটি?$m$, $m$["てんいん", "しんせつ", "しゃしん", "あかるい"]$m$::jsonb, 1, $m$親切 = しんせつ (দয়ালু)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「野菜」-এর পড়া কোনটি?$m$, $m$["あかい", "やさい", "さむい", "えいが"]$m$::jsonb, 1, $m$野菜 = やさい (সবজি)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「紙」-এর পড়া কোনটি?$m$, $m$["あに", "かみ", "ひる", "もり"]$m$::jsonb, 1, $m$紙 = かみ (কাগজ)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「有名」-এর পড়া কোনটি?$m$, $m$["ゆうがた", "ぎんこう", "ゆうめい", "おんがく"]$m$::jsonb, 2, $m$有名 = ゆうめい (বিখ্যাত)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ふくざつ」মানে কী?$m$, $m$["জটিল", "উষ্ণ", "দুঃখজনক", "কড়া"]$m$::jsonb, 0, $m$ふくざつ = জটিল।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「やわらかい」মানে কী?$m$, $m$["ক্ষমা চাওয়া", "কড়া", "নরম", "চকচক করা"]$m$::jsonb, 2, $m$やわらかい = নরম।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「ひつよう」মানে কী?$m$, $m$["ফেলে দেওয়া", "দুঃখজনক", "প্রয়োজন", "একাকী"]$m$::jsonb, 2, $m$ひつよう = প্রয়োজন।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「ひっこします」মানে কী?$m$, $m$["পড়ে যাওয়া", "সিরিয়াস / পরিশ্রমী", "বাসা বদলানো", "শখ"]$m$::jsonb, 2, $m$ひっこします = বাসা বদলানো।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「かよいます」মানে কী?$m$, $m$["ঠিক করা", "নিয়মিত যাওয়া", "দুশ্চিন্তা", "বিপজ্জনক"]$m$::jsonb, 1, $m$かよいます = নিয়মিত যাওয়া।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$にほんごが じょうずに（　）たいです。$m$, $m$["し", "い", "なり", "あり"]$m$::jsonb, 2, $m$"ভালো হতে চাই" → じょうずに なりたい।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$まどを あけても（　）ですか。$m$, $m$["いい", "いく", "よく", "よし"]$m$::jsonb, 0, $m$て-রূপ + も いいですか = …করতে পারি?$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$へやを きれいに（　）。$m$, $m$["ありました", "いました", "しました", "なりました"]$m$::jsonb, 2, $m$を থাকলে → きれいに します।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$ともだちが わたしの にもつを もって（　）。$m$, $m$["やりました", "くれました", "あげました", "もらいました"]$m$::jsonb, 1, $m$অন্যজন আমার জন্য করলে → て くれました।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$この へやは しずか（　）、ひろいです。$m$, $m$["な", "に", "の", "で"]$m$::jsonb, 3, $m$な-বিশেষণ জুড়তে → で।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$わたしは いぬに てを（　）。$m$, $m$["かんで", "かませました", "かみました", "かまれました"]$m$::jsonb, 3, $m$কেউ আমার সাথে কিছু করলে → কর্মবাচ্য (かまれました)।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$さむく（　）ましたね。$m$, $m$["あり", "なり", "い", "し"]$m$::jsonb, 1, $m$অবস্থা বদলানো → い-বিশেষণ + く なります।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$くだものの なかで りんごが（　）すきです。$m$, $m$["ぜんぜん", "もっと", "あまり", "いちばん"]$m$::jsonb, 3, $m$সবচেয়ে → いちばん।$m$, $m$$m$),
      (t, 'reading', 19, $m$昨日、電車の 中に かさを 忘れて しまいました。駅の 人に 聞いたら、終点の 駅に あると 言われました。今日 取りに 行く つもりです。$m$, $m$何を 忘れましたか。$m$, $m$["けいたい", "かばん", "さいふ", "かさ"]$m$::jsonb, 3, $m$লেখায় আছে → かさ।$m$, $m$$m$),
      (t, 'reading', 20, $m$昨日、電車の 中に かさを 忘れて しまいました。駅の 人に 聞いたら、終点の 駅に あると 言われました。今日 取りに 行く つもりです。$m$, $m$今日 何を する つもりですか。$m$, $m$["家で 休む", "駅に 電話する", "新しい かさを 買う", "かさを 取りに 行く"]$m$::jsonb, 3, $m$লেখায় আছে → かさを 取りに 行く।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ৬$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ৬$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -5) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「送ります」-এর পড়া কোনটি?$m$, $m$["いそぎます", "おくります", "しゃちょう", "けんきゅう"]$m$::jsonb, 1, $m$送ります = おくります (পাঠানো)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「楽しい」-এর পড়া কোনটি?$m$, $m$["もちます", "ゆうがた", "たのしい", "ぎんこう"]$m$::jsonb, 2, $m$楽しい = たのしい (আনন্দের)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「強い」-এর পড়া কোনটি?$m$, $m$["やさい", "くろい", "つよい", "おちゃ"]$m$::jsonb, 2, $m$強い = つよい (শক্তিশালী)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「元気」-এর পড়া কোনটি?$m$, $m$["あかい", "やさい", "げんき", "いしゃ"]$m$::jsonb, 2, $m$元気 = げんき (সুস্থ)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「泳ぎます」-এর পড়া কোনটি?$m$, $m$["しゅくだい", "およぎます", "おわります", "あるきます"]$m$::jsonb, 1, $m$泳ぎます = およぎます (সাঁতার কাটা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ざんねん」মানে কী?$m$, $m$["প্রতিশ্রুতি / অ্যাপয়েন্টমেন্ট", "অবাক হওয়া", "পরিকল্পনা", "দুঃখজনক"]$m$::jsonb, 3, $m$ざんねん = দুঃখজনক।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「すてます」মানে কী?$m$, $m$["উষ্ণ", "সিরিয়াস / পরিশ্রমী", "ফেলে দেওয়া", "দুঃখজনক"]$m$::jsonb, 2, $m$すてます = ফেলে দেওয়া।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「あやまります」মানে কী?$m$, $m$["ঠিক করা", "ঘুম ঘুম", "ক্ষমা চাওয়া", "গভীর"]$m$::jsonb, 2, $m$あやまります = ক্ষমা চাওয়া।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「せつめい」মানে কী?$m$, $m$["শক্ত", "নরম", "শখ", "ব্যাখ্যা"]$m$::jsonb, 3, $m$せつめい = ব্যাখ্যা।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「ねむい」মানে কী?$m$, $m$["সরু", "লজ্জাজনক", "নিশ্চিন্ত", "ঘুম ঘুম"]$m$::jsonb, 3, $m$ねむい = ঘুম ঘুম।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$にほんに きて から、もう 1ねんに（　）。$m$, $m$["います", "します", "あります", "なります"]$m$::jsonb, 3, $m$সময় পার হলো → …に なります।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$この ボタンを おす（　）、ドアが あきます。$m$, $m$["と", "まで", "のに", "けど"]$m$::jsonb, 0, $m$সবসময় ঘটে → অভিধান রূপ + と।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$パーティーの まえに、ビールを かって（　）ましょう。$m$, $m$["あり", "くれ", "おき", "なり"]$m$::jsonb, 2, $m$আগে থেকে প্রস্তুতি → て おきます।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$あの ひとは さっきから ずっと でんわで（　）います。$m$, $m$["はなし", "はなした", "はなして", "はなす"]$m$::jsonb, 2, $m$চলমান → て います।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$らいねん にほんへ いく（　）に しました。$m$, $m$["ため", "こと", "まで", "そう"]$m$::jsonb, 1, $m$নিজে সিদ্ধান্ত নিলাম → ことに しました।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$みちが わからない（　）、ちずを みました。$m$, $m$["まで", "より", "のに", "ので"]$m$::jsonb, 3, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$にほんごを ならう（　）、にほんへ いきます。$m$, $m$["ために", "ように", "まで", "より"]$m$::jsonb, 0, $m$উদ্দেশ্য (নিজের ইচ্ছায় করা কাজ) → ために।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$さいふを おとさない（　）に、きを つけて ください。$m$, $m$["まえ", "そう", "よう", "らしい"]$m$::jsonb, 2, $m$"যাতে না হয়" → ない-রূপ + ように।$m$, $m$$m$),
      (t, 'reading', 19, $m$わたしの 町には 大きい 公園が あります。春には 桜が さいて、たくさんの 人が 花見に 来ます。夏は 子どもたちが 池で 遊びます。$m$, $m$春に 公園で 何が 見られますか。$m$, $m$["雪", "海", "桜", "もみじ"]$m$::jsonb, 2, $m$লেখায় আছে → 桜।$m$, $m$$m$),
      (t, 'reading', 20, $m$わたしの 町には 大きい 公園が あります。春には 桜が さいて、たくさんの 人が 花見に 来ます。夏は 子どもたちが 池で 遊びます。$m$, $m$夏に 子どもたちは どこで 遊びますか。$m$, $m$["山", "池", "家", "学校"]$m$::jsonb, 1, $m$লেখায় আছে → 池।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ৭$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ৭$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -4) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「遠い」-এর পড়া কোনটি?$m$, $m$["おちゃ", "よわい", "とおい", "やさい"]$m$::jsonb, 2, $m$遠い = とおい (দূরে)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「音楽」-এর পড়া কোনটি?$m$, $m$["たのしい", "おんがく", "うんてん", "たいせつ"]$m$::jsonb, 1, $m$音楽 = おんがく (সংগীত)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「妹」-এর পড়া কোনটি?$m$, $m$["もちます", "しゃしん", "いもうと", "もんだい"]$m$::jsonb, 2, $m$妹 = いもうと (ছোট বোন)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「空港」-এর পড়া কোনটি?$m$, $m$["いもうと", "ゆうがた", "くうこう", "しゃしん"]$m$::jsonb, 2, $m$空港 = くうこう (বিমানবন্দর)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「習います」-এর পড়া কোনটি?$m$, $m$["だいどころ", "ならいます", "おしえます", "おわります"]$m$::jsonb, 1, $m$習います = ならいます ((কারো কাছে) শেখা)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「かたい」মানে কী?$m$, $m$["শক্ত", "অভিজ্ঞতা", "খোঁজ নেওয়া", "শখ"]$m$::jsonb, 0, $m$かたい = শক্ত।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「つめたい」মানে কী?$m$, $m$["পড়ে যাওয়া", "ব্যাখ্যা", "ঠান্ডা (ছুঁলে)", "গভীর"]$m$::jsonb, 2, $m$つめたい = ঠান্ডা (ছুঁলে)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「あんしん」মানে কী?$m$, $m$["জটিল", "নিয়মিত যাওয়া", "সিরিয়াস / পরিশ্রমী", "নিশ্চিন্ত"]$m$::jsonb, 3, $m$あんしん = নিশ্চিন্ত।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「じゅんび」মানে কী?$m$, $m$["প্রস্তুতি", "প্রয়োজন", "খুশি", "বিপজ্জনক"]$m$::jsonb, 0, $m$じゅんび = প্রস্তুতি।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「ていねい」মানে কী?$m$, $m$["হারিয়ে ফেলা", "শখ", "নিয়মিত যাওয়া", "ভদ্র / যত্নশীল"]$m$::jsonb, 3, $m$ていねい = ভদ্র / যত্নশীল।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$あしたは はれる（　）。$m$, $m$["でしょう", "たい", "ください", "ましょう"]$m$::jsonb, 0, $m$অনুমান → でしょう।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$この ふくを きて（　）も いいですか。$m$, $m$["み", "さ", "あり", "なり"]$m$::jsonb, 0, $m$চেষ্টা করে দেখা → て みます।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$あした くる（　）どうか、わかりません。$m$, $m$["を", "か", "に", "が"]$m$::jsonb, 1, $m$"আসবে কিনা" → …か どうか।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$バスより でんしゃ（　）はやいです。$m$, $m$["より", "の ほうが", "まで", "から"]$m$::jsonb, 1, $m$তুলনা → Aより Bの ほうが।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$くらく なる（　）に、かえりましょう。$m$, $m$["まえ", "ので", "ながら", "あと"]$m$::jsonb, 0, $m$অভিধান রূপ + まえに।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$この かんじの よみかたを（　）ください。$m$, $m$["おしえる", "おしえ", "おしえた", "おしえて"]$m$::jsonb, 3, $m$て-রূপ + ください।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$ここで たばこを すっては（　）。$m$, $m$["いいです", "いけません", "いきます", "あります"]$m$::jsonb, 1, $m$て-রূপ + は いけません = নিষেধ।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$かいぎは なんじに はじまるか（　）。$m$, $m$["しりますか", "しりませんか", "しって いますか", "しって ください"]$m$::jsonb, 2, $m$"জানেন কি?" → しって いますか।$m$, $m$$m$),
      (t, 'reading', 19, $m$リンさんへ　今日の 会議は 3時から 4時に 変わりました。場所は 同じ 2階の 会議室です。よろしく お願いします。　山本$m$, $m$会議は 何時からに なりましたか。$m$, $m$["5時", "2時", "4時", "3時"]$m$::jsonb, 2, $m$লেখায় আছে → 4時।$m$, $m$$m$),
      (t, 'reading', 20, $m$リンさんへ　今日の 会議は 3時から 4時に 変わりました。場所は 同じ 2階の 会議室です。よろしく お願いします。　山本$m$, $m$会議の 場所は どこですか。$m$, $m$["2階の 会議室", "1階の 会議室", "3階の 教室", "社長の 部屋"]$m$::jsonb, 0, $m$লেখায় আছে → 2階の 会議室।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ৮$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ৮$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -3) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「着ます」-এর পড়া কোনটি?$m$, $m$["きます", "わるい", "せかい", "やさい"]$m$::jsonb, 0, $m$着ます = きます ((জামা) পরা)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「風」-এর পড়া কোনটি?$m$, $m$["にく", "よる", "かぜ", "あき"]$m$::jsonb, 2, $m$風 = かぜ (বাতাস)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「春」-এর পড়া কোনটি?$m$, $m$["はる", "よる", "あき", "あね"]$m$::jsonb, 0, $m$春 = はる (বসন্ত)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「借ります」-এর পড়া কোনটি?$m$, $m$["かります", "もちます", "しつもん", "たてもの"]$m$::jsonb, 0, $m$借ります = かります (ধার নেওয়া)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「海」-এর পড়া কোনটি?$m$, $m$["あに", "はる", "へや", "うみ"]$m$::jsonb, 3, $m$海 = うみ (সমুদ্র)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ふかい」মানে কী?$m$, $m$["লজ্জাজনক", "ফেলে দেওয়া", "গভীর", "হারিয়ে ফেলা"]$m$::jsonb, 2, $m$ふかい = গভীর।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「やさしい」মানে কী?$m$, $m$["নিরাপদ", "শক্ত", "দয়ালু", "প্রয়োজন"]$m$::jsonb, 2, $m$やさしい = দয়ালু।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「ほそい」মানে কী?$m$, $m$["ঠিক করা", "প্রস্তুতি", "অভিজ্ঞতা", "সরু"]$m$::jsonb, 3, $m$ほそい = সরু।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「きめます」মানে কী?$m$, $m$["প্রস্তুতি", "ঠিক করা", "কড়া", "পরিচয় করিয়ে দেওয়া"]$m$::jsonb, 1, $m$きめます = ঠিক করা।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「ふとい」মানে কী?$m$, $m$["হারিয়ে ফেলা", "মোটা", "ভদ্র / যত্নশীল", "ঠান্ডা (ছুঁলে)"]$m$::jsonb, 1, $m$ふとい = মোটা।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$にほんごが はなせる（　）に なりました。$m$, $m$["よう", "そう", "ため", "こと"]$m$::jsonb, 0, $m$পারা শুরু হলো → …ように なりました।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$まどが しめて（　）。$m$, $m$["あります", "なります", "います", "きます"]$m$::jsonb, 0, $m$কেউ করে রেখেছে (他動詞 + が) → て あります।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$きょうは にちようびだ（　）、ぎんこうは やすみでしょう。$m$, $m$["けど", "まで", "から", "のに"]$m$::jsonb, 2, $m$কারণ → から।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$わたしは にく（　）さかなの ほうが すきです。$m$, $m$["より", "まで", "ほど", "から"]$m$::jsonb, 0, $m$তুলনা → AよりBの ほうが।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$あついですね。まどを（　）か。$m$, $m$["あけました", "あけましょう", "あけて", "あけ"]$m$::jsonb, 1, $m$প্রস্তাব → ましょうか।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$そらが くらく なりました。あめが ふり（　）です。$m$, $m$["そう", "みたい", "よう", "らしい"]$m$::jsonb, 0, $m$দেখে মনে হচ্ছে এখনই হবে → ます-কাণ্ড + そう।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$せんせいが わたしに じしょを（　）。$m$, $m$["もらいました", "あげました", "やりました", "くれました"]$m$::jsonb, 3, $m$অন্য কেউ আমাকে দিলে → くれました।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$わたしの しゅみは しゃしんを とる（　）です。$m$, $m$["ため", "こと", "まで", "ところ"]$m$::jsonb, 1, $m$ক্রিয়াকে নাম বানাতে → こと।$m$, $m$$m$),
      (t, 'reading', 19, $m$日本の コンビニは とても 便利です。食べ物や 飲み物だけでなく、切手も 買えますし、お金も おろせます。24時間 開いて いる 店が 多いです。$m$, $m$コンビニで できない ことは どれですか。$m$, $m$["飲み物を 買う", "お金を おろす", "家を 借りる", "切手を 買う"]$m$::jsonb, 2, $m$লেখায় আছে → 家を 借りる।$m$, $m$$m$),
      (t, 'reading', 20, $m$日本の コンビニは とても 便利です。食べ物や 飲み物だけでなく、切手も 買えますし、お金も おろせます。24時間 開いて いる 店が 多いです。$m$, $m$コンビニは どうですか。$m$, $m$["日曜日は 休み", "夜は しまる", "食べ物しか 売って いない", "24時間 開いて いる 店が 多い"]$m$::jsonb, 3, $m$লেখায় আছে → 24時間 開いて いる 店が 多い।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ৯$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ৯$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -2) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「台所」-এর পড়া কোনটি?$m$, $m$["だいどころ", "つくります", "しゃちょう", "はしります"]$m$::jsonb, 0, $m$台所 = だいどころ (রান্নাঘর)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「医者」-এর পড়া কোনটি?$m$, $m$["しごと", "きます", "げんき", "いしゃ"]$m$::jsonb, 3, $m$医者 = いしゃ (ডাক্তার)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「質問」-এর পড়া কোনটি?$m$, $m$["もちます", "いもうと", "しつもん", "うんてん"]$m$::jsonb, 2, $m$質問 = しつもん (প্রশ্ন)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「明るい」-এর পড়া কোনটি?$m$, $m$["しゃしん", "かります", "あかるい", "たのしい"]$m$::jsonb, 2, $m$明るい = あかるい (উজ্জ্বল)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「夜」-এর পড়া কোনটি?$m$, $m$["よる", "ひる", "あに", "うた"]$m$::jsonb, 0, $m$夜 = よる (রাত)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「きけん」মানে কী?$m$, $m$["স্বাধীন", "বিপজ্জনক", "গভীর", "জটিল"]$m$::jsonb, 1, $m$きけん = বিপজ্জনক।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「そうだん」মানে কী?$m$, $m$["জটিল", "পরিচয় করিয়ে দেওয়া", "শক্ত", "পরামর্শ"]$m$::jsonb, 3, $m$そうだん = পরামর্শ।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「うれしい」মানে কী?$m$, $m$["ঠিক করা", "দয়ালু", "ক্ষমা চাওয়া", "খুশি"]$m$::jsonb, 3, $m$うれしい = খুশি।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「びっくり」মানে কী?$m$, $m$["কুড়িয়ে নেওয়া", "ভদ্র / যত্নশীল", "মোটা", "অবাক হওয়া"]$m$::jsonb, 3, $m$びっくり = অবাক হওয়া।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「しゅみ」মানে কী?$m$, $m$["শখ", "সহজ", "গভীর", "ফেলে দেওয়া"]$m$::jsonb, 0, $m$しゅみ = শখ।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$あには いますが、あね（　）いません。$m$, $m$["に", "は", "で", "を"]$m$::jsonb, 1, $m$তুলনা করে বলা → は।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$その にもつ、（　）ましょうか。$m$, $m$["もって", "もった", "もつ", "もち"]$m$::jsonb, 3, $m$ます-কাণ্ড + ましょうか।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$にほんの せいかつに もう（　）。$m$, $m$["なれて", "なれ", "なれました", "なれる"]$m$::jsonb, 2, $m$もう + অতীত (অভ্যস্ত হয়ে গেছি)।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$てを あらって（　）、ごはんを たべます。$m$, $m$["から", "より", "まで", "ので"]$m$::jsonb, 0, $m$て-রূপ + から = …করার পরে।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$きのうの パーティーは（　）でしたか。—とても たのしかったです。$m$, $m$["どう", "どこ", "いつ", "だれ"]$m$::jsonb, 0, $m$"কেমন" → どう।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$わすれ（　）ように、メモを します。$m$, $m$["ず", "て", "なく", "ない"]$m$::jsonb, 3, $m$"যাতে না ভুলি" → わすれないように।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$ふじさんに のぼった こと（　）あります。$m$, $m$["で", "が", "に", "を"]$m$::jsonb, 1, $m$た-রূপ + ことが あります = আগে করেছি।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$くすりを のめば、すぐ（　）よ。$m$, $m$["なおって", "なおりました", "なおります", "なおった"]$m$::jsonb, 2, $m$শর্তের পরে ফল → ます রূপ।$m$, $m$$m$),
      (t, 'reading', 19, $m$兄は 銀行で 働いて います。毎日 忙しくて、帰るのは いつも 夜 9時ごろです。でも、日曜日は 休みなので、家族と いっしょに 出かけます。$m$, $m$兄の 仕事は 何ですか。$m$, $m$["店員", "学校の 先生", "銀行で 働いて いる", "医者"]$m$::jsonb, 2, $m$লেখায় আছে → 銀行で 働いて いる।$m$, $m$$m$),
      (t, 'reading', 20, $m$兄は 銀行で 働いて います。毎日 忙しくて、帰るのは いつも 夜 9時ごろです。でも、日曜日は 休みなので、家族と いっしょに 出かけます。$m$, $m$日曜日 兄は 何を しますか。$m$, $m$["仕事を する", "家族と 出かける", "一人で 寝る", "銀行へ 行く"]$m$::jsonb, 1, $m$লেখায় আছে → 家族と 出かける।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ মক টেস্ট ১০$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ মক টেস্ট ১০$m$, 'N4', 'full', $m$সহজ পূর্ণ মক · শব্দ ১০ · ব্যাকরণ ৮ · পড়া ২$m$, 25, 50, false, -1) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$「意味」-এর পড়া কোনটি?$m$, $m$["へや", "にく", "いみ", "かみ"]$m$::jsonb, 2, $m$意味 = いみ (অর্থ)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$「使います」-এর পড়া কোনটি?$m$, $m$["つくります", "だいどころ", "つかいます", "いそぎます"]$m$::jsonb, 2, $m$使います = つかいます (ব্যবহার করা)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$「試験」-এর পড়া কোনটি?$m$, $m$["くらい", "やさい", "おちゃ", "しけん"]$m$::jsonb, 3, $m$試験 = しけん (পরীক্ষা)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$「夫」-এর পড়া কোনটি?$m$, $m$["おちゃ", "げんき", "おっと", "さむい"]$m$::jsonb, 2, $m$夫 = おっと (স্বামী)।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「寒い」-এর পড়া কোনটি?$m$, $m$["おちゃ", "かるい", "さむい", "おもい"]$m$::jsonb, 2, $m$寒い = さむい (ঠান্ডা (আবহাওয়া))।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$「ひろいます」মানে কী?$m$, $m$["বিপজ্জনক", "সহজ", "কুড়িয়ে নেওয়া", "ঠিক করা"]$m$::jsonb, 2, $m$ひろいます = কুড়িয়ে নেওয়া।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$「あんぜん」মানে কী?$m$, $m$["নিরাপদ", "পরামর্শ", "যোগাযোগ", "পালানো"]$m$::jsonb, 0, $m$あんぜん = নিরাপদ।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「にげます」মানে কী?$m$, $m$["প্রতিশ্রুতি / অ্যাপয়েন্টমেন্ট", "খোঁজ নেওয়া", "সরু", "পালানো"]$m$::jsonb, 3, $m$にげます = পালানো।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「おちます」মানে কী?$m$, $m$["একাকী", "মোটা", "পড়ে যাওয়া", "ঠিক করা"]$m$::jsonb, 2, $m$おちます = পড়ে যাওয়া।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「れんらく」মানে কী?$m$, $m$["যোগাযোগ", "ভদ্র / যত্নশীল", "হারিয়ে ফেলা", "খুশি"]$m$::jsonb, 0, $m$れんらく = যোগাযোগ।$m$, $m$$m$),
      (t, 'grammar', 11, $m$$m$, $m$おんがくを（　）ながら べんきょうします。$m$, $m$["きいた", "きき", "きいて", "きく"]$m$::jsonb, 1, $m$ます-রূপের কাণ্ড + ながら = …করতে করতে।$m$, $m$$m$),
      (t, 'grammar', 12, $m$$m$, $m$この かばんは かるくて、（　）です。$m$, $m$["べんりな", "べんり", "べんりの", "べんりに"]$m$::jsonb, 1, $m$な-বিশেষণ + です → な লাগে না।$m$, $m$$m$),
      (t, 'grammar', 13, $m$$m$, $m$あめが ふって いる（　）、かさを もって いきます。$m$, $m$["のに", "まで", "けど", "から"]$m$::jsonb, 3, $m$কারণ → から।$m$, $m$$m$),
      (t, 'grammar', 14, $m$$m$, $m$この しごとは きょうじゅうに（　）なければ なりません。$m$, $m$["し", "した", "して", "する"]$m$::jsonb, 0, $m$"করতেই হবে" → ない-রূপ (し) + なければ なりません।$m$, $m$$m$),
      (t, 'grammar', 15, $m$$m$, $m$ねる（　）、はを みがきます。$m$, $m$["あとで", "のに", "ながら", "まえに"]$m$::jsonb, 3, $m$অভিধান রূপ + まえに = …করার আগে।$m$, $m$$m$),
      (t, 'grammar', 16, $m$$m$, $m$もう ひるごはんを（　）か。—はい、たべました。$m$, $m$["たべました", "たべましょう", "たべません", "たべます"]$m$::jsonb, 0, $m$もう + অতীত।$m$, $m$$m$),
      (t, 'grammar', 17, $m$$m$, $m$あしたは しけんが ある（　）、きょうは はやく ねます。$m$, $m$["ので", "のに", "まで", "けど"]$m$::jsonb, 0, $m$কারণ → ので।$m$, $m$$m$),
      (t, 'grammar', 18, $m$$m$, $m$あしたの パーティーに（　）つもりです。$m$, $m$["いった", "いく", "いって", "いき"]$m$::jsonb, 1, $m$অভিধান রূপ + つもり = ইচ্ছা আছে।$m$, $m$$m$),
      (t, 'reading', 19, $m$わたしは 日本語の 授業で、自分の 国の 料理について 発表しました。みんなが 興味を 持って、たくさん 質問して くれました。とても うれしかったです。$m$, $m$何に ついて 発表しましたか。$m$, $m$["自分の 家族", "日本の 旅行", "日本の 料理", "自分の 国の 料理"]$m$::jsonb, 3, $m$লেখায় আছে → 自分の 国の 料理।$m$, $m$$m$),
      (t, 'reading', 20, $m$わたしは 日本語の 授業で、自分の 国の 料理について 発表しました。みんなが 興味を 持って、たくさん 質問して くれました。とても うれしかったです。$m$, $m$発表の あと、どう 感じましたか。$m$, $m$["うれしかった", "ざんねんだった", "つかれた", "はずかしかった"]$m$::jsonb, 0, $m$লেখায় আছে → うれしかった।$m$, $m$$m$);
  end if;
end $seed$;
select 'ROWS:'||count(distinct m.id)||' tests, '||count(q.id)||' questions' from public.mock_tests m join public.mock_questions q on q.test_id = m.id where m.title like '%সহজ%';
