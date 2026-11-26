-- Sakura Portal · proofreading fixes for mock tests (Nov 2026)
-- 1) name サヤム → サエム everywhere
update public.mock_questions set
  passage = replace(passage,'サヤム','サエム'),
  question = replace(question,'サヤム','サエム'),
  options = replace(options::text,'サヤム','サエム')::jsonb,
  explanation = replace(explanation,'サヤム','サエム'),
  script = replace(script,'サヤム','サエム')
where (passage||question||options::text||explanation||script) like '%サヤム%';

-- 2) はじまるか（ ）: しりませんか is also right → しって ありますか
update public.mock_questions set
  options = replace(options::text,'"しりませんか"','"しって ありますか"')::jsonb
where question like '%はじまるか%' and options ? 'しりませんか'
  and (options->>correct) <> 'しりませんか';

-- 3) 3時から 4時に 変わりました → 3時からでしたが、4時からに 変わりました
update public.mock_questions set
  passage = replace(passage,'3時から 4時に {変|か}わりました','3時からでしたが、4時からに {変|か}わりました')
where passage like '%3時から 4時に {変|か}わりました%';

-- 4) えどの 時代 → むかしの 時代
update public.mock_questions set
  question = replace(question,'えどの ','むかしの ')
where question like '%えどの %時代%' or question like '%えどの %じだい%';

-- 5) 本（ ）ペンなど: と is also right → を
update public.mock_questions set
  options = replace(options::text,'"と"','"を"')::jsonb
where question like '%本（　）ペンなど%' and options ? 'と' and (options->>correct) <> 'と';

-- 6) N5 listening: ask about 田中さん, not 男の人
update public.mock_questions set
  question = replace(question,'{男|おとこ}の{人|ひと}の へやは','{田中|たなか}さんの へやは')
where script like '%田中さんの へやは どんな%' and question like '%{男|おとこ}の{人|ひと}の へやは%';

-- 7) publish N5 সহজ মক টেস্ট ১ (hidden by mistake)
update public.mock_tests set published = true where title = 'N5 সহজ মক টেস্ট ১' and level = 'N5';

select 'LEFT サヤム:'||count(*) filter (where (passage||question||options::text||explanation||script) like '%サヤム%')
 ||' しりませんか:'||count(*) filter (where question like '%はじまるか%' and options ? 'しりませんか')
 ||' 4時に変:'||count(*) filter (where passage like '%3時から 4時に%')
 ||' えど:'||count(*) filter (where question like '%えど%')
 ||' ペンと:'||count(*) filter (where question like '%ペンなど%' and options ? 'と')
 ||' 男へや:'||count(*) filter (where question like '%{男|おとこ}の{人|ひと}の へや%')
||' pub:'||(select count(*) from public.mock_tests where title = 'N5 সহজ মক টেস্ট ১' and published)
from public.mock_questions;
