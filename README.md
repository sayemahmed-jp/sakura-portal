# সাকুরা পোর্টাল (Sakura Portal)

সাকুরা জাপানিজ ইনস্টিটিউটের ছাত্র, ফি, হাজিরা আর কাগজপত্রের হিসাব রাখার নিজস্ব পোর্টাল।
শুধু ডিরেক্টর আর অফিসের স্টাফরা লগইন করে ব্যবহার করবেন।

## কী কী করা যায়

| অংশ | কাজ |
|---|---|
| ড্যাশবোর্ড | চলমান ছাত্র, এ মাসের আয়, মোট বকেয়া, আজকের উপস্থিতি, ৮০%-এর নিচে উপস্থিতি |
| ছাত্র-ছাত্রী | ভর্তি, সম্পাদনা, খোঁজা, লেভেল/ব্যাচ/অবস্থা দিয়ে ফিল্টার |
| ফি ও হিসাব | টাকা জমা (রশিদ নম্বর নিজে থেকে), রশিদ প্রিন্ট (অফিস কপি + ছাত্র কপি), মাসের হিসাব, CSV |
| হাজিরা | তারিখ + লেভেল + ব্যাচ বেছে এক ক্লিকে হাজিরা, ঘণ্টার হিসাব নিজে থেকে |
| কাগজপত্র | প্রতিটি ছাত্রের ১২টি কাগজের চেকলিস্ট, স্ক্যান/PDF আপলোড |
| জাপান প্রসেস | কাগজ জোগাড় → স্কুল বাছাই → আবেদন → COE → ভিসা → জাপানে যাত্রা |
| সার্টিফিকেট | 日本語学習時間証明書 (স্টাডি-আওয়ার সার্টিফিকেট) — হাজিরা থেকে প্রকৃত ঘণ্টা |
| রিপোর্ট | ১২ মাসের আয়, বকেয়া তালিকা, হাজিরা, ছাত্র তালিকা (CSV), পুরো ব্যাকআপ (JSON) |

## ফাইলগুলো

- `index.html`, `style.css`, `app.js` — পোর্টাল
- `config.js` — Supabase-এর ঠিকানা আর key এখানে বসবে
- `supabase-schema.sql` — ডেটাবেসের টেবিল আর নিরাপত্তার নিয়ম

## ধাপ ০ — আগে ডেমো চালিয়ে দেখুন

`config.js` খালি থাকলে পোর্টাল ডেমো মোডে চলে, তথ্য শুধু ব্রাউজারে থাকে।
VS Code-এ ফোল্ডারটা খুলে **Live Server** দিয়ে `index.html` চালান →
"ডেমো মোডে ঢুকুন" → সেটিংস → "ডেমো তথ্য যোগ করুন"।

## ধাপ ১ — Supabase প্রজেক্ট খুলুন (ফ্রি)

1. https://supabase.com → Start your project → GitHub দিয়ে সাইন ইন।
2. **New project** → নাম `sakura-portal`, একটা শক্ত Database password (কোথাও লিখে রাখুন),
   Region: **Northeast Asia (Tokyo)** বা **Southeast Asia (Singapore)**।
3. প্রজেক্ট তৈরি হলে বাঁ দিকে **SQL Editor** → **New query** → `supabase-schema.sql`-এর পুরোটা পেস্ট → **Run**।
   "Success" দেখালে টেবিল আর নিরাপত্তার নিয়ম তৈরি।

## ধাপ ২ — নিজের লগইন বানান

1. **Authentication → Users → Add user → Create new user** →
   ইমেইল `sayemahmed8820@gmail.com`, একটা পাসওয়ার্ড, **Auto Confirm User** টিক দিন।
2. **SQL Editor**-এ চালান (নিজেকে অ্যাডমিন বানানো):

```sql
insert into public.profiles (id, name, role)
select id, 'Sayem Ahmed', 'admin' from auth.users where email = 'sayemahmed8820@gmail.com';
```

3. **Authentication → Sign In / Providers → Email** → **Allow new users to sign up** বন্ধ করুন।
   এতে বাইরের কেউ নিজে থেকে অ্যাকাউন্ট খুলতে পারবে না।

## ধাপ ৩ — পোর্টালকে Supabase-এর সাথে যুক্ত করুন

**Project Settings → API** থেকে **Project URL** আর **anon public** key কপি করে `config.js`-এ বসান:

```js
window.SAKURA_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi..."
};
```

> ⚠️ **service_role** key কখনো `config.js`-এ বা GitHub-এ দেবেন না। anon key পাবলিক হলেও সমস্যা নেই,
> কারণ ডেটা সুরক্ষিত থাকে ডেটাবেসের নিয়ম দিয়ে: লগইন করা স্টাফ ছাড়া কেউ কিছু দেখতে পারে না।

## ধাপ ৪ — অনলাইনে তুলুন (GitHub Pages)

1. GitHub-এ নতুন repository: `sakura-portal`।
2. এই ফোল্ডারের ফাইলগুলো push করুন:

```bash
cd ~/Documents/projects/sakura-portal
git init && git add . && git commit -m "Sakura portal"
git branch -M main
git remote add origin https://github.com/<আপনার-username>/sakura-portal.git
git push -u origin main
```

3. Repository → **Settings → Pages** → Branch: `main` / root → Save।
   কয়েক মিনিট পর লিংক পাবেন: `https://<username>.github.io/sakura-portal/`

## স্টাফ যোগ করা

1. **Authentication → Users → Add user** → স্টাফের ইমেইল + পাসওয়ার্ড (Auto Confirm টিক)।
2. SQL Editor-এ:

```sql
insert into public.profiles (id, name, role)
select id, 'স্টাফের নাম', 'staff' from auth.users where email = 'staff@example.com';
```

| কাজ | স্টাফ | অ্যাডমিন |
|---|---|---|
| ছাত্র ভর্তি ও তথ্য সম্পাদনা | ✓ | ✓ |
| টাকা জমা ও রশিদ প্রিন্ট | ✓ | ✓ |
| হাজিরা নেওয়া, কাগজ আপলোড | ✓ | ✓ |
| টাকার রেকর্ড বদলানো বা মোছা | — | ✓ |
| ছাত্র মোছা, সেটিংস বদলানো, পুরো ব্যাকআপ | — | ✓ |

কোনো স্টাফ চলে গেলে: **Authentication → Users** থেকে তার user মুছে দিন।

## প্রথমবার চালুর পর

- **সেটিংস**-এ অফিসের ঠিকানা বসান (রশিদ আর সার্টিফিকেটে যাবে)।
- মাসে একবার **রিপোর্ট → পুরো ব্যাকআপ** নামিয়ে ল্যাপটপে রাখুন।
- Supabase-এর ফ্রি প্ল্যানে টানা ৭ দিন কেউ ব্যবহার না করলে প্রজেক্ট ঘুমিয়ে যায়;
  ড্যাশবোর্ড থেকে **Restore** চাপলে আবার চালু হয়। রোজ ব্যবহার করলে এটা হবে না।
- ফ্রি প্ল্যানে ৫০০ MB ডেটা আর ১ GB ফাইল রাখা যায়; শুরুতে এটা যথেষ্ট।

## গোপনীয়তা

পোর্টালে ছাত্রদের NID, পাসপোর্ট আর ব্যাংকের কাগজ থাকবে। তাই:
শক্ত পাসওয়ার্ড ব্যবহার করুন, অফিসের কম্পিউটারে কাজ শেষে লগআউট করুন,
আর ছাত্র বা অভিভাবকের সম্মতি নিয়ে তবেই কাগজ আপলোড করুন।
