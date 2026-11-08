-- Sakura Portal · easy starter tests so new students aren't scared: N5 & N4 · 10 easy kanji + 10 easy grammar each.
-- Original questions written for Sakura. Added as hidden drafts: a teacher checks them, then turns them on.
-- Safe to run more than once (a test whose title already exists is skipped).
do $seed$ declare t uuid; begin
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ কানজি (শুরু)$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ কানজি (শুরু)$m$, 'N5', 'kanji', $m$নতুনদের জন্য সহজ কানজি · ১০টি প্রশ্ন$m$, 10, 50, false, 100) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
あの 【山】は きれいです。$m$, $m$["かわ", "やま", "そら", "うみ"]$m$::jsonb, 1, $m$山 = やま (পাহাড়)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
【川】で さかなを みました。$m$, $m$["かわ", "いけ", "みち", "やま"]$m$::jsonb, 0, $m$川 = かわ (নদী)।$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
【水】を のみます。$m$, $m$["ひ", "き", "みず", "つち"]$m$::jsonb, 2, $m$水 = みず (পানি)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
【火】ようびに きます。$m$, $m$["げつ", "すい", "もく", "か"]$m$::jsonb, 3, $m$火曜日 = かようび (মঙ্গলবার)। 火 = আগুন।$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「人」মানে কী?$m$, $m$["গাছ", "মানুষ", "মুখ", "দরজা"]$m$::jsonb, 1, $m$人 = ひと (মানুষ)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
【大きい】 いぬです。$m$, $m$["おおきい", "ちいさい", "ながい", "たかい"]$m$::jsonb, 0, $m$大きい = おおきい (বড়)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
【木】の したに ねこが います。$m$, $m$["ひ", "め", "き", "て"]$m$::jsonb, 2, $m$木 = き (গাছ)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$「口」মানে কী?$m$, $m$["চোখ", "কান", "হাত", "মুখ"]$m$::jsonb, 3, $m$口 = くち (মুখ)। চোখ = 目।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
りんごを 【三つ】 ください。$m$, $m$["ひとつ", "ふたつ", "みっつ", "よっつ"]$m$::jsonb, 2, $m$三つ = みっつ (তিনটা)।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$「にほん」কানজিতে কোনটি?$m$, $m$["目本", "日本", "日木", "白本"]$m$::jsonb, 1, $m$日本 = にほん (জাপান)। 日 আর 本 ভালো করে দেখুন।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N5 সহজ ব্যাকরণ (শুরু)$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N5 সহজ ব্যাকরণ (শুরু)$m$, 'N5', 'grammar', $m$নতুনদের জন্য সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, 200) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$（　）-এ কোনটি বসবে?
わたし（　）バングラデシュじんです。$m$, $m$["を", "は", "で", "へ"]$m$::jsonb, 1, $m$"আমি বাংলাদেশি" → わたしは …です।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$（　）-এ কোনটি বসবে?
これは わたし（　）ほんです。$m$, $m$["の", "に", "を", "が"]$m$::jsonb, 0, $m$"আমার বই" → わたしの ほん।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$（　）-এ কোনটি বসবে?
まいあさ パン（　）たべます。$m$, $m$["が", "へ", "を", "で"]$m$::jsonb, 2, $m$যা খাই তার পরে を।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$（　）-এ কোনটি বসবে?
7じ（　）おきます。$m$, $m$["を", "に", "が", "の"]$m$::jsonb, 1, $m$সময়ের পরে に → 7じに।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$（　）-এ কোনটি বসবে?
A「これは なんですか。」
B「（　）は ペンです。」$m$, $m$["どこ", "だれ", "それ", "いつ"]$m$::jsonb, 2, $m$A-র হাতের জিনিস B-র কাছে "ওটা" → それ।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$（　）-এ কোনটি বসবে?
きのう テレビを（　）。$m$, $m$["みます", "みました", "みません", "みましょう"]$m$::jsonb, 1, $m$きのう (গতকাল) → অতীত: みました।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$（　）-এ কোনটি বসবে?
としょかん（　）べんきょうします。$m$, $m$["で", "を", "が", "の"]$m$::jsonb, 0, $m$কাজটা যেখানে হয় → জায়গা + で।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$（　）-এ কোনটি বসবে?
A「コーヒーを のみますか。」
B「いいえ、（　）。」$m$, $m$["のみます", "のみました", "のみません", "のみたいです"]$m$::jsonb, 2, $m$いいえ-র পরে না-বাচক → のみません।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$（　）-এ কোনটি বসবে?
つくえの うえ（　）ほんが あります。$m$, $m$["を", "に", "へ", "と"]$m$::jsonb, 1, $m$কোথায় আছে → জায়গা + に あります।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$（　）-এ কোনটি বসবে?
ともだち（　）えいがを みます。$m$, $m$["を", "が", "と", "の"]$m$::jsonb, 2, $m$"বন্ধুর সাথে" → ともだちと।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ কানজি (শুরু)$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ কানজি (শুরু)$m$, 'N4', 'kanji', $m$N4 শুরু করার জন্য সহজ কানজি · ১০টি প্রশ্ন$m$, 10, 50, false, 100) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'vocab', 1, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
ちちは 【会社】へ いきます。$m$, $m$["かいしゃ", "がいしゃ", "かいじゃ", "けいしゃ"]$m$::jsonb, 0, $m$会社 = かいしゃ (অফিস/কোম্পানি)।$m$, $m$$m$),
      (t, 'vocab', 2, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
えきは ここから 【近い】です。$m$, $m$["とおい", "ちかい", "ひろい", "はやい"]$m$::jsonb, 1, $m$近い = ちかい (কাছে)। দূরে = 遠い。$m$, $m$$m$),
      (t, 'vocab', 3, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
【朝】ごはんを たべました。$m$, $m$["ひる", "よる", "あさ", "ばん"]$m$::jsonb, 2, $m$朝 = あさ (সকাল)।$m$, $m$$m$),
      (t, 'vocab', 4, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
あした 【病院】へ いきます。$m$, $m$["びよういん", "ぴょういん", "びょうき", "びょういん"]$m$::jsonb, 3, $m$病院 = びょういん (হাসপাতাল)। びよういん = বিউটি পার্লার!$m$, $m$$m$),
      (t, 'vocab', 5, $m$$m$, $m$「家族」মানে কী?$m$, $m$["বন্ধু", "পরিবার", "শিক্ষক", "প্রতিবেশী"]$m$::jsonb, 1, $m$家族 = かぞく (পরিবার)।$m$, $m$$m$),
      (t, 'vocab', 6, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
まいあさ 6じに 【起きます】。$m$, $m$["いきます", "ねます", "おきます", "かきます"]$m$::jsonb, 2, $m$起きます = おきます (ঘুম থেকে ওঠা)।$m$, $m$$m$),
      (t, 'vocab', 7, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
なつやすみに 【旅行】します。$m$, $m$["りょうこう", "りよこう", "りょこう", "りょごう"]$m$::jsonb, 2, $m$旅行 = りょこう (ভ্রমণ)।$m$, $m$$m$),
      (t, 'vocab', 8, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
この みせは くだものを 【売ります】。$m$, $m$["かいます", "うります", "おくります", "とります"]$m$::jsonb, 1, $m$売ります = うります (বিক্রি করা)। かいます = কেনা।$m$, $m$$m$),
      (t, 'vocab', 9, $m$$m$, $m$「早い」মানে কী?$m$, $m$["ধীর", "ভারী", "তাড়াতাড়ি", "দূরে"]$m$::jsonb, 2, $m$早い = はやい (তাড়াতাড়ি)।$m$, $m$$m$),
      (t, 'vocab', 10, $m$$m$, $m$【 】-এর শব্দটি কীভাবে পড়া হয়?
【青い】 そらが すきです。$m$, $m$["あかい", "くろい", "しろい", "あおい"]$m$::jsonb, 3, $m$青い = あおい (নীল)।$m$, $m$$m$);
  end if;
  if not exists (select 1 from public.mock_tests where title = $m$N4 সহজ ব্যাকরণ (শুরু)$m$) then
    insert into public.mock_tests (title, level, category, description, duration_min, pass_pct, published, sort_order) values ($m$N4 সহজ ব্যাকরণ (শুরু)$m$, 'N4', 'grammar', $m$N4 শুরু করার জন্য সহজ ব্যাকরণ · ১০টি প্রশ্ন$m$, 10, 50, false, 200) returning id into t;
    insert into public.mock_questions (test_id, section, sort_order, passage, question, options, correct, explanation, script) values
      (t, 'grammar', 1, $m$$m$, $m$（　）-এ কোনটি বসবে?
わたしは にほんごを（　）ことが できます。$m$, $m$["はなす", "はなして", "はなした", "はなさ"]$m$::jsonb, 0, $m$অভিধান রূপ + ことが できます = পারি।$m$, $m$$m$),
      (t, 'grammar', 2, $m$$m$, $m$（　）-এ কোনটি বসবে?
まどを（　）ください。$m$, $m$["あける", "あけて", "あけた", "あけない"]$m$::jsonb, 1, $m$て রূপ + ください = অনুগ্রহ করে …করুন।$m$, $m$$m$),
      (t, 'grammar', 3, $m$$m$, $m$（　）-এ কোনটি বসবে?
この ケーキは おいし（　）です。$m$, $m$["よう", "そう", "らしい", "だろう"]$m$::jsonb, 1, $m$দেখে মনে হচ্ছে মজার → おいしそう।$m$, $m$$m$),
      (t, 'grammar', 4, $m$$m$, $m$（　）-এ কোনটি বসবে?
にもつが おもい（　）、てつだって ください。$m$, $m$["のに", "けど", "ので", "まで"]$m$::jsonb, 2, $m$কারণ বোঝাতে → ので (ভারী, তাই…)।$m$, $m$$m$),
      (t, 'grammar', 5, $m$$m$, $m$（　）-এ কোনটি বসবে?
しゅくだいを（　）あとで、テレビを みます。$m$, $m$["する", "して", "しない", "した"]$m$::jsonb, 3, $m$た রূপ + あとで = …করার পরে।$m$, $m$$m$),
      (t, 'grammar', 6, $m$$m$, $m$（　）-এ কোনটি বসবে?
日本へ いった こと（　）あります。$m$, $m$["が", "を", "に", "で"]$m$::jsonb, 0, $m$た রূপ + ことが あります = আগে করেছি।$m$, $m$$m$),
      (t, 'grammar', 7, $m$$m$, $m$（　）-এ কোনটি বসবে?
ねる（　）に、はを みがきます。$m$, $m$["あと", "まえ", "ながら", "ので"]$m$::jsonb, 1, $m$অভিধান রূপ + まえに = …করার আগে।$m$, $m$$m$),
      (t, 'grammar', 8, $m$$m$, $m$（　）-এ কোনটি বসবে?
あした 先生に（　）と おもいます。$m$, $m$["ききます", "ききました", "ききましょう", "きこう"]$m$::jsonb, 3, $m$ইচ্ছা বোঝাতে → きこう (ইচ্ছা-রূপ) + と おもいます = জিজ্ঞেস করব ভাবছি।$m$, $m$$m$),
      (t, 'grammar', 9, $m$$m$, $m$（　）-এ কোনটি বসবে?
へやの でんきが ついて（　）。$m$, $m$["あります", "おきます", "います", "しまいます"]$m$::jsonb, 2, $m$অবস্থা বোঝাতে (বাতি জ্বলে আছে) → ついて います।$m$, $m$$m$),
      (t, 'grammar', 10, $m$$m$, $m$（　）-এ কোনটি বসবে?
あめが（　）ら、でかけません。$m$, $m$["ふった", "ふって", "ふる", "ふらない"]$m$::jsonb, 0, $m$た রূপ + ら = যদি… (বৃষ্টি হলে)।$m$, $m$$m$);
  end if;
end $seed$;
select 'ROWS:'||string_agg(m.title||'='||(select count(*) from public.mock_questions q where q.test_id = m.id), ' | ') from public.mock_tests m where m.title like '%সহজ%(শুরু)';
