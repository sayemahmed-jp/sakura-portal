/* Sakura Japanese Institute · Student & accounts portal
   Plain JavaScript, no build step. Works in DEMO mode (browser storage)
   or with Supabase (see config.js and supabase-schema.sql). */
(() => {
'use strict';

// ------------------------------------------------------------------ config
const CFG = window.SAKURA_CONFIG || {};
const DEMO = !(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
// a password-reset link arrives as …#access_token=…&type=recovery; note it before supabase-js tidies the address
const RECOVERY = /type=recovery/.test(location.hash);
const sb = DEMO ? null : window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const BUCKET = 'documents';

const LEVELS = ['N5', 'N4', 'N3'];
const PACKAGES = ['N5', 'N4', 'N3', 'N5+N4', 'N5+N4+N3'];
const DEFAULT_SETTINGS = {
  institute_bn: 'সাকুরা জাপানিজ ইনস্টিটিউট',
  institute_en: 'Sakura Japanese Institute',
  institute_ja: 'さくら日本語学院',
  address: '',
  phone: '01711-005143',
  whatsapp: '+81 70-9222-2401',
  email: 'sayemahmed8820@gmail.com',
  director_en: 'SAYEM AHMED',
  director_ja: 'サエム・アハメド',
  hours_per_class: 2,
  alert_passport_months: 6,
  alert_fresh_days: 90,
  alert_deadline_days: 14,
  id_valid_months: 12,
  fees: { 'N5': 20000, 'N4': 20000, 'N3': 22000, 'N5+N4': 35000, 'N5+N4+N3': 45000 },
  textbooks: { 'N5': 'みんなの日本語 初級I', 'N4': 'みんなの日本語 初級II', 'N3': '中級教材' },
  wa_due: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name}-এর কোর্স ফি বাবদ {due} বকেয়া আছে{date}। অনুগ্রহ করে সময়মতো পরিশোধ করবেন। ধন্যবাদ। যোগাযোগ: {phone}',
  wa_absent: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name} {date} তারিখে ক্লাসে উপস্থিত ছিল না। এখন পর্যন্ত উপস্থিতি {pct}। জাপানে আবেদনের জন্য অন্তত ৮০% উপস্থিতি দরকার। ধন্যবাদ। যোগাযোগ: {phone}',
  wa_result: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name} "{exam}" পরীক্ষায় {marks} নম্বর পেয়েছে ({pct}, {result})। ধন্যবাদ। যোগাযোগ: {phone}',
  wa_doc: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name}-এর {doc}: {issue}। জাপানের আবেদনের জন্য যত দ্রুত সম্ভব অফিসে যোগাযোগ করবেন। ধন্যবাদ। যোগাযোগ: {phone}',
  wa_parent: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name}-এর হাজিরা, ফি, পরীক্ষার রেজাল্ট আর জাপানের আবেদনের অবস্থা এই লিংকে যেকোনো সময় দেখতে পারবেন: {link} — লিংকটি শুধু আপনার জন্য, কাউকে দেবেন না। যোগাযোগ: {phone}',
  wa_japan: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name}-এর জাপানের আবেদনের খবর: {school} ({intake} সেশন) — {status}। কিছু জানার থাকলে যোগাযোগ করবেন: {phone}',
  wa_lead: 'আসসালামু আলাইকুম {name}, {institute} থেকে বলছি। জাপানি ভাষা কোর্স (N5–N3) ও জাপানে পড়াশোনা নিয়ে আগ্রহ দেখানোর জন্য ধন্যবাদ। প্রথম ৩টি ক্লাস ফ্রি, আর সব বই কোর্স ফি-র মধ্যেই। কবে একবার অফিসে আসতে পারবেন জানাবেন? যোগাযোগ: {phone}'
};
const BATCH = { morning: 'সকাল ১০–১২টা', evening: 'সন্ধ্যা ৬–৮টা' };
const STATUS = { trial: 'ট্রায়াল', active: 'চলমান', completed: 'কোর্স শেষ', dropped: 'বাদ দিয়েছে', japan: 'জাপানে' };
const METHOD = { cash: 'ক্যাশ', bkash: 'বিকাশ', nagad: 'নগদ', bank: 'ব্যাংক' };
const PURPOSE = { course_fee: 'কোর্স ফি', installment: 'কিস্তি', admission: 'ভর্তি ফি', processing: 'জাপান প্রসেসিং ফি', other: 'অন্যান্য' };
const ATT = { present: 'উপস্থিত', late: 'দেরি', leave: 'ছুটি', absent: 'অনুপস্থিত' };
const DOC_TYPES = [
  ['photo', 'পাসপোর্ট সাইজ ছবি'], ['passport', 'পাসপোর্ট'], ['nid', 'NID / জন্ম নিবন্ধন'],
  ['ssc', 'SSC সনদ ও মার্কশিট'], ['hsc', 'HSC সনদ ও মার্কশিট'], ['degree', 'স্নাতক / ডিপ্লোমা সনদ'],
  ['jlpt', 'JLPT / NAT সনদ'], ['study_hours', 'স্টাডি-আওয়ার সার্টিফিকেট'], ['sponsor', 'স্পনসরের আয়ের প্রমাণ'],
  ['bank', 'ব্যাংক স্টেটমেন্ট / সলভেন্সি'], ['relation', 'স্পনসরের সাথে সম্পর্কের প্রমাণ'], ['other', 'অন্যান্য']
];
const EXP_CAT = { rent: 'ঘর ভাড়া', salary: 'বেতন (শিক্ষক/স্টাফ)', utilities: 'বিদ্যুৎ, পানি, গ্যাস', internet: 'ইন্টারনেট ও ফোন', books: 'বই ও উপকরণ', marketing: 'বিজ্ঞাপন ও প্রচার', office: 'অফিস সামগ্রী ও আসবাব', japan: 'জাপান প্রসেসিং খরচ', other: 'অন্যান্য' };
const LEAD_SRC = { facebook: 'ফেসবুক', walkin: 'সরাসরি অফিসে', phone: 'ফোন কল', whatsapp: 'WhatsApp', referral: 'পরিচিতের মাধ্যমে', website: 'ওয়েবসাইট', other: 'অন্যান্য' };
const LEAD_ST = { new: 'নতুন', contacted: 'কথা হয়েছে', trial: 'ট্রায়াল ক্লাসে', joined: 'ভর্তি হয়েছে', lost: 'আগ্রহ নেই' };
const LEAD_ST_CLS = { new: 'trial', contacted: 'completed', trial: 'trial', joined: 'active', lost: 'dropped' };
const LEAD_INT = { N5: 'N5 কোর্স', N4: 'N4 কোর্স', N3: 'N3 কোর্স', japan: 'শুধু জাপান প্রসেসিং', other: 'অন্যান্য' };
const EXAM_TYPE = { quiz: 'সাপ্তাহিক কুইজ', test: 'টেস্ট', mock: 'মক টেস্ট', jlpt: 'JLPT (আসল)', nat: 'NAT-TEST (আসল)', speaking: 'কথা বলা / ইন্টারভিউ', other: 'অন্যান্য' };
const DOC_STATUS = { missing: 'জমা হয়নি', received: 'জমা হয়েছে', verified: 'যাচাই হয়েছে' };
const JSTAGES = [
  ['none', 'শুরু হয়নি'], ['docs', 'কাগজ জোগাড়'], ['school', 'স্কুল বাছাই'], ['applied', 'আবেদন জমা'],
  ['coe', 'COE পেয়েছে'], ['visa', 'ভিসা পেয়েছে'], ['departed', 'জাপানে গেছে']
];
const APP_ST = { preparing: 'কাগজ তৈরি হচ্ছে', submitted: 'স্কুলে আবেদন জমা', interview: 'ইন্টারভিউ', accepted: 'স্কুল নিয়েছে', coe_applied: 'COE-র আবেদন হয়েছে', coe_granted: 'COE পেয়েছে', visa: 'ভিসা পেয়েছে', departed: 'জাপানে গেছে', rejected: 'স্কুল নেয়নি', coe_denied: 'COE পায়নি', withdrawn: 'বাদ দিয়েছে' };
const APP_FLOW = ['preparing', 'submitted', 'interview', 'accepted', 'coe_applied', 'coe_granted', 'visa', 'departed'];
const APP_CLOSED = ['rejected', 'coe_denied', 'withdrawn'];
const APP_CLS = { preparing: 'trial', submitted: 'completed', interview: 'completed', accepted: 'completed', coe_applied: 'completed', coe_granted: 'active', visa: 'active', departed: 'japan', rejected: 'dropped', coe_denied: 'due', withdrawn: 'dropped' };
const APP_STAGE = { preparing: 'school', submitted: 'applied', interview: 'applied', accepted: 'applied', coe_applied: 'applied', coe_granted: 'coe', visa: 'visa', departed: 'departed' };
const SCHOOL_FEE = { none: 'দেওয়া হয়নি', partial: 'আংশিক দেওয়া', paid: 'পুরো দেওয়া' };
const MONTH_BN = { '01': 'জানুয়ারি', '04': 'এপ্রিল', '07': 'জুলাই', '10': 'অক্টোবর' };
const KOBE_SCHOOLS = [["春日日本語学院", "神戸市中央区", "神戸市中央区宮本通5-7-10", 171, 788000, "http://www.kasuga-kobe.jp/", "バングラデシュ人学生が在籍"], ["ECC日本語学院 神戸校", "神戸市中央区", "神戸市中央区琴ノ緒町5-5-6 ECC三宮ビル", 100, 908000, "https://www.ecc-nihongo.com/", "バングラデシュ人学生が在籍・三宮駅前"], ["神戸東洋日本語学院", "神戸市中央区", "神戸市中央区北長狭通4-5-7", 520, 825000, "https://jp-college.com/", "定員520名の大規模校"], ["KIJ語学院", "神戸市兵庫区", "神戸市兵庫区浜崎通3-7 兵庫駅南ビル", 510, 862640, "https://www.kij123.com/", "定員510名の大規模校"], ["富藤外国語学院", "神戸市中央区", "神戸市中央区北長狭通4-4-18 富士信ビル8F", 280, 918000, "https://www.tomifuji.ac.jp/", "南アジア(スリランカ)の実績"], ["京進ランゲージアカデミー神戸校", "神戸市灘区", "神戸市灘区将軍通4-1-3", 210, 720000, "https://www.kla.ac/jp/school/kobe/", "学費が比較的安い・南アジア実績"], ["神戸住吉国際日本語学校", "神戸市東灘区", "神戸市東灘区住吉宮町2-21-8", 120, 750000, "http://www.s-i-s-kobe.com", "ネパール・パキスタン等南アジア実績"], ["神戸外語教育学院", "神戸市長田区", "神戸市長田区六番町5-6-1", 364, null, "http://www.kobe-gaigo.jp.net/", "大規模校"], ["国際語学学院", "神戸市長田区", "神戸市長田区3番町5-5", 348, null, "http://www5d.biglobe.ne.jp/~ila/", "大規模校"], ["東京国際ビジネスカレッジ神戸校", "神戸市東灘区", "神戸市東灘区向洋町中9-1-6", null, null, "https://tibc-kobe.jp/", ""], ["神戸YMCA学院専門学校 日本語学科", "神戸市中央区", "神戸市中央区加納町2-7-11", 240, null, "https://www.kobeymca.ac.jp/vocational_school", "専門学校の日本語学科"], ["神戸電子専門学校 日本語学科", "神戸市中央区", "神戸市中央区北野町1-1-8", 200, null, "https://www.kobedenshi.ac.jp/whatsnew/course/overseas-students/japanese-lang", "IT系専門学校へ進学しやすい"], ["ヒューマンアカデミー日本語学校 神戸校", "神戸市中央区", "三宮駅から徒歩3分", null, null, "https://hajl.athuman.com/", "新設校は新しい送り出し機関を探していることが多い"], ["秀明神戸国際学院", "神戸市灘区", "神戸市灘区水道筋5-1-8 夷谷ビル", 158, null, "https://www3.hp-ez.com/hp/shumei-kobe/", ""], ["アジア学院", "神戸市兵庫区", "神戸市兵庫区入江通3-1-14", 160, null, "http://www.ari-edu.org/", ""], ["アリスト外語学院", "神戸市兵庫区", "神戸市兵庫区三川口町3-5-24", 160, null, "http://www.arist-f.com/", ""], ["コミュニカ学院", "神戸市中央区", "神戸市中央区東町116-2", 152, 915000, "http://www.communica-institute.org/", "欧米の学生が中心"], ["スバル外語学院", "神戸市長田区", "神戸市長田区六番町1-6-16", 140, null, "https://subarugaigo.jimdofree.com/", ""], ["日本語学院みらい", "神戸市中央区", "神戸市中央区三宮町2-11-1 センタープラザ西館7F", 100, null, "http://jli-mirai.com/", ""], ["神楽日本語学園", "神戸市長田区", "神戸市長田区神楽町2-3-1", null, null, "https://kagura-kobe.jp/", ""], ["神戸新長田日本語学院", "神戸市長田区", "神戸市長田区腕塚町9-7-13", null, null, "https://ksn-japanese.jp/", ""], ["神戸国際大学 経済学部国際別科", "神戸市中央区", "神戸市中央区磯辺通4-1-6", 80, null, "https://www.kobe-kiu.ac.jp/", "大学の別科"], ["阪神自動車航空鉄道専門学校 日本語別科", "神戸市長田区", "神戸市長田区林山町27-1", 80, null, "https://www.hits.ac.jp/", "専門学校の別科"], ["専門学校テクニカルカレッジ神戸 日本語学科", "神戸市中央区", "神戸市中央区琴ノ緒町5-7-1", null, null, "", ""], ["神戸国際語言学院(西宮市)", "西宮市", "西宮市本町6-21", null, null, "https://www.kobe-kg.jp/", "神戸の隣・バングラデシュ人の実績"]]; // [name, city, address, capacity, tuition ¥/yr, website, note] — from the Kobe schools sheet

// ------------------------------------------------------------------ state
const S = {
  user: null, profile: null, settings: { ...DEFAULT_SETTINGS },
  students: [], payments: [], sessions: [], attendance: [], documents: [], profiles: [],
  loaded: false
};
const isAdmin = () => S.profile && (S.profile.role === 'admin' || S.profile.role === 'deputy');   // director or deputy: all of the institute's data
const isDirector = () => S.profile && S.profile.role === 'admin';   // only the director manages people and their ID cards
// pages only the director (admin) may open — the database enforces the same rules (migration v13)
const isTeacher = () => S.profile && (S.profile.role === 'teacher' || S.profile.role === 'head_teacher');   // the head teacher works like a teacher, with a little more
const isHeadTeacher = () => S.profile && S.profile.role === 'head_teacher';
const ROLE_NAME = { admin: 'পরিচালক', deputy: 'উপ-পরিচালক', staff: 'অফিস স্টাফ', head_teacher: 'প্রধান শিক্ষক', teacher: 'শিক্ষক' };
// teachers see class work only — the database (migration v16) gives them nothing else
const TEACHER_ROUTES = ['', 'scan', 'students', 'student', 'attendance', 'calendar', 'exams', 'exam', 'tnotes', 'materials', 'mocks', 'mock', 'notices', 'homework', 'questions'];
const HEAD_TEACHER_ROUTES = TEACHER_ROUTES.concat(['feedback']);   // the head teacher also reads the students' class feedback
const teacherRoutes = () => isHeadTeacher() ? HEAD_TEACHER_ROUTES : TEACHER_ROUTES;
const TEACHER_ONLY_MSG = '<div class="empty">🔒 এই অংশটি অফিস আর পরিচালকের জন্য।</div>';
const ADMIN_ROUTES = ['people', 'weekly', 'expenses', 'teachers', 'teacher', 'audit', 'settings'];
const ADMIN_ONLY_MSG = '<div class="empty">🔒 এই অংশটি শুধু পরিচালক দেখতে পারেন।</div>';

// ------------------------------------------------------------------ helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// furigana written as {漢字|かんじ} shows as small reading above the kanji
const fx = (s) => esc(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const tk = (n) => '৳ ' + Math.round(num(n)).toLocaleString('en-IN');
const pad = (n, w) => String(n).padStart(w, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`; };
const monthISO = (d = todayISO()) => d.slice(0, 7);
const fmtD = (iso) => iso ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : '—';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + Math.random().toString(16).slice(2));
const byId = (arr, id) => arr.find(x => x.id === id);
const studentName = (s) => s ? (s.name_bn || s.name_en || s.admission_no) : '—';
const initials = (s) => (s.name_en || s.name_bn || '?').trim().slice(0, 1).toUpperCase();

function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = ''; }, 3200);
}
function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/duplicate key|unique/i.test(m)) return 'একই নম্বর আগে থেকেই আছে। আবার চেষ্টা করুন।';
  if (/row-level security|permission/i.test(m)) return 'এই কাজের অনুমতি আপনার নেই।';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'ইন্টারনেট সংযোগ নেই।';
  return m;
}
function openModal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; const f = $('#modal-body input, #modal-body select'); if (f) f.focus(); }
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
function confirmBox(text, okLabel = 'হ্যাঁ, মুছে দিন') {
  return new Promise(res => {
    openModal(`<h2>নিশ্চিত?</h2><p>${esc(text)}</p><div class="row" style="justify-content:flex-end;margin-top:16px">
      <button class="btn ghost" data-a="no">না</button><button class="btn red" data-a="yes">${esc(okLabel)}</button></div>`);
    $('#modal-body').onclick = (e) => { const a = e.target.dataset.a; if (!a) return; $('#modal-body').onclick = null; closeModal(); res(a === 'yes'); };
  });
}
function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'number') o[el.name] = el.value === '' ? null : num(el.value);
    else if (el.type === 'date') o[el.name] = el.value || null;
    else o[el.name] = el.value.trim();
  }
  return o;
}
const csvText = (rows) => '﻿' + rows.map(r => r.map(c => {
  const s = typeof c === 'object' && c !== null ? JSON.stringify(c) : String(c ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}).join(',')).join('\r\n');
function csvDownload(name, rows) {
  const csv = csvText(rows);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function words(n) { // English amount in words, Indian grouping
  n = Math.round(num(n)); if (n === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
  const three = (x) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const parts = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (n) parts.push(three(n));
  return parts.join(' ');
}
const KAMON = `<svg width="78%" height="78%" viewBox="-25 -25 50 50" aria-hidden="true"><circle r="23.4" fill="none" stroke="#26231E" stroke-width="2.2"/><circle r="20.6" fill="none" stroke="#26231E" stroke-width=".8"/><g fill="#26231E">${[0, 72, 144, 216, 288].map(r => `<path transform="rotate(${r})" d="M0 -3.4 C-7.4 -8 -8.6 -15.4 -4.6 -19.4 L0 -16.2 L4.6 -19.4 C8.6 -15.4 7.4 -8 0 -3.4Z"/>`).join('')}</g><circle r="2.6" fill="#FBF8F1"/></svg>`;

// ------------------------------------------------------------------ data layer
const TABLES = ['students', 'payments', 'sessions', 'attendance', 'documents', 'expenses', 'inquiries', 'exams', 'exam_results', 'jp_schools', 'applications', 'teachers', 'commissions', 'holidays', 'materials', 'mock_tests', 'mock_questions', 'mock_attempts', 'staff_invites', 'notices', 'homework', 'homework_submissions', 'student_questions', 'class_plans', 'video_views', 'doc_requests', 'pay_proofs', 'class_feedback', 'staff_cards'];
const OPTIONAL_TABLES = ['staff_cards', 'class_feedback', 'pay_proofs', 'doc_requests', 'video_views', 'class_plans', 'student_questions', 'homework', 'homework_submissions', 'notices', 'staff_invites', 'materials', 'mock_tests', 'mock_questions', 'mock_attempts', 'expenses', 'inquiries', 'exams', 'exam_results', 'jp_schools', 'applications', 'teachers', 'commissions', 'holidays'];
const Local = {
  key: (t) => 'sakura_demo_' + t,
  read(t) { try { return JSON.parse(localStorage.getItem(this.key(t)) || '[]'); } catch { return []; } },
  write(t, rows) { try { localStorage.setItem(this.key(t), JSON.stringify(rows)); } catch { toast('ব্রাউজারে জায়গা শেষ — ডেমো ফাইল ছোট রাখুন', true); } },
  async fetchAll(t) { return this.read(t); },
  unique: { holidays: [['on_date', 'batch']], applications: [['student_id', 'school_id', 'intake']], exam_results: [['exam_id', 'student_id']], students: [['admission_no']], payments: [['receipt_no']], sessions: [['class_date', 'level', 'batch']], attendance: [['session_id', 'student_id']], documents: [['student_id', 'doc_type']] },
  check(t, rows, row) {
    for (const cols of this.unique[t] || []) if (rows.some(r => r.id !== row.id && cols.every(c => r[c] === row[c]))) throw new Error('duplicate key');
  },
  log(action, t, o, n) {
    if (['attendance', 'exam_results'].includes(t) && action === 'insert') return;
    let od = o, nd = n;
    if (action === 'update') { od = {}; nd = {}; for (const k of Object.keys(n)) if (k !== 'updated_at' && JSON.stringify(o[k]) !== JSON.stringify(n[k])) { od[k] = o[k] ?? null; nd[k] = n[k]; } if (!Object.keys(nd).length) return; }
    const x = n || o; const all = this.read('audit_log');
    all.push({ id: all.length + 1, at: new Date().toISOString(), user_id: 'demo', user_name: 'ডেমো অ্যাডমিন', action, table_name: t, row_id: x.id, student_id: x.student_id || (t === 'students' ? x.id : null), old_data: action === 'insert' ? null : od, new_data: action === 'delete' ? null : nd });
    this.write('audit_log', all.slice(-2000));
  },
  async auditList({ from, to, t, a, u, student, limit = 300 }) {
    const lo = new Date(from + 'T00:00:00').toISOString(), hi = new Date(to + 'T23:59:59.999').toISOString();
    const rows = this.read('audit_log').filter(e => e.at >= lo && e.at <= hi && (!student || e.student_id === student) && (!a || e.action === a) && (!u || e.user_name === u) && (!t || (t === 'money' ? MONEY_TABLES.includes(e.table_name) && e.action !== 'insert' : e.table_name === t))).sort((x, y) => y.at.localeCompare(x.at));
    return { rows: rows.slice(0, limit), more: rows.length > limit };
  },
  async insertMany(t, rows) { const out = []; for (const r of rows) out.push(await this.insert(t, r)); return out; },
  async insert(t, row) { const rows = this.read(t); const r = { id: uuid(), created_at: new Date().toISOString(), ...row }; this.check(t, rows, r); rows.push(r); this.write(t, rows); this.log('insert', t, null, r); return r; },
  async update(t, id, patch) { const rows = this.read(t); const i = rows.findIndex(r => r.id === id); if (i < 0) throw new Error('not found'); const old = rows[i]; const r = { ...rows[i], ...patch }; this.check(t, rows, r); rows[i] = r; this.write(t, rows); this.log('update', t, old, r); return r; },
  async remove(t, id) {
    const gone = this.read(t).find(r => r.id === id); if (gone) this.log('delete', t, gone, null);
    let rows = this.read(t).filter(r => r.id !== id); this.write(t, rows);
    if (t === 'students') for (const c of ['attendance', 'documents']) this.write(c, this.read(c).filter(r => r.student_id !== id));
    if (t === 'sessions') this.write('attendance', this.read('attendance').filter(r => r.session_id !== id));
    if (t === 'exams') this.write('exam_results', this.read('exam_results').filter(r => r.exam_id !== id));
    if (t === 'students') for (const c of ['exam_results', 'applications']) this.write(c, this.read(c).filter(r => r.student_id !== id));
  },
  async upsertResults(rows) {
    const all = this.read('exam_results');
    for (const r of rows) { const i = all.findIndex(x => x.exam_id === r.exam_id && x.student_id === r.student_id); if (i >= 0) { this.log('update', 'exam_results', all[i], { ...all[i], ...r }); all[i] = { ...all[i], ...r }; } else all.push({ id: uuid(), ...r }); }
    this.write('exam_results', all); return all.filter(a => rows.some(r => r.exam_id === a.exam_id && r.student_id === a.student_id));
  },
  async upsertAttendance(rows) {
    const all = this.read('attendance');
    for (const r of rows) { const i = all.findIndex(x => x.session_id === r.session_id && x.student_id === r.student_id); if (i >= 0) { this.log('update', 'attendance', all[i], { ...all[i], status: r.status }); all[i] = { ...all[i], status: r.status }; } else all.push({ id: uuid(), ...r }); }
    this.write('attendance', all); return all.filter(a => rows.some(r => r.session_id === a.session_id && r.student_id === a.student_id));
  },
  async upload(path, file) {
    if (file.size > 1.5e6) throw new Error('ডেমো মোডে ১.৫ MB-এর বড় ফাইল রাখা যায় না');
    const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
    const files = JSON.parse(localStorage.getItem('sakura_demo_files') || '{}'); files[path] = data;
    localStorage.setItem('sakura_demo_files', JSON.stringify(files)); return path;
  },
  async fileUrl(path) { const files = JSON.parse(localStorage.getItem('sakura_demo_files') || '{}'); return files[path] || ''; },
  async uploadTo(bucket, path, file) { return this.upload(path, file); },
  async fileUrlFrom(bucket, path) { return this.fileUrl(path); },
  async removeFile(bucket, path) { const files = JSON.parse(localStorage.getItem('sakura_demo_files') || '{}'); delete files[path]; localStorage.setItem('sakura_demo_files', JSON.stringify(files)); },
  async getSettings() { try { return JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); } catch { return {}; } },
  async saveSettings(data) { localStorage.setItem('sakura_demo_settings', JSON.stringify(data)); },
  async profiles() { return [{ id: 'demo', name: 'ডেমো অ্যাডমিন', role: 'admin' }]; }
};
const Remote = {
  async fetchAll(t) {
    const out = []; const size = 1000;
    for (let from = 0; ; from += size) {
      const { data, error } = await sb.from(t).select('*').range(from, from + size - 1);
      if (error) throw error; out.push(...data); if (data.length < size) break;
    }
    return out;
  },
  async insert(t, row) { const { data, error } = await sb.from(t).insert(row).select().single(); if (error) throw error; return data; },
  async insertMany(t, rows) { const out = []; for (let i = 0; i < rows.length; i += 200) { const { data, error } = await sb.from(t).insert(rows.slice(i, i + 200)).select(); if (error) throw error; out.push(...data); } return out; },
  async update(t, id, patch) { const { data, error } = await sb.from(t).update(patch).eq('id', id).select().single(); if (error) throw error; return data; },
  async remove(t, id) { const { data, error } = await sb.from(t).delete().eq('id', id).select('id'); if (error) throw error; if (!data || !data.length) throw new Error('মোছা যায়নি — এটা মোছার অনুমতি আপনার নেই, অথবা এতে ছাত্রদের নম্বর/চেষ্টা আছে (তখন শুধু পরিচালক মুছতে পারেন)।'); },
  async upsertResults(rows) { const { data, error } = await sb.from('exam_results').upsert(rows, { onConflict: 'exam_id,student_id' }).select(); if (error) throw error; return data; },
  async upsertAttendance(rows) { const { data, error } = await sb.from('attendance').upsert(rows, { onConflict: 'session_id,student_id' }).select(); if (error) throw error; return data; },
  async upload(path, file) { const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined }); if (error) throw error; return path; },
  async fileUrl(path) { const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; },
  async uploadTo(bucket, path, file) { const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined }); if (error) throw error; return path; },
  async fileUrlFrom(bucket, path) { const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; },
  async removeFile(bucket, path) { const { error } = await sb.storage.from(bucket).remove([path]); if (error) throw error; },
  async getSettings() { const { data, error } = await sb.from('settings').select('data').eq('id', 1).maybeSingle(); if (error) throw error; return (data && data.data) || {}; },
  async saveSettings(d) { const { error } = await sb.from('settings').update({ data: d, updated_at: new Date().toISOString() }).eq('id', 1); if (error) throw error; },
  async auditList({ from, to, t, a, u, student, limit = 300 }) {
    let qy = sb.from('audit_log').select('*').gte('at', new Date(from + 'T00:00:00').toISOString()).lte('at', new Date(to + 'T23:59:59.999').toISOString()).order('at', { ascending: false }).limit(limit + 1);
    if (student) qy = qy.eq('student_id', student);
    if (a) qy = qy.eq('action', a);
    if (u) qy = qy.eq('user_name', u);
    if (t === 'money') qy = qy.in('table_name', MONEY_TABLES).neq('action', 'insert'); else if (t) qy = qy.eq('table_name', t);
    const { data, error } = await qy; if (error) throw error; return { rows: data.slice(0, limit), more: data.length > limit };
  },
  async profiles() { const { data, error } = await sb.from('profiles').select('*').order('created_at'); if (error) throw error; return data; }
};
const API = DEMO ? Local : Remote;

const staffSkip = (t) => (!isAdmin() && ['expenses', 'commissions', 'staff_invites'].includes(t)) || (isTeacher() && ['payments', 'documents', 'inquiries', 'jp_schools', 'applications'].includes(t));
// ---- keep every open screen up to date: coming back to the portal (or every few minutes) reloads the data,
// so a change made on another phone or by another staff member shows without pressing refresh
let _loadedAt = Date.now();
async function softRefresh() {
  if (DEMO || document.hidden || !S.profile || Date.now() - _loadedAt < 60000) return;
  if (!$('#modal').hidden || /\/(new|edit)\b/.test(location.hash) || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
  const y = scrollY; _loadedAt = Date.now();
  try { await loadAll(); render(); requestAnimationFrame(() => scrollTo(0, y)); } catch (e) { console.warn(e); }
}
document.addEventListener('visibilitychange', softRefresh); addEventListener('focus', softRefresh); setInterval(softRefresh, 180000);
async function loadAll() {
  _loadedAt = Date.now();
  const [settings, profiles, ...rest] = await Promise.all([API.getSettings(), API.profiles(), ...TABLES.map(t => staffSkip(t) ? Promise.resolve([]) : API.fetchAll(DEMO ? t : t === 'teachers' && !isAdmin() ? 'teacher_list' : t === 'students' && isTeacher() ? 'student_roster' : t).catch(e => { if (OPTIONAL_TABLES.includes(t)) { console.warn('Table not ready: ' + t, e); return []; } throw e; }))]);
  S.settings = { ...DEFAULT_SETTINGS, ...settings, fees: { ...DEFAULT_SETTINGS.fees, ...(settings.fees || {}) }, textbooks: { ...DEFAULT_SETTINGS.textbooks, ...(settings.textbooks || {}) } };
  for (const k of ['wa_due', 'wa_absent', 'wa_lead', 'wa_result', 'wa_japan', 'wa_doc', 'wa_parent']) if (!S.settings[k]) S.settings[k] = DEFAULT_SETTINGS[k];
  S.profiles = profiles;
  TABLES.forEach((t, i) => { S[t] = rest[i]; });
  S.loaded = true;
}
function putLocal(t, row) { const i = S[t].findIndex(r => r.id === row.id); if (i >= 0) S[t][i] = row; else S[t].push(row); }

// ------------------------------------------------------------------ derived numbers
const sessionMap = () => new Map(S.sessions.map(s => [s.id, s]));
function paidOf(sid) { return S.payments.filter(p => p.student_id === sid && p.purpose !== 'processing').reduce((a, p) => a + num(p.amount), 0); } // course fees only
function procPaidOf(sid) { return S.payments.filter(p => p.student_id === sid && p.purpose === 'processing').reduce((a, p) => a + num(p.amount), 0); }
function procDueOf(st) { return Math.max(0, num(st.processing_fee) - procPaidOf(st.id)); }
function commIncome(m) { return (S.commissions || []).filter(c => c.status === 'received' && (c.received_on || '').startsWith(m)).reduce((a, c) => a + num(c.amount_bdt), 0); }
function incomeOf(m) { return monthSum(S.payments, 'paid_on', m) + commIncome(m); }
function netFee(st) { return Math.max(0, num(st.total_fee) - num(st.discount)); }
function dueOf(st) { return Math.max(0, netFee(st) - paidOf(st.id)); }
function attOf(sid, smap = sessionMap()) {
  const recs = S.attendance.filter(a => a.student_id === sid && smap.has(a.session_id));
  let hours = 0, came = 0; const byLevel = {}; let first = null, last = null;
  for (const r of recs) {
    const s = smap.get(r.session_id);
    if (r.status === 'present' || r.status === 'late') {
      came++; hours += num(s.hours); byLevel[s.level] = (byLevel[s.level] || 0) + num(s.hours);
      if (!first || s.class_date < first) first = s.class_date; if (!last || s.class_date > last) last = s.class_date;
    }
  }
  return { total: recs.length, came, hours, pct: recs.length ? Math.round(came * 100 / recs.length) : null, byLevel, first, last };
}
function nextAdmissionNo() {
  const max = S.students.reduce((m, s) => Math.max(m, num((s.admission_no || '').replace(/\D/g, ''))), 0);
  return 'SJI-' + pad(max + 1, 4);
}
function nextReceiptNo() {
  const max = S.payments.reduce((m, p) => Math.max(m, num((p.receipt_no || '').replace(/\D/g, ''))), 0);
  return 'SJI-R-' + pad(max + 1, 5);
}
function waNum(ph) {
  let d = String(ph || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('01')) d = '88' + d;
  else if (d.length === 10 && d.startsWith('1')) d = '880' + d;
  else if (d.length === 11 && /^0[789]0/.test(d)) d = '81' + d.slice(1);
  return d.length >= 10 ? d : '';
}
const fillTpl = (t, vars) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
const tplBase = () => ({ institute: S.settings.institute_bn, phone: S.settings.phone });
const WA_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 13.9c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .3-3.4-.7-2.9-1.2-4.7-4.1-4.8-4.3-.1-.2-1.2-1.5-1.2-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.4z"/></svg>';
function waBtn(ph, text, label = 'WhatsApp') {
  const n = waNum(ph); if (!n) return '';
  return `<a class="btn sm wa" href="https://wa.me/${n}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener" data-stop title="WhatsApp-এ মেসেজ পাঠান">${WA_SVG}${label ? ' ' + esc(label) : ''}</a>`;
}
const guardianPhone = (s) => s.guardian_phone || s.phone;
function dueMsg(s) { return fillTpl(S.settings.wa_due, { ...tplBase(), name: s.name_bn || s.name_en, due: tk(dueOf(s)), date: s.next_due_date ? ` (পরিশোধের তারিখ ${fmtD(s.next_due_date)})` : '' }); }
function absentMsg(s, date, a) { return fillTpl(S.settings.wa_absent, { ...tplBase(), name: s.name_bn || s.name_en, date: fmtD(date), pct: a && a.pct != null ? a.pct + '%' : '—' }); }
function leadMsg(l) { return fillTpl(S.settings.wa_lead, { ...tplBase(), name: l.name || '' }); }
const passMark = (ex) => ex.pass_marks != null && ex.pass_marks !== '' ? num(ex.pass_marks) : Math.ceil(num(ex.max_marks) * 0.6);
const pctOf = (r, ex) => (r && !r.absent && r.marks != null && num(ex.max_marks)) ? Math.round(num(r.marks) * 100 / num(ex.max_marks)) : null;
const passed = (r, ex) => r && !r.absent && r.marks != null && num(r.marks) >= passMark(ex);
function resultMsg(s, ex, r) { const p = pctOf(r, ex); return fillTpl(S.settings.wa_result, { ...tplBase(), name: s.name_bn || s.name_en, exam: ex.title, marks: r.absent ? 'অনুপস্থিত' : `${num(r.marks)}/${num(ex.max_marks)}`, pct: p == null ? '—' : p + '%', result: r.absent ? 'পরীক্ষা দেয়নি' : passed(r, ex) ? 'পাস' : 'পাস করেনি' }); }
function studentResults(sid) { const em = new Map(S.exams.map(e => [e.id, e])); return S.exam_results.filter(r => r.student_id === sid && em.has(r.exam_id)).map(r => ({ r, ex: em.get(r.exam_id) })).sort((a, b) => (a.ex.exam_date || '').localeCompare(b.ex.exam_date || '')); }
function monthSum(arr, field, m, amt = 'amount') { return arr.filter(x => (x[field] || '').startsWith(m)).reduce((a, x) => a + num(x[amt]), 0); }
const badge = (cls, label) => `<span class="b ${esc(cls)}">${esc(label)}</span>`;
const bar = (pct) => pct == null ? '<span class="muted small">—</span>' : `<div class="row" style="gap:6px;flex-wrap:nowrap"><div class="bar ${pct < 80 ? 'low' : ''}"><i style="width:${pct}%"></i></div><span class="small">${pct}%</span></div>`;


// ------------------------------------------------------------------ passwords: forgot, reset link, change
function renderForgot(note = '') {
  $('#app').innerHTML = `<div class="login auth-in"><form class="card" id="fgf">
    <div class="kamon" style="width:56px;height:56px">${KAMON}</div>
    <h1 class="ahead">Reset <em>password</em></h1><p class="muted" style="margin:0 0 14px">আপনার ইমেইল লিখুন। নতুন পাসওয়ার্ড দেওয়ার একটা লিংক ইমেইলে যাবে।</p>
    <label class="f">ইমেইল<span class="glow"><input name="email" type="email" required autocomplete="username" placeholder="you@example.com"></span></label>
    <button class="btn abtn" type="submit">লিংক পাঠান</button>
    <p class="small" id="fgm" style="margin:12px 0 0;line-height:1.6">${esc(note)}</p>
    <p class="small" style="margin:12px 0 0"><a href="#" id="fgback">← লগইনে ফিরে যান</a></p></form></div>`;
  $('#fgback').onclick = (e) => { e.preventDefault(); renderLogin(); };
  $('#fgf').onsubmit = async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button'); const m = $('#fgm'); btn.disabled = true;
    const { error } = await sb.auth.resetPasswordForEmail(e.target.email.value.trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
    btn.disabled = false;
    if (error) { m.style.color = 'var(--red)'; m.textContent = /rate|seconds/i.test(error.message) ? 'একটু আগেই লিংক পাঠানো হয়েছে — এক মিনিট পরে আবার চেষ্টা করুন।' : errMsg(error); return; }
    m.style.color = 'var(--green)'; m.textContent = 'লিংক পাঠানো হয়েছে। ইমেইল খুলে (Spam ফোল্ডারও দেখুন) লিংকে চাপুন, তারপর নতুন পাসওয়ার্ড দিন। কয়েক মিনিটেও না এলে পরিচালককে জানান।';
  };
}
function renderNewPassword(user) {
  $('#app').innerHTML = `<div class="login"><form class="card" id="npf">
    <div class="kamon" style="width:56px;height:56px">${KAMON}</div>
    <h1>নতুন পাসওয়ার্ড দিন</h1><p class="muted" style="margin:0 0 14px">${esc(user && user.email || '')}</p>
    <label class="f">নতুন পাসওয়ার্ড (অন্তত ৮ অক্ষর)<input name="p1" type="password" minlength="8" required autocomplete="new-password"></label>
    <label class="f" style="margin-top:10px">আবার লিখুন<input name="p2" type="password" minlength="8" required autocomplete="new-password"></label>
    <button class="btn" type="submit" style="width:100%;justify-content:center;margin-top:16px">পাসওয়ার্ড সংরক্ষণ</button>
    <p class="small" id="npm" style="color:var(--red);margin:10px 0 0"></p></form></div>`;
  $('#npf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const m = $('#npm');
    if (f.p1.value !== f.p2.value) { m.textContent = 'দুটো পাসওয়ার্ড মেলেনি।'; return; }
    const btn = f.querySelector('button'); btn.disabled = true;
    const { error } = await sb.auth.updateUser({ password: f.p1.value });
    if (error) { btn.disabled = false; m.textContent = /different|same/i.test(error.message) ? 'আগের পাসওয়ার্ড থেকে আলাদা একটা দিন।' : errMsg(error); return; }
    history.replaceState(null, '', location.pathname + '#/'); toast('নতুন পাসওয়ার্ড সংরক্ষণ হয়েছে'); afterLogin(user);
  };
}
function changePasswordModal() {
  openModal(`<h2>পাসওয়ার্ড বদলান</h2><form id="cpf" class="form">
    <label class="f full">নতুন পাসওয়ার্ড (অন্তত ৮ অক্ষর)<input name="p1" type="password" minlength="8" required autocomplete="new-password"></label>
    <label class="f full">আবার লিখুন<input name="p2" type="password" minlength="8" required autocomplete="new-password"></label>
    <p class="small full" id="cpm" style="color:var(--red);margin:0"></p>
    <div class="full row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="cpc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  $('#cpc').onclick = closeModal;
  $('#cpf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const m = $('#cpm');
    if (f.p1.value !== f.p2.value) { m.textContent = 'দুটো পাসওয়ার্ড মেলেনি।'; return; }
    const { error } = await sb.auth.updateUser({ password: f.p1.value });
    if (error) { m.textContent = /different|same/i.test(error.message) ? 'আগের পাসওয়ার্ড থেকে আলাদা একটা দিন।' : errMsg(error); return; }
    closeModal(); toast('পাসওয়ার্ড বদলানো হয়েছে');
  };
}

// ------------------------------------------------------------------ auth
async function boot() {
  const pm = location.hash.match(/^#\/p\/([A-Za-z0-9_-]{24,})/);
  if (pm) return renderParent(pm[1]);
  if (DEMO) { renderLogin(); return; }
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'SIGNED_OUT') { S.user = null; S.profile = null; S.loaded = false; renderLogin(); }
    if (ev === 'PASSWORD_RECOVERY' && session) renderNewPassword(session.user);
  });
  const { data } = await sb.auth.getSession();
  if (data.session && RECOVERY) return renderNewPassword(data.session.user);
  if (data.session) await afterLogin(data.session.user); else renderLogin();
}
async function afterLogin(user) {
  S.user = user;
  $('#app').innerHTML = '<div class="boot">তথ্য লোড হচ্ছে…</div>';
  try {
    if (DEMO) S.profile = { id: 'demo', name: 'ডেমো অ্যাডমিন', role: 'admin' };
    else {
      const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        $('#app').innerHTML = `<div class="login"><form class="card" id="clf"><h1>অনুমতি নেই</h1><p>আপনার লগইন (${esc(user.email)}) এখনও পোর্টালে যোগ করা হয়নি। পরিচালক আমন্ত্রণ কোড পাঠিয়ে থাকলে নিচে লিখুন।</p>
          <label class="f">আমন্ত্রণ কোড<input name="code" required maxlength="12" autocapitalize="characters" autocomplete="off" style="letter-spacing:.1em"></label>
          <button class="btn" type="submit" style="width:100%;justify-content:center;margin-top:12px">কোড দিন</button><p class="small" id="clm" style="color:var(--red);margin:8px 0 0"></p>
          <button type="button" class="btn ghost" id="lo" style="margin-top:6px">লগআউট</button></form></div>`;
        $('#lo').onclick = () => sb.auth.signOut();
        $('#clf').onsubmit = async (e) => { e.preventDefault(); const b = e.target.querySelector('button[type=submit]'); b.disabled = true; await claimAndEnter(user, e.target.code.value, (msg) => { b.disabled = false; $('#clm').textContent = msg; }); };
        return;
      }
      S.profile = data;
    }
    await loadAll();
    if (!location.hash || location.hash === '#') location.hash = '#/';
    render();
  } catch (e) { $('#app').innerHTML = `<div class="login"><div class="card"><h1>সমস্যা হয়েছে</h1><p>${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">আবার চেষ্টা</button></div></div>`; }
}
// language switch: the portal is written in Bengali; i18n.js translates it when English is picked
// light / dark look for the office portal, remembered on this device
const W_ICON = { card: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/>', phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>', lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>' };
const wIcon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${W_ICON[k]}</svg>`;
function themeBtnHtml() { const dk = document.documentElement.dataset.theme === 'dark'; return `<button type="button" class="themebtn" data-theme-to="${dk ? 'light' : 'dark'}" title="${dk ? 'হালকা রং' : 'গাঢ় রং'}">${dk ? '☀️ হালকা' : '🌙 গাঢ়'}</button>`; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-theme-to]'); if (!b) return; const t = b.dataset.themeTo; document.documentElement.dataset.theme = t; try { localStorage.setItem('sakura_theme', t); } catch (_) {} b.outerHTML = themeBtnHtml(); });
function langBtnHtml() { const en = window.SK_LANG === 'en'; return `<button type="button" data-noi18n class="langbtn" data-lang="${en ? 'bn' : 'en'}">🌐 ${en ? 'বাংলা' : 'English'}</button>`; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lang]'); if (b && window.setLang) { e.preventDefault(); window.setLang(b.dataset.lang); } });
// login screens: the card turns like a page (green in the middle) between "Welcome back" and the new-account side
function authTurn(next, toUp) {
  const card = $('.login .card'); const lg = $('.login');
  if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) return next();
  card.classList.add('turn-out'); lg.classList.add(toUp ? 'go-up' : 'go-in'); setTimeout(next, 360);
}
function renderLogin(turned) {
  const glow = (h) => `<span class="glow">${h}</span>`;
  $('#app').innerHTML = `<div class="login auth-in"><form class="card ${turned ? 'turn-in' : ''}" id="lf" autocomplete="on">
    <div class="kamon" style="width:56px;height:56px">${KAMON}</div>
    <h1 class="ahead">Welcome <em>back</em></h1><p class="asub">সাকুরা পোর্টাল — শুধু ইনস্টিটিউটের স্টাফ ও শিক্ষকদের জন্য</p>
    ${DEMO ? `<div class="demo-bar">ডেমো মোড: এখনো ডেটাবেস যুক্ত হয়নি। তথ্য শুধু এই ব্রাউজারে থাকবে।</div>
      <button class="btn abtn" type="submit">ডেমো মোডে ঢুকুন</button>` :
      `<label class="f">ইমেইল${glow('<input name="email" type="email" required autocomplete="username" placeholder="you@example.com">')}</label>
      <label class="f">পাসওয়ার্ড${glow('<input name="password" type="password" required autocomplete="current-password" placeholder="••••••••">')}</label>
      <button class="btn abtn" type="submit">লগইন</button>
      <p class="aline"><a href="#" id="toforgot" class="linkbtn">পাসওয়ার্ড ভুলে গেছেন?</a></p>
      <p class="aswap">প্রথমবার? <a href="#" id="tosignup" class="linkbtn up">আমন্ত্রণ কোড দিয়ে অ্যাকাউন্ট খুলুন</a></p>`}
    <div style="margin-top:14px;text-align:center">${langBtnHtml()}</div>
  </form></div>`;
  const ts = $('#tosignup'); if (ts) ts.onclick = (e) => { e.preventDefault(); authTurn(() => renderSignup('', true), true); };
  const tf = $('#toforgot'); if (tf) tf.onclick = (e) => { e.preventDefault(); renderForgot(); };
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    if (DEMO) return afterLogin({ id: 'demo', email: 'demo' });
    const btn = $('#lf button'); btn.disabled = true;
    const { email, password } = formData(e.target);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    if (error) return toast('ইমেইল বা পাসওয়ার্ড ভুল', true);
    afterLogin(data.user);
  };
}

// ------------------------------------------------------------------ shell & router
const ICON = {
  mega: '<path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M17 8.5a4.5 4.5 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12"/>',
  quiz: '<rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5h6v3H9z"/><path d="M8.5 12.5l2 2 4-4.5M8.5 18h7"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M8 7h8M8 11h6"/>',
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M1 21c0-4 4-7 8-7s8 3 8 7"/><path d="M17 4a4 4 0 0 1 0 8M23 21c0-3-2-5-5-6"/>',
  money: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/><path d="M6 10v5M18 10v5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8" cy="15" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
  teacher: '<circle cx="9" cy="7" r="3.5"/><path d="M2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/><path d="M14 3h8v7h-6"/>',
  check: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 15l3 3 5-6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  wallet: '<path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H3z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="13.5" r="1.2"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.3A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  log: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  plane: '<path d="M2.5 13.5l19-8-5 15-4.5-5.5z"/><path d="M12 15l-2.5 5-1-6.5"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
};
const NAV = [['#/scan', 'আইডি / QR দিয়ে খুঁজুন', 'key'], ['#/tnotes', 'শিক্ষকের নোট', 'book'], ['#/docinbox', 'ছাত্রদের পাঠানো কাগজ', 'log'], ['#/feedback', 'ছাত্রদের মতামত', 'chart'], ['#/proofs', 'অনলাইন পেমেন্ট যাচাই', 'money'], ['#/requests', 'সার্টিফিকেটের আবেদন', 'log'], ['#/questions', 'ছাত্রদের প্রশ্ন', 'chat'], ['#/homework', 'বাড়ির কাজ', 'pen'], ['#/notices', 'নোটিশ বোর্ড', 'mega'], ['#/', 'ড্যাশবোর্ড', 'home'], ['#/weekly', 'সাপ্তাহিক সারাংশ', 'trend'], ['#/alerts', 'সতর্কতা', 'bell'], ['#/students', 'ছাত্র-ছাত্রী', 'users'], ['#/leads', 'আগ্রহী ছাত্র', 'chat'], ['#/payments', 'ফি ও হিসাব', 'money'], ['#/expenses', 'খরচ ও লাভ', 'wallet'], ['#/attendance', 'হাজিরা', 'check'], ['#/calendar', 'ক্যালেন্ডার ও রুটিন', 'cal'], ['#/teachers', 'শিক্ষক ও বেতন', 'teacher'], ['#/exams', 'পরীক্ষা ও রেজাল্ট', 'pen'], ['#/materials', 'পড়ার উপকরণ', 'book'], ['#/mocks', 'মক টেস্ট', 'quiz'], ['#/japan', 'জাপান আবেদন', 'plane'], ['#/reports', 'রিপোর্ট', 'chart'], ['#/audit', 'কাজের রেকর্ড', 'log'], ['#/people', 'স্টাফ ও শিক্ষক', 'key'], ['#/settings', 'সেটিংস', 'gear']];
// menu sections — each page sits in one, and the page header shows "section › page"
const NAV_GROUPS = [['প্রতিদিনের কাজ', ['#/scan', '#/', '#/alerts', '#/attendance', '#/calendar', '#/weekly']], ['ছাত্র ও ভর্তি', ['#/students', '#/docinbox', '#/requests', '#/leads', '#/japan']], ['পড়াশোনা', ['#/tnotes', '#/exams', '#/homework', '#/questions', '#/feedback', '#/materials', '#/mocks', '#/notices']], ['টাকা-পয়সা', ['#/payments', '#/proofs', '#/expenses', '#/teachers', '#/reports']], ['প্রশাসন', ['#/people', '#/audit', '#/settings']]];
// the most-used pages sit in a bar across the top; everything else is in the side menu, folded by topic
const TOP_NAV = ['#/', '#/attendance', '#/students', '#/payments', '#/alerts', '#/scan'];
const SIDE_ICON = { 'প্রতিদিনের কাজ': 'cal', 'ছাত্র ও ভর্তি': 'users', 'পড়াশোনা': 'book', 'টাকা-পয়সা': 'money', 'প্রশাসন': 'gear' };
const navOpenGet = () => { try { return JSON.parse(localStorage.getItem('sakura_nav_open') || '{}'); } catch (_) { return {}; } };
const navOpenSet = (o) => { try { localStorage.setItem('sakura_nav_open', JSON.stringify(o)); } catch (_) {} };
const navAllowed = (h) => isTeacher() ? teacherRoutes().includes(h.slice(2)) : h === '#/people' ? isDirector() : (isAdmin() || !ADMIN_ROUTES.includes(h.slice(2)));
const WDAY_LONG = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
function shell(active, inner) {
  const al = isTeacher() ? [] : computeAlerts(); const red = al.filter(a => a.level === 'red').length;
  const item = (h) => { const n = NAV.find(x => x[0] === h); if (!n || !navAllowed(h)) return ''; const [, l, i] = n; return `<a href="${h}" class="${active === h ? 'on' : ''}" ${active === h ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[i]}</svg><span>${l}</span>${h === '#/alerts' && al.length ? `<span class="nb ${red ? 'red' : ''}">${al.length}</span>` : ''}</a>`; };
  const svg = (i) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[i]}</svg>`;
  const top = TOP_NAV.filter(navAllowed).map(h => { const n = NAV.find(x => x[0] === h); return `<a href="${h}" class="${active === h ? 'on' : ''}" ${active === h ? 'aria-current="page"' : ''}>${svg(n[2])}<span>${h === '#/scan' ? 'আইডি / QR' : n[1]}</span>${h === '#/alerts' && al.length ? `<span class="nb ${red ? 'red' : ''}">${al.length}</span>` : ''}</a>`; }).join('');
  const open = navOpenGet();
  const nav = NAV_GROUPS.map(([g, hs]) => { const rest = hs.filter(h => !TOP_NAV.includes(h)); const items = rest.map(item).join(''); if (!items) return ''; const here = rest.includes(active); const isOpen = here || open[g]; return `<details class="ng" data-g="${g}" ${isOpen ? 'open' : ''}><summary class="${here ? 'here' : ''}">${svg(SIDE_ICON[g] || 'log')}<span>${g}</span><span class="cnt">${rest.filter(navAllowed).length}</span><span class="chev" aria-hidden="true"></span></summary><div class="ngi">${items}</div></details>`; }).join('');
  const grp = NAV_GROUPS.find(([, hs]) => hs.includes(active)); const page = NAV.find(x => x[0] === active);
  const d = new Date(); const name = S.profile.name || S.user.email || '';
  return `<div class="mtop"><button id="mnav" aria-label="মেনু খুলুন">☰</button><span class="kamon">${KAMON}</span><b>সাকুরা পোর্টাল</b><a href="#/scan" class="mscan" aria-label="আইডি / QR দিয়ে খুঁজুন" title="আইডি / QR">📷</a>${al.length ? `<a class="nb ${red ? 'red' : ''}" href="#/alerts" style="margin-left:auto">${al.length} সতর্কতা</a>` : ''}</div>
  <div class="shell"><aside class="side" id="side" aria-label="মেনু">
    <div class="brand"><span class="kamon">${KAMON}</span><div><b>${esc(S.settings.institute_bn || 'সাকুরা পোর্টাল')}</b><small>さくら日本語学院</small></div><button type="button" class="railb" id="railb" title="মেনু ছোট / বড় করুন" aria-label="মেনু ছোট / বড় করুন"><span></span></button></div>
    <nav class="nav">${nav}</nav>
    <div class="who" id="who">
      <div class="wmenu" id="wmenu" hidden>
        <button type="button" id="mycard" class="wi">${wIcon('card')}<span>আমার আইডি কার্ড</span></button>
        ${isStandalone() ? '' : `<button type="button" id="inst" class="wi">${wIcon('phone')}<span>অ্যাপ হিসেবে ইনস্টল</span></button>`}
        ${DEMO ? '' : `<button type="button" id="chpw" class="wi">${wIcon('lock')}<span>পাসওয়ার্ড বদলান</span></button>`}
        <div class="wsep"></div>
        <div class="wrow">${langBtnHtml()}${themeBtnHtml()}</div>
        <div class="wsep"></div>
        <button type="button" id="logout" class="wi out">${wIcon('out')}<span>${DEMO ? 'বের হন' : 'লগআউট'}</span></button>
      </div>
      <button type="button" class="whob" id="whob" aria-expanded="false" aria-controls="wmenu"><span class="me">${esc((name.trim()[0] || '?').toUpperCase())}</span><span class="wt"><span class="nm">${esc(name)}</span><span class="rl">${ROLE_NAME[S.profile.role] || 'স্টাফ'}</span></span><span class="wchev" aria-hidden="true"></span></button>
    </div>
  </aside><div class="scrim" id="scrim"></div><main class="main"><nav class="topnav no-print" aria-label="প্রধান মেনু">${top}</nav>${DEMO ? '<div class="demo-bar">ডেমো মোড: তথ্য শুধু এই ব্রাউজারে আছে। আসল ব্যবহারের আগে Supabase যুক্ত করুন (README দেখুন)।</div>' : ''}
    <div class="crumb no-print">${grp ? `<b>${grp[0]}</b>${page && active !== '#/' ? `<span class="sep">›</span><span>${page[1]}</span>` : ''}` : ''}<span class="dt">${WDAY_LONG[d.getDay()]}, ${fmtD(todayISO())}</span></div>${inner}</main></div>`;
}
// settings page in the iPhone-Settings style: each section becomes its own rounded group with a small grey heading
function groupForm(f) {
  if (!f || f.dataset.g) return; f.dataset.g = '1'; let sec = null; const out = document.createDocumentFragment();
  [...f.children].forEach(k => { if (k.tagName === 'H3') { k.classList.add('sgh'); out.appendChild(k); sec = document.createElement('div'); sec.className = 'sgroup form'; out.appendChild(sec); } else if (sec && !k.matches('.full.row')) sec.appendChild(k); else out.appendChild(k); });
  f.appendChild(out); f.classList.add('sform');
}
let PILL_PREV = null, LAST_PAGE = '';
// the black pill in the top menu slides from the last page's tab to this one; the page itself fades in from a blur
function slidePill(active) {
  const nav = $('.topnav'); if (!nav) return; const pill = document.createElement('span'); pill.className = 'tpill'; pill.setAttribute('aria-hidden', 'true'); nav.prepend(pill);
  const on = $('.topnav a.on'); const to = on ? { l: on.offsetLeft, w: on.offsetWidth } : null; const from = PILL_PREV;
  const put = (r, o) => { pill.style.left = r.l + 'px'; pill.style.width = r.w + 'px'; pill.style.opacity = o; };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (from && !still) { put(from, from.o); pill.getBoundingClientRect(); pill.classList.add('go'); if (on && (from.l !== to.l || !from.o)) { on.classList.add('wait'); setTimeout(() => on.classList.remove('wait'), 260); } if (to) put(to, 1); else pill.style.opacity = 0; }
  else if (to) put(to, 1); else pill.style.opacity = 0;
  PILL_PREV = to ? { ...to, o: 1 } : from ? { ...from, o: 0 } : null;
  // the English switch rewrites the labels a moment after drawing, which changes their widths — follow the tab when that happens
  if (on) { const fix = () => { if (!on.isConnected) return; const r = { l: on.offsetLeft, w: on.offsetWidth }; put(r, 1); PILL_PREV = { ...r, o: 1 }; }; requestAnimationFrame(() => requestAnimationFrame(fix)); setTimeout(fix, 350); if (window.ResizeObserver) new ResizeObserver(fix).observe(on); }
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function railToggle() { const r = !document.documentElement.classList.contains('rail'); document.documentElement.classList.toggle('rail', r); try { localStorage.setItem('sakura_rail', r ? '1' : ''); } catch (_) {} }
try { if (localStorage.getItem('sakura_rail')) document.documentElement.classList.add('rail'); } catch (_) {}
function mount(active, inner, after) {
  $('#app').innerHTML = shell(active, inner);
  const page = location.hash.split('?')[0]; const main = $('.main');
  if (page !== LAST_PAGE && main && !matchMedia('(prefers-reduced-motion: reduce)').matches) { main.classList.add('enter'); setTimeout(() => main.classList.remove('enter'), 1100); }
  LAST_PAGE = page; slidePill(active);
  const rb = $('#railb'); if (rb) rb.onclick = railToggle;
  if (active === '#/settings') groupForm($('#stf'));
  $('#logout').onclick = () => { if (DEMO) { S.loaded = false; renderLogin(); } else sb.auth.signOut(); };
  $('#mnav').onclick = () => $('#side').classList.toggle('open');
  $$('.ng').forEach(d => d.addEventListener('toggle', () => { const o = navOpenGet(); o[d.dataset.g] = d.open; navOpenSet(o); }));
  $('#scrim').onclick = () => $('#side').classList.remove('open');
  const wb = $('#whob'), wm = $('#wmenu');
  if (wb) { const setW = (o) => { wm.hidden = !o; wb.setAttribute('aria-expanded', o); $('#who').classList.toggle('open', o); }; wb.onclick = (e) => { e.stopPropagation(); setW(wm.hidden); }; wm.onclick = (e) => { if (!e.target.closest('[data-theme-to],[data-lang]')) setW(false); }; document.addEventListener('click', (e) => { if (e.target.isConnected && !e.target.closest('#who')) setW(false); }); document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setW(false); }); }
  const ib = $('#inst'); if (ib) ib.onclick = installApp;
  const cp = $('#chpw'); if (cp) cp.onclick = changePasswordModal;
  const mc = $('#mycard'); if (mc) mc.onclick = () => staffCardModal(S.profile, true);
  if (after) after();
}
function render() {
  if (!S.loaded) return;
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, query] = h.split('?'); const q = new URLSearchParams(query || '');
  const p = path.split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (isTeacher() && (!teacherRoutes().includes(p[0] || '') || (p[0] === 'students' && p[1] === 'new') || (p[0] === 'student' && p[2]))) return mount('#/', TEACHER_ONLY_MSG);
  if (ADMIN_ROUTES.includes(p[0]) && !isAdmin()) return mount('#/', ADMIN_ONLY_MSG);
  if (p[0] === 'students' && p[1] === 'new') return viewStudentForm(null, q.get('lead'));
  if (p[0] === 'students') return viewStudents(q);
  if (p[0] === 'student' && p[2] === 'edit') return viewStudentForm(p[1]);
  if (p[0] === 'student' && p[2] === 'jp') return viewJapanForm(p[1]);
  if (p[0] === 'student') return viewStudent(p[1], q.get('t') || 'info');
  if (p[0] === 'payments') return viewPayments(q);
  if (p[0] === 'attendance') return viewAttendance(q);
  if (p[0] === 'expenses') return viewExpenses(q);
  if (p[0] === 'leads') return viewLeads(q);
  if (p[0] === 'exams') return viewExams(q);
  if (p[0] === 'exam') return viewExam(p[1]);
  if (p[0] === 'weekly') return viewWeekly(q);
  if (p[0] === 'calendar') return viewCalendar(q);
  if (p[0] === 'audit') return viewAudit(q);
  if (p[0] === 'alerts') return viewAlerts(q);
  if (p[0] === 'teachers') return viewTeachers(q);
  if (p[0] === 'teacher') return viewTeacher(p[1], q);
  if (p[0] === 'tnotes') return viewTnotes(p[1], p[2]);
  if (p[0] === 'japan') return viewJapan(q);
  if (p[0] === 'school') return viewSchool(p[1]);
  if (p[0] === 'reports') return viewReports();
  if (p[0] === 'materials') return viewMaterials(q);
  if (p[0] === 'notices') return viewNotices(q);
  if (p[0] === 'questions') return viewQuestions(q);
  if (p[0] === 'requests') return viewRequests(q);
  if (p[0] === 'proofs') return viewProofs(q);
  if (p[0] === 'feedback') return viewFeedback(q);
  if (p[0] === 'docinbox') return viewDocInbox(q);
  if (p[0] === 'scan') return viewScan(q);
  if (p[0] === 'homework') return p[1] ? viewHomework(p[1], q) : viewHomeworkList(q);
  if (p[0] === 'mocks') return viewMocks(q);
  if (p[0] === 'mock') return viewMock(p[1], q);
  if (p[0] === 'settings') return viewSettings();
  if (p[0] === 'people') return viewPeople();
  return viewDashboard();
}
window.addEventListener('hashchange', render);

// ------------------------------------------------------------------ dashboard
// ------------------------------------------------------------------ home "hero": greeting, the next class with a countdown, and what needs me
const BATCH_START = { morning: [10, 0, 12], evening: [18, 0, 20] }; // start hour, minute, end hour
function greetText() { const h = new Date().getHours(); return h < 5 ? 'শুভ রাত্রি' : h < 12 ? 'শুভ সকাল' : h < 16 ? 'শুভ দুপুর' : h < 18 ? 'শুভ বিকেল' : h < 21 ? 'শুভ সন্ধ্যা' : 'শুভ রাত্রি'; }
function upcomingClasses(n = 5) {
  const out = []; const now = new Date(); const groups = activeGroups();
  for (let i = 0; i < 21 && out.length < n; i++) {
    const d = isoAdd(todayISO(), i); if (dayInfo(d).off) continue;
    for (const b of ['morning', 'evening']) {
      if (dayInfo(d, b).off) continue; const gs = groups.filter(g => g.batch === b && groupStarted(g, d)); if (!gs.length) continue;
      const [h, mi, eh] = BATCH_START[b]; const st = new Date(d + 'T00:00:00'); st.setHours(h, mi, 0, 0); const en = new Date(st); en.setHours(eh);
      if (en <= now) continue;
      const plans = (S.class_plans || []).filter(p => p.class_date === d && (p.batch === 'all' || p.batch === b));
      out.push({ d, b, st, en, levels: gs.map(g => g.level), n: gs.reduce((a, g) => a + g.n, 0), live: st <= now, plan: plans[0] || null });
      if (out.length >= n) break;
    }
  }
  return out;
}
function untilText(t) { const m = Math.max(0, Math.round((t - new Date()) / 60000)); const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; if (window.SK_LANG === 'en') return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm} min`; return d ? `${d} দিন ${h} ঘণ্টা` : h ? `${h} ঘণ্টা ${mm} মিনিট` : `${mm} মিনিট`; }
function upNextCard() {
  const list = upcomingClasses(5); const nx = list[0];
  const dayLbl = (c) => c.d === todayISO() ? 'আজ' : c.d === isoAdd(todayISO(), 1) ? 'আগামীকাল' : `${WDAY[dow(c.d)]}বার, ${fmtD(c.d)}`;
  const big = nx ? `<a class="unx" href="#/attendance?d=${nx.d}&l=${esc(nx.levels[0])}&b=${nx.b}"><div class="unx-art" aria-hidden="true"><span>${esc(nx.levels.join(' · '))}</span></div>
    <div class="unx-tx"><div class="unx-tag"><i>${esc(BATCH[nx.b])}</i><b class="${nx.live ? 'live' : ''}">${nx.live ? 'ক্লাস চলছে' : 'নির্ধারিত'}</b></div>
      <small>${nx.live ? 'শেষ হবে' : 'শুরু হবে'}</small><div class="unx-t" data-until="${(nx.live ? nx.en : nx.st).getTime()}">${untilText(nx.live ? nx.en : nx.st)}</div>
      <div class="unx-s">🕘 ${dayLbl(nx)} · ${nx.n} জন ছাত্র</div>${nx.plan && nx.plan.topic ? `<p>${esc(nx.plan.topic)}</p>` : ''}<span class="unx-go" aria-hidden="true">↗</span></div></a>`
    : `<div class="empty" style="padding:28px">সামনের তিন সপ্তাহে কোনো ক্লাস নেই</div>`;
  const rest = list.slice(1, 5).map(c => `<a class="unl" href="#/calendar?m=${c.d.slice(0, 7)}"><span class="unl-i">${esc(c.levels[0])}</span><span class="unl-t"><b>${esc(c.levels.join(', '))} · ${esc(BATCH[c.b])}</b><small>${dayLbl(c)}</small></span><span class="unl-s">● নির্ধারিত</span></a>`).join('');
  return `<div class="card hx"><div class="hxh"><h2>পরের ক্লাস</h2><a class="small" href="#/calendar">ক্যালেন্ডার ↗</a></div>${big}${rest ? `<div class="hxsub">সামনে</div><div class="unls">${rest}</div>` : ''}</div>`;
}
function needsYouItems() {
  const it = []; const today = todayISO(); const nm = (sid) => studentName(byId(S.students, sid) || {});
  if (!isTeacher()) {
    (S.pay_proofs || []).filter(x => x.status === 'pending').forEach(x => it.push({ ic: '💳', t: `${nm(x.student_id)} ${tk(x.amount)} পাঠিয়েছে`, s: `${METHOD[x.method] || x.method || ''} · TrxID ${x.trx_id || '—'} · যাচাই বাকি`, act: { pp: x.id, l: 'যাচাই করুন' }, go: '#/proofs' }));
    (S.doc_requests || []).filter(x => x.status === 'pending').forEach(x => it.push({ ic: '📜', t: `${nm(x.student_id)}: সার্টিফিকেটের আবেদন`, s: 'তৈরি করে দিতে হবে', go: '#/requests' }));
    const fresh = S.documents.filter(d => d.student_upload_at && d.status === 'received'); const per = new Set(fresh.map(d => d.student_id));
    per.forEach(sid => it.push({ ic: '📎', t: `${nm(sid)} কাগজ পাঠিয়েছে`, s: `${fresh.filter(d => d.student_id === sid).length}টি ফাইল দেখা বাকি`, go: '#/docinbox' }));
    S.inquiries.filter(l => ['new', 'contacted', 'trial'].includes(l.status) && l.next_follow_up && l.next_follow_up <= today).slice(0, 3).forEach(l => it.push({ ic: '📞', t: `${l.name}: ফলো-আপ`, s: l.next_follow_up < today ? `${fmtD(l.next_follow_up)} থেকে বাকি` : 'আজ ফোন করার দিন', go: '#/leads' }));
  }
  (S.student_questions || []).filter(x => x.status === 'open').forEach(x => it.push({ ic: '💬', t: `${nm(x.student_id)} প্রশ্ন করেছে`, s: String(x.question || x.body || '').slice(0, 70), go: '#/questions' }));
  const miss = missingAttendance(); if (miss.length) it.push({ ic: '✅', t: `${miss.length}টি ক্লাসের হাজিরা বাকি`, s: miss.slice(0, 2).map(x => `${fmtD(x.date)} ${x.level}`).join(' · '), go: `#/attendance?d=${miss[0].date}&l=${miss[0].level}&b=${miss[0].batch}`, warn: true });
  return it;
}
function needsYouCard() {
  const it = needsYouItems(); const show = it.slice(0, 5);
  return `<div class="card hx"><div class="hxh"><h2>আপনার কাজ বাকি</h2>${it.length ? `<span class="hxn">${it.length}</span>` : ''}</div>
    ${show.length ? `<div class="nys">${show.map(x => `<div class="ny ${x.warn ? 'warn' : ''}"><span class="ny-i" aria-hidden="true">${x.ic}</span><div class="ny-t"><b>${esc(x.t)}</b><small>${esc(x.s)}</small><div class="ny-b">${x.act ? `<button class="btn sm ok" data-npp="${x.act.pp}">✓ ${x.act.l}</button>` : `<a class="btn sm ok" href="${x.go}">খুলুন →</a>`}<a class="ny-r" href="${x.go}">দেখুন</a></div></div></div>`).join('')}</div>${it.length > 5 ? `<a class="nymore" href="#/alerts">⌄ আরও ${it.length - 5}টি</a>` : ''}`
      : `<div class="empty" style="padding:28px">সব কাজ শেষ — কিছু বাকি নেই 🎉</div>`}</div>`;
}
let HX_TIMER = 0;
function bindHero() {
  clearInterval(HX_TIMER); $$('[data-npp]').forEach(b => b.onclick = () => proofModal(byId(S.pay_proofs, b.dataset.npp)));
  HX_TIMER = setInterval(() => { const el = $('[data-until]'); if (!el) return clearInterval(HX_TIMER); el.textContent = untilText(new Date(+el.dataset.until)); }, 30000);
}
const heroTitle = () => { const nm = (S.profile.name || '').trim().split(/\s+/); const first = nm.length > 1 && /^(md\.?|mohammad|muhammad|মো\.?|মোঃ)$/i.test(nm[0]) ? nm[1] : nm[0] || ''; return `<h1 class="greet">${greetText()},<br><span>${esc(first)}</span></h1>`; };
function viewDashboard() {
  if (isTeacher()) return viewTeacherHome();
  const smap = sessionMap(); const today = todayISO(); const m = monthISO();
  const current = S.students.filter(s => s.status === 'active' || s.status === 'trial');
  const monthIncome = incomeOf(m);
  const dues = S.students.filter(s => s.status !== 'dropped').map(s => ({ s, due: dueOf(s) })).filter(x => x.due > 0).sort((a, b) => (a.s.next_due_date || '9999').localeCompare(b.s.next_due_date || '9999'));
  const totalDue = dues.reduce((a, x) => a + x.due, 0);
  const todaySessions = S.sessions.filter(s => s.class_date === today).map(s => s.id);
  const todayRecs = S.attendance.filter(a => todaySessions.includes(a.session_id));
  const todayCame = todayRecs.filter(a => a.status === 'present' || a.status === 'late').length;
  const low = current.map(s => ({ s, a: attOf(s.id, smap) })).filter(x => x.a.total >= 5 && x.a.pct < 80).sort((a, b) => a.a.pct - b.a.pct);
  const recent = [...S.payments].sort((a, b) => (b.paid_on + b.created_at).localeCompare(a.paid_on + a.created_at)).slice(0, 6);
  const groups = {}; for (const s of current) { const k = s.current_level + '|' + s.batch; groups[k] = (groups[k] || 0) + 1; }
  const monthExp = monthSum(S.expenses, 'spent_on', m); const profit = monthIncome - monthExp;
  const follow = S.inquiries.filter(l => ['new', 'contacted', 'trial'].includes(l.status) && l.next_follow_up && l.next_follow_up <= today).sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up));
  const lastAbsent = (sid) => { const r = S.attendance.filter(x => x.student_id === sid && x.status === 'absent' && smap.has(x.session_id)).map(x => smap.get(x.session_id).class_date).sort(); return r[r.length - 1] || today; };
  const todayOff = dayInfo(today); const missAtt = missingAttendance();
  const jpSoon = S.applications.filter(a => appOpen(a) && appNext(a) && appNext(a)[0] <= isoPlus(21)).sort((a, b) => appNext(a)[0].localeCompare(appNext(b)[0]));
  const expByCat = {}; S.expenses.filter(e => (e.spent_on || '').startsWith(m)).forEach(e => { expByCat[e.category] = (expByCat[e.category] || 0) + num(e.amount); });
  const expCard = `<div class="card"><h2>এ মাসের খরচ</h2>${Object.keys(expByCat).length ? `<div class="tw"><table><tr><th>খাত</th><th class="num">টাকা</th></tr>${Object.entries(expByCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr class="click" data-go="#/expenses"><td>${esc(EXP_CAT[k] || k)}</td><td class="num">${tk(v)}</td></tr>`).join('')}</table></div>` : '<div class="empty">এ মাসে কোনো খরচ লেখা হয়নি</div>'}</div>`;
  // numbers for the trend lines and charts
  const m6 = monthsUpTo(6);
  const inc6 = m6.map(incomeOf), exp6 = m6.map(x => monthSum(S.expenses, 'spent_on', x));
  const admits = m6.map(x => S.students.filter(st => (st.admission_date || '').startsWith(x)).length);
  const att14 = [...new Set(S.sessions.map(x => x.class_date))].filter(d => d && d <= today).sort().slice(-14).map(d => { const ids = S.sessions.filter(x => x.class_date === d).map(x => x.id); const rs = S.attendance.filter(a => ids.includes(a.session_id)); return { d, pct: rs.length ? Math.round(rs.filter(a => a.status === 'present' || a.status === 'late').length * 100 / rs.length) : null }; }).filter(x => x.pct != null);
  const paidCur = current.reduce((a, st) => a + Math.max(0, num(st.total_fee) - num(st.discount) - dueOf(st)), 0);
  const collectPct = paidCur + totalDue ? Math.round(paidCur * 100 / (paidCur + totalDue)) : 0;
  const collectBar = `<div class="kbar" title="চলমান ছাত্রদের ফি-র কত অংশ আদায় হয়েছে"><span style="width:${collectPct}%"></span></div><div class="s" style="margin-top:4px">ফি আদায় ${collectPct}%</div>`;
  mount('#/', `
  <div class="top"><div>${heroTitle()}<p>আজ ${fmtD(today)} · ড্যাশবোর্ড</p></div>
    <div class="row no-print"><a class="btn" href="#/students/new">+ নতুন ছাত্র</a><button class="btn gold" id="qp">+ টাকা জমা</button><a class="btn ghost" href="#/attendance">আজকের হাজিরা</a>${isAdmin() ? '<a class="btn ghost" href="#/weekly">সাপ্তাহিক সারাংশ</a>' : ''}</div></div>
  ${(() => { const al = computeAlerts(); const red = al.filter(a => a.level === 'red'); if (!al.length) return ''; return `<a class="alertbar ${red.length ? 'red' : ''}" href="#/alerts"><b>${red.length ? red.length + 'টি জরুরি সতর্কতা' : al.length + 'টি সতর্কতা'}</b><span>${esc(al.slice(0, 2).map(a => { const t = studentName(byId(S.students, a.sid)) + ': ' + a.what + ' — ' + a.issue; return t.length > 110 ? t.slice(0, 108) + '…' : t; }).join(' · '))}${al.length > 2 ? ` · আরও ${al.length - 2}টি` : ''}</span><span class="go">দেখুন →</span></a>`; })()}
  ${isAdmin() && (!S.settings.last_backup_at || daysBetween(S.settings.last_backup_at.slice(0, 10), today) >= 7) ? `<a class="alertbar" href="#/reports" style="margin-bottom:16px"><b>${S.settings.last_backup_at ? daysBetween(S.settings.last_backup_at.slice(0, 10), today) + ' দিন ব্যাকআপ নেওয়া হয়নি' : 'এখনো কোনো ব্যাকআপ নেওয়া হয়নি'}</b><span>রিপোর্ট পাতা থেকে "পুরো ব্যাকআপ নিন" চেপে ZIP ফাইলটা ল্যাপটপ বা Google Drive-এ রাখুন।</span><span class="go">ব্যাকআপ নিন →</span></a>` : ''}
  ${todayOff.off ? `<div class="alertbar" style="margin-bottom:16px"><b>আজ ক্লাস নেই</b><span>${esc(todayOff.why)}</span></div>` : ''}
  ${missAtt.length ? `<a class="alertbar" href="#/attendance?d=${missAtt[0].date}&l=${missAtt[0].level}&b=${missAtt[0].batch}" style="margin-bottom:16px"><b>${missAtt.length}টি ক্লাসের হাজিরা নেওয়া হয়নি</b><span>${missAtt.slice(0, 3).map(x => `${fmtD(x.date)} ${x.level} ${BATCH[x.batch]}`).join(' · ')}${missAtt.length > 3 ? ' …' : ''} — ছুটি থাকলে ক্যালেন্ডারে ছুটি দিন</span><span class="go">হাজিরা নিন →</span></a>` : ''}
  <div class="grid g2 hero">${upNextCard()}${needsYouCard()}</div>
  <div class="grid g4 kpis">
    ${kpi('users', 'চলমান ছাত্র-ছাত্রী', current.length, `মোট ভর্তি ${S.students.length} জন · এ মাসে নতুন ${admits[5]}`, '', spark(admits, 'var(--navy)'), delta(admits[5], admits[4]))}
    ${isAdmin() ? kpi('money', 'এ মাসের আয়', tk(monthIncome), `খরচ ${tk(monthExp)} · <b style="color:${profit < 0 ? 'var(--red)' : 'var(--green)'}">${profit < 0 ? 'ক্ষতি' : 'লাভ'} ${tk(Math.abs(profit))}</b>`, 'green', spark(inc6, 'var(--green)'), delta(inc6[5], inc6[4])) : (() => { const tp = S.payments.filter(x => x.paid_on === today); return kpi('money', 'আজকের জমা', tk(tp.reduce((a, x) => a + num(x.amount), 0)), `${tp.length}টি রশিদ`, 'green', '', ''); })()}
    ${kpi('wallet', 'মোট বকেয়া', tk(totalDue), `${dues.length} জনের কাছে`, 'red', collectBar, '')}
    ${kpi('check', 'আজকের উপস্থিতি', todayRecs.length ? todayCame + ' / ' + todayRecs.length : '—', todaySessions.length ? todaySessions.length + 'টি ক্লাস' : 'আজ হাজিরা নেওয়া হয়নি', '', att14.length > 1 ? spark(att14.map(x => x.pct), 'var(--gold)') : '', '')}
  </div>
  <div class="grid g2 charts" style="margin-top:16px">
    ${isAdmin() ? `<div class="card chartcard"><div class="ch"><h2>আয় ও খরচ</h2><span class="muted small">শেষ ৬ মাস</span></div>${barChart(m6, inc6, exp6)}<div class="lg"><span><i style="background:var(--green)"></i>আয়</span><span><i style="background:var(--red)"></i>খরচ</span></div></div>` : ''}
    <div class="card chartcard"><div class="ch"><h2>উপস্থিতির হার</h2><span class="muted small">শেষ ${att14.length || 0}টি ক্লাসের দিন</span></div>${att14.length > 1 ? lineChart(att14) : '<div class="empty" style="padding:30px">হাজিরা নেওয়া শুরু করলে এখানে গ্রাফ দেখা যাবে</div>'}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>বকেয়া ফি</h2>${dues.length ? `<div class="tw"><table><tr><th>ছাত্র</th><th class="num">বকেয়া</th><th>পরের কিস্তি</th><th></th></tr>${dues.slice(0, 8).map(({ s, due }) => `<tr class="click" data-go="#/student/${s.id}?t=fees"><td>${esc(studentName(s))}<div class="small muted">${esc(s.admission_no)}</div></td><td class="num">${tk(due)}</td><td>${s.next_due_date ? (s.next_due_date < today ? badge('due', fmtD(s.next_due_date) + ' পার হয়েছে') : fmtD(s.next_due_date)) : '<span class="muted">—</span>'}</td><td class="num">${waBtn(guardianPhone(s), dueMsg(s), '')}</td></tr>`).join('')}</table></div>` : '<div class="empty">কোনো বকেয়া নেই</div>'}</div>
    <div class="card"><h2>উপস্থিতি ৮০%-এর নিচে</h2>${low.length ? `<div class="tw"><table><tr><th>ছাত্র</th><th>লেভেল</th><th>উপস্থিতি</th><th></th></tr>${low.slice(0, 8).map(({ s, a }) => `<tr class="click" data-go="#/student/${s.id}?t=att"><td>${esc(studentName(s))}<div class="small muted">${esc(s.guardian_phone || s.phone)}</div></td><td>${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</td><td>${bar(a.pct)}</td><td class="num">${waBtn(guardianPhone(s), absentMsg(s, lastAbsent(s.id), a), '')}</td></tr>`).join('')}</table></div><p class="small muted">স্টাডি-আওয়ার সার্টিফিকেটের জন্য ৮০% উপস্থিতি লাগে। অভিভাবকের সাথে কথা বলুন।</p>` : '<div class="empty">সবার উপস্থিতি ঠিক আছে</div>'}</div>
    <div class="card"><h2>সাম্প্রতিক জমা</h2>${recent.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>ছাত্র</th><th class="num">টাকা</th></tr>${recent.map(p => { const s = byId(S.students, p.student_id); return `<tr class="click" data-go="#/student/${p.student_id}?t=fees"><td>${fmtD(p.paid_on)}</td><td>${esc(studentName(s))}</td><td class="num">${tk(p.amount)}</td></tr>`; }).join('')}</table></div>` : '<div class="empty">এখনো কোনো জমা নেই</div>'}</div>
    <div class="card"><h2>ব্যাচ অনুযায়ী ছাত্র</h2><div class="tw"><table><tr><th>লেভেল</th><th>${BATCH.morning}</th><th>${BATCH.evening}</th></tr>${LEVELS.map(l => `<tr><td><b>${l}</b></td><td>${groups[l + '|morning'] || 0} জন</td><td>${groups[l + '|evening'] || 0} জন</td></tr>`).join('')}</table></div></div>
    <div class="card"><h2>আজকের ফলো-আপ</h2>${follow.length ? `<div class="tw"><table><tr><th>নাম</th><th>অবস্থা</th><th>তারিখ</th><th></th></tr>${follow.slice(0, 8).map(l => `<tr class="click" data-go="#/leads"><td>${esc(l.name)}<div class="small muted">${esc(l.phone)}</div></td><td>${badge(LEAD_ST_CLS[l.status], LEAD_ST[l.status])}</td><td>${l.next_follow_up < today ? badge('due', fmtD(l.next_follow_up)) : 'আজ'}</td><td class="num">${waBtn(l.phone, leadMsg(l), '')}</td></tr>`).join('')}</table></div>` : '<div class="empty">আজ কাউকে ফোন করার নেই</div>'}</div>
    <div class="card"><h2>জাপান আবেদন: সামনের তারিখ</h2>${jpSoon.length ? `<div class="tw"><table><tr><th>ছাত্র</th><th>স্কুল</th><th>তারিখ</th></tr>${jpSoon.slice(0, 8).map(a => `<tr class="click" data-go="#/student/${a.student_id}?t=japan"><td>${esc(studentName(byId(S.students, a.student_id)))}</td><td>${esc(schoolName(byId(S.jp_schools, a.school_id)))}</td><td>${nextCell(a)}</td></tr>`).join('')}</table></div>` : '<div class="empty">সামনের ৩ সপ্তাহে কোনো তারিখ নেই</div>'}</div>
    ${isAdmin() ? expCard : ''}
  </div>`, () => { $('#qp').onclick = () => paymentModal(null); bindGo(); addStaffWallet(); bindHero(); });
}
// ------------------------------------------------------------------ dashboard charts (plain SVG, no library)
const BN_MON_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
function monthsUpTo(n) { const d = new Date(); return Array.from({ length: n }, (_, i) => { const x = new Date(d.getFullYear(), d.getMonth() - (n - 1 - i), 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); }); }
function kpi(icon, label, value, sub, tone, extra, dl) {
  return `<div class="card stat kpi ${tone}"><div class="kh"><span class="ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[icon] || ''}</svg></span><span class="l">${label}</span>${dl || ''}</div><div class="v">${value}</div><div class="s">${sub}</div>${extra || ''}</div>`;
}
function delta(now, before) {
  if (!before && !now) return '';
  if (!before) return '<span class="delta up" title="গত মাসের তুলনায়">নতুন</span>';
  const p = Math.round((now - before) * 100 / Math.abs(before));
  return `<span class="delta ${p >= 0 ? 'up' : 'down'}" title="গত মাসের তুলনায়">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</span>`;
}
function spark(vals, color) {
  if (!vals.length || vals.every(v => !v)) return '<div class="spark"></div>';
  const w = 120, h = 36, max = Math.max(...vals), min = Math.min(0, ...vals), step = w / Math.max(1, vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - 3 - ((v - min) / ((max - min) || 1)) * (h - 8)]);
  const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L${w} ${h} L0 ${h}Z" fill="${color}" opacity=".13"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${color}"/></svg>`;
}
function barChart(months, a, b) {
  const W = 520, H = 210, P = 44, max = Math.max(1, ...a, ...b), gw = (W - P - 8) / months.length, bw = Math.min(22, gw / 3);
  const y = v => H - 26 - (v / max) * (H - 46);
  const grid = [0, .5, 1].map(f => { const v = max * f, yy = y(v); return `<line x1="${P}" x2="${W - 4}" y1="${yy}" y2="${yy}" class="gl"/><text x="${P - 6}" y="${yy + 4}" text-anchor="end" class="ax">${v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)}</text>`; }).join('');
  const bars = months.map((mo, i) => { const x = P + gw * i + gw / 2; return `<g><title>${BN_MON_SHORT[+mo.slice(5) - 1]}: আয় ${tk(a[i])} · খরচ ${tk(b[i])}</title><rect x="${x - bw - 2}" y="${y(a[i])}" width="${bw}" height="${H - 26 - y(a[i])}" rx="4" class="bi"/><rect x="${x + 2}" y="${y(b[i])}" width="${bw}" height="${H - 26 - y(b[i])}" rx="4" class="be"/><text x="${x}" y="${H - 8}" text-anchor="middle" class="ax">${BN_MON_SHORT[+mo.slice(5) - 1]}</text></g>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="শেষ ৬ মাসের আয় ও খরচ">${grid}${bars}</svg>`;
}
function lineChart(rows) {
  const W = 520, H = 210, P = 44, step = (W - P - 16) / Math.max(1, rows.length - 1);
  const y = v => H - 26 - (v / 100) * (H - 46);
  const pts = rows.map((r, i) => [P + 8 + i * step, y(r.pct)]);
  const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const grid = [0, 50, 80, 100].map(v => `<line x1="${P}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" class="gl ${v === 80 ? 'g80' : ''}"/><text x="${P - 6}" y="${y(v) + 4}" text-anchor="end" class="ax">${v}%</text>`).join('');
  const dots = rows.map((r, i) => `<g><title>${fmtD(r.d)}: ${r.pct}%</title><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="4" class="${r.pct < 80 ? 'dl' : 'dg'}"/></g>`).join('');
  const lab = rows.map((r, i) => i % Math.ceil(rows.length / 6) === 0 || i === rows.length - 1 ? `<text x="${pts[i][0]}" y="${H - 8}" text-anchor="middle" class="ax">${r.d.slice(8)}/${r.d.slice(5, 7)}</text>` : '').join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="শেষ কয়েক দিনের উপস্থিতির হার">${grid}<path d="${d} L${pts[pts.length - 1][0]} ${H - 26} L${pts[0][0]} ${H - 26}Z" class="la"/><path d="${d}" class="ln" pathLength="1"/>${dots}${lab}</svg>`;
}
// ---- my staff ID card on the home page, like a card in a wallet app: tap to turn it over to the QR
function addStaffWallet() {
  const top = $('.main .top'); if (!top || $('#wcard')) return; const p = S.profile || {}; const c = cardOf(p) || {}; const st = S.settings || {};
  const tag = /ব্যবস্থাপনা|managing|\bMD\b/i.test(c.designation || '') ? 'MANAGING DIRECTOR' : (ROLE_EN[p.role] || 'STAFF');
  const el = document.createElement('div'); el.className = 'swal no-print';
  el.innerHTML = `<div class="wcard" id="wcard" role="button" tabindex="0" aria-label="আমার আইডি কার্ড — উল্টাতে চাপুন"><div class="wci">
    <div class="wf wfront"><div class="wtop"><span class="kamon">${KAMON}</span><div class="wbrand"><b>${esc(st.institute_bn || 'সাকুরা জাপানিজ ইনস্টিটিউট')}</b><small>さくら日本語学院 · STAFF ID</small></div></div>
      <div class="wmid"><div class="wph" id="wph"><span>${esc(((p.name || '?').trim()[0] || '?').toUpperCase())}</span></div>
        <div class="wtx"><b>${esc(p.name || '')}</b><small>${esc(c.designation || ROLE_NAME[p.role] || '')}</small><div class="wtags"><i>${esc(tag)}</i>${c.blood_group ? `<i class="b">🩸 ${esc(c.blood_group)}</i>` : ''}</div></div></div>
      <div class="wbot"><span class="wno">${esc(c.staff_no || '')}</span><span class="whint">QR দেখতে চাপুন ↻</span></div></div>
    <div class="wf wback"><div class="wstrip"></div><div class="wqr" id="wqr"><small>QR তৈরি হচ্ছে…</small></div><div class="wbk"><b>${esc(c.staff_no || '')}</b><small>${esc(st.institute_bn || '')}${st.phone ? ' · ' + esc(st.phone) : ''}</small><small>মেয়াদ: ${fmtD(c.valid_until)}</small><span class="whint">আবার উল্টাতে চাপুন ↻</span></div></div>
  </div></div>`;
  const row = document.createElement('div'); row.className = 'toprow'; top.before(row); row.append(top, el);
  const card = $('#wcard'); let qr = false;
  const flip = async () => { card.classList.toggle('flip'); if (qr || !card.classList.contains('flip')) return; qr = true; try { await loadQR(); $('#wqr').innerHTML = qrSvg(`${location.origin}${location.pathname}#/people`); } catch (e) { $('#wqr').innerHTML = '<small>QR তৈরি করা যায়নি</small>'; qr = false; } };
  card.onclick = flip; card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  if (c.photo_path && !DEMO) API.fileUrlFrom('staffphoto', c.photo_path).then(u => { const b = $('#wph'); if (b && u) b.innerHTML = `<img src="${esc(u)}" alt="">`; }).catch(() => {});
}
function bindGo() { $$('[data-go]').forEach(el => el.onclick = () => { location.hash = el.dataset.go; }); $$('[data-stop]').forEach(el => el.addEventListener('click', e => e.stopPropagation())); }

// ------------------------------------------------------------------ students list
function viewStudents(q) {
  const f = { s: q.get('s') || '', l: q.get('l') || '', b: q.get('b') || '', st: q.get('st') || 'current' };
  const smap = sessionMap();
  let list = S.students.filter(s => {
    if (f.l && s.current_level !== f.l) return false;
    if (f.b && s.batch !== f.b) return false;
    if (f.st === 'current' && !(s.status === 'active' || s.status === 'trial')) return false;
    if (f.st && f.st !== 'current' && f.st !== 'all' && s.status !== f.st) return false;
    if (f.s) { const t = f.s.toLowerCase(); if (![s.name_bn, s.name_en, s.admission_no, s.phone, s.guardian_phone].some(v => (v || '').toLowerCase().includes(t))) return false; }
    return true;
  }).sort((a, b) => (b.admission_no || '').localeCompare(a.admission_no || ''));
  mount('#/students', `
  <div class="top"><div><h1>ছাত্র-ছাত্রী</h1><p>${list.length} জন দেখানো হচ্ছে</p></div><div class="row">${!isAdmin() ? '' : list.length ? `<button class="btn ghost" id="idall">আইডি কার্ড প্রিন্ট (${list.length} জন)</button>` : ''}${isTeacher() ? '' : '<a class="btn" href="#/students/new">+ নতুন ছাত্র</a>'}</div></div>
  <form class="row card" id="flt" style="padding:12px;margin-bottom:14px">
    <input class="search" name="s" placeholder="নাম, ভর্তি নম্বর বা ফোন দিয়ে খুঁজুন" value="${esc(f.s)}">
    <select name="l"><option value="">সব লেভেল</option>${LEVELS.map(l => `<option ${f.l === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select name="b"><option value="">সব ব্যাচ</option>${Object.entries(BATCH).map(([k, v]) => `<option value="${k}" ${f.b === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <select name="st"><option value="current" ${f.st === 'current' ? 'selected' : ''}>চলমান + ট্রায়াল</option><option value="all" ${f.st === 'all' ? 'selected' : ''}>সবাই</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${f.st === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="btn ghost">খুঁজুন</button></form>
  <div class="tw">${list.length ? `<table class="stack"><tr><th>ভর্তি নং</th><th>নাম</th><th>লেভেল · ব্যাচ</th>${isTeacher() ? '' : '<th class="hide-m">ফোন</th>'}<th>অবস্থা</th>${isTeacher() ? '' : '<th class="num">বকেয়া</th>'}<th class="hide-m">উপস্থিতি</th></tr>
    ${list.map(s => { const due = dueOf(s); const a = attOf(s.id, smap); return `<tr class="click" data-go="#/student/${s.id}"><td class="mt" data-l=""><span><b>${esc(s.name_bn || s.name_en || '')}</b><span class="small muted"> · ${esc(s.admission_no)}</span></span></td><td class="dm">${esc(s.admission_no)}</td><td class="dm"><b>${esc(s.name_bn || '')}</b><div class="small muted">${esc(s.name_en || '')}</div></td><td data-l="লেভেল · ব্যাচ">${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</td>${isTeacher() ? '' : `<td class="hide-m">${esc(s.phone)}</td>`}<td data-l="অবস্থা">${badge(s.status, STATUS[s.status] || s.status)}</td>${isTeacher() ? '' : `<td class="num" data-l="বকেয়া">${due ? `<span style="color:var(--red);font-weight:600">${tk(due)}</span>` : badge('paid', 'পরিশোধিত')}</td>`}<td data-l="উপস্থিতি">${bar(a.pct)}</td></tr>`; }).join('')}</table>` : '<div class="empty">কোনো ছাত্র পাওয়া যায়নি</div>'}</div>`,
  () => {
    $('#flt').onsubmit = (e) => { e.preventDefault(); const d = formData(e.target); const p = new URLSearchParams(Object.entries(d).filter(([, v]) => v)); location.hash = '#/students?' + p; };
    $$('#flt select').forEach(sel => sel.onchange = () => $('#flt').requestSubmit());
    const ia = isAdmin() && $('#idall'); if (ia) ia.onclick = () => printIdCards([...list].sort((a, b) => (a.admission_no || '').localeCompare(b.admission_no || '')));
    bindGo();
  });
}

// ------------------------------------------------------------------ student form
function viewStudentForm(id, leadId) {
  const s = id ? byId(S.students, id) : null;
  const lead = leadId ? byId(S.inquiries, leadId) : null;
  if (id && !s) return mount('#/students', '<div class="empty">ছাত্র পাওয়া যায়নি</div>');
  const v = s || { admission_no: nextAdmissionNo(), admission_date: todayISO(), package: 'N5', current_level: 'N5', batch: 'morning', status: 'trial', total_fee: S.settings.fees.N5, discount: 0, japan_stage: 'none' };
  if (!s && lead) { v.name_bn = lead.name; v.phone = lead.phone; if (LEVELS.includes(lead.interest)) { v.package = lead.interest; v.current_level = lead.interest; v.total_fee = S.settings.fees[lead.interest]; } v.notes = lead.notes ? 'আগ্রহী তালিকা থেকে: ' + lead.notes : ''; }
  const inp = (name, label, type = 'text', extra = '') => `<label class="f ${extra.includes('full') ? 'full' : ''}">${label}<input name="${name}" type="${type}" value="${esc(v[name] ?? '')}" ${extra.replace('full', '')}></label>`;
  const sel = (name, label, opts) => `<label class="f">${label}<select name="${name}">${Object.entries(opts).map(([k, l]) => `<option value="${esc(k)}" ${String(v[name]) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  mount('#/students', `
  <div class="top"><div><h1>${s ? 'তথ্য সম্পাদনা' : 'নতুন ছাত্র ভর্তি'}</h1><p>${esc(v.admission_no)}${lead ? ' · আগ্রহী তালিকা থেকে: ' + esc(lead.name) : ''}</p></div></div>
  <form class="card form" id="sf">
    <h3>ভর্তি</h3>
    ${inp('admission_no', 'ভর্তি নম্বর', 'text', 'required')}${inp('admission_date', 'ভর্তির তারিখ', 'date')}
    <h3>ছাত্র/ছাত্রীর তথ্য</h3>
    ${inp('name_bn', 'পূর্ণ নাম (বাংলা)', 'text', 'required')}${inp('name_en', 'পূর্ণ নাম (ইংরেজি, পাসপোর্ট অনুযায়ী)', 'text', 'required')}
    ${inp('dob', 'জন্ম তারিখ', 'date')}${sel('gender', 'লিঙ্গ', { '': '—', male: 'ছেলে', female: 'মেয়ে' })}
    ${inp('nid', 'NID / জন্ম নিবন্ধন নং')}${inp('passport_no', 'পাসপোর্ট নং')}
    ${inp('phone', 'মোবাইল / WhatsApp', 'tel', 'required')}${inp('email', 'ইমেইল', 'email')}
    ${inp('address_present', 'বর্তমান ঠিকানা', 'text', 'full')}${inp('address_permanent', 'স্থায়ী ঠিকানা', 'text', 'full')}
    ${inp('education', 'সর্বশেষ শিক্ষাগত যোগ্যতা ও পাসের সাল', 'text', 'full')}
    <h3>অভিভাবক</h3>
    ${inp('guardian_name', 'অভিভাবকের নাম')}${inp('guardian_relation', 'সম্পর্ক')}
    ${inp('guardian_phone', 'অভিভাবকের মোবাইল', 'tel')}
    <h3>কোর্স ও ফি</h3>
    ${sel('package', 'প্যাকেজ (ফি অনুযায়ী)', Object.fromEntries(PACKAGES.map(p => [p, p + ' — ' + tk(S.settings.fees[p])])))}
    ${sel('current_level', 'এখন কোন লেভেলের ক্লাসে', Object.fromEntries(LEVELS.map(l => [l, l])))}
    ${sel('batch', 'ব্যাচ', BATCH)}${inp('start_date', 'ক্লাস শুরুর তারিখ', 'date')}
    ${inp('total_fee', 'মোট ফি (৳)', 'number', 'min="0" step="1" required')}${inp('discount', 'ছাড় (৳)' + (isAdmin() ? '' : ' 🔒'), 'number', 'min="0" step="1"' + (isAdmin() ? '' : ' readonly title="ছাড় দিতে পারেন শুধু পরিচালক"'))}${inp('processing_fee', 'জাপান প্রসেসিং ফি (৳, না থাকলে খালি)' + (isAdmin() ? '' : ' 🔒'), 'number', 'min="0" step="1"' + (isAdmin() ? '' : ' readonly title="প্রসেসিং ফি ঠিক করেন শুধু পরিচালক"'))}${isAdmin() ? '' : '<p class="small muted full" style="margin:-4px 0 0">🔒 ছাড়, প্রসেসিং ফি আর প্যাকেজের দামের চেয়ে কম ফি — এগুলো শুধু পরিচালক ঠিক করতে পারেন।</p>'}
    ${inp('next_due_date', 'পরের কিস্তির তারিখ', 'date')}${sel('status', 'অবস্থা', STATUS)}
    <label class="f full">নোট<textarea name="notes">${esc(v.notes || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end"><a class="btn ghost" href="${s ? '#/student/' + s.id : '#/students'}">বাতিল</a><button class="btn" type="submit">${s ? 'সংরক্ষণ' : 'ভর্তি করুন'}</button></div>
  </form>`, () => {
    const f = $('#sf');
    f.package.onchange = () => { f.total_fee.value = S.settings.fees[f.package.value] || 0; const first = f.package.value.split('+')[0]; if (LEVELS.includes(first) && !s) f.current_level.value = first; };
    f.onsubmit = async (e) => {
      e.preventDefault(); const d = formData(f); d.total_fee = d.total_fee || 0; d.discount = d.discount || 0; d.processing_fee = d.processing_fee || 0;
      if (!isAdmin()) { d.discount = num(v.discount); d.processing_fee = num(v.processing_fee); const lp = num(S.settings.fees[d.package]); if ((!s || d.total_fee !== num(s.total_fee)) && lp && d.total_fee < lp) return toast(`মোট ফি প্যাকেজের দাম (${tk(lp)})-এর চেয়ে কম রাখতে পারেন শুধু পরিচালক`, true); }
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        const row = s ? await API.update('students', s.id, d) : await API.insert('students', d);
        putLocal('students', row);
        if (!s && lead) { try { putLocal('inquiries', await API.update('inquiries', lead.id, { status: 'joined', student_id: row.id })); } catch (err) { console.warn(err); } }
        toast(s ? 'সংরক্ষণ হয়েছে' : 'ভর্তি সম্পন্ন'); location.hash = '#/student/' + row.id;
      } catch (err) { toast(errMsg(err), true); btn.disabled = false; }
    };
  });
}

// ------------------------------------------------------------------ student profile
async function viewStudent(id, tab) {
  const s = byId(S.students, id);
  if (!s) return mount('#/students', '<div class="empty">ছাত্র পাওয়া যায়নি</div>');
  const smap = sessionMap(); const a = attOf(s.id, smap); const paid = paidOf(s.id); const due = dueOf(s);
  const TABS = isTeacher() ? [['info', 'তথ্য'], ['att', 'হাজিরা'], ['exams', 'পরীক্ষা'], ['mock', 'মক টেস্ট']] : [['info', 'তথ্য'], ['fees', 'ফি'], ['att', 'হাজিরা'], ['exams', 'পরীক্ষা'], ['mock', 'মক টেস্ট'], ['docs', 'কাগজপত্র'], ['japan', 'জাপান প্রসেস'], ...(isAdmin() ? [['hist', 'ইতিহাস']] : [])];
  if (isTeacher() && !TABS.some(([k]) => k === tab)) tab = 'info';
  let body = '';
  if (tab === 'info') {
    const kv = isTeacher() ? [['ভর্তি নম্বর', s.admission_no], ['ভর্তির তারিখ', fmtD(s.admission_date)], ['ইংরেজি নাম', s.name_en], ['লিঙ্গ', { male: 'ছেলে', female: 'মেয়ে' }[s.gender] || '—'], ['প্যাকেজ', s.package], ['এখনকার লেভেল', s.current_level], ['ব্যাচ', BATCH[s.batch]], ['ক্লাস শুরু', fmtD(s.start_date)], ['অবস্থা', STATUS[s.status]]] : [['ভর্তি নম্বর', s.admission_no], ['ভর্তির তারিখ', fmtD(s.admission_date)], ['ইংরেজি নাম', s.name_en], ['জন্ম তারিখ', fmtD(s.dob)], ['লিঙ্গ', { male: 'ছেলে', female: 'মেয়ে' }[s.gender] || '—'], ['NID / জন্ম নিবন্ধন', s.nid], ['পাসপোর্ট', s.passport_no], ['মোবাইল', s.phone], ['ইমেইল', s.email], ['বর্তমান ঠিকানা', s.address_present], ['স্থায়ী ঠিকানা', s.address_permanent], ['শিক্ষাগত যোগ্যতা', s.education], ['অভিভাবক', [s.guardian_name, s.guardian_relation && `(${s.guardian_relation})`].filter(Boolean).join(' ')], ['অভিভাবকের মোবাইল', s.guardian_phone], ['প্যাকেজ', s.package], ['লেভেল · ব্যাচ', s.current_level + ' · ' + (BATCH[s.batch] || '')], ['ক্লাস শুরু', fmtD(s.start_date)], ['নোট', s.notes]];
    body = `<div class="card"><dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl></div>`;
  }
  if (tab === 'fees') {
    const pays = S.payments.filter(p => p.student_id === s.id).sort((x, y) => (y.paid_on || '').localeCompare(x.paid_on || ''));
    body = `<div class="grid g4"><div class="card stat"><div class="l">মোট ফি</div><div class="v">${tk(s.total_fee)}</div></div><div class="card stat"><div class="l">ছাড়</div><div class="v">${tk(s.discount)}</div></div><div class="card stat green"><div class="l">পরিশোধিত</div><div class="v">${tk(paid)}</div></div><div class="card stat red"><div class="l">বকেয়া</div><div class="v">${tk(due)}</div><div class="s">${s.next_due_date ? 'পরের কিস্তি ' + fmtD(s.next_due_date) : ''}</div></div></div>
    ${num(s.processing_fee) || procPaidOf(s.id) ? `<div class="card" style="margin-top:14px;padding:12px 16px"><div class="row"><b>জাপান প্রসেসিং ফি</b><span class="spacer"></span><span>চুক্তি ${tk(s.processing_fee)} · পেয়েছি ${tk(procPaidOf(s.id))} · ${procDueOf(s) ? `<b style="color:var(--red)">বাকি ${tk(procDueOf(s))}</b>` : badge('paid', 'পরিশোধিত')}</span></div></div>` : ''}
    <div class="row" style="margin:14px 0"><h2 style="margin:0;font:700 17px 'Noto Serif Bengali';color:var(--navy)">পরিশোধের তালিকা</h2><span class="spacer"></span>${due ? waBtn(guardianPhone(s), dueMsg(s), 'বকেয়ার রিমাইন্ডার') : ''}<button class="btn gold" id="addpay">+ টাকা জমা</button></div>
    <div class="tw">${pays.length ? `<table class="stack"><tr><th>তারিখ</th><th>রশিদ নং</th><th>বাবদ</th><th>মাধ্যম</th><th class="num">টাকা</th><th></th></tr>${pays.map(p => `<tr><td data-l="তারিখ">${fmtD(p.paid_on)}</td><td data-l="রশিদ নং">${esc(p.receipt_no)}</td><td data-l="বাবদ">${esc(PURPOSE[p.purpose] || p.purpose)}</td><td data-l="মাধ্যম">${esc(METHOD[p.method] || p.method)}${p.trx_id ? ` · ${esc(p.trx_id)}` : ''}</td><td class="num" data-l="টাকা"><b>${tk(p.amount)}</b></td><td class="num" data-l=""><button class="btn sm ghost" data-rc="${p.id}">রশিদ প্রিন্ট</button></td></tr>`).join('')}</table>` : '<div class="empty">এখনো কোনো টাকা জমা হয়নি</div>'}</div>`;
  }
  if (tab === 'att') {
    const recs = S.attendance.filter(r => r.student_id === s.id && smap.has(r.session_id)).map(r => ({ r, ss: smap.get(r.session_id) })).sort((x, y) => y.ss.class_date.localeCompare(x.ss.class_date));
    body = `<div class="grid g4"><div class="card stat"><div class="l">মোট শিক্ষার ঘণ্টা</div><div class="v">${a.hours}</div><div class="s">${Object.entries(a.byLevel).map(([l, h]) => l + ': ' + h).join(' · ') || '—'}</div></div><div class="card stat ${a.pct != null && a.pct < 80 ? 'red' : 'green'}"><div class="l">উপস্থিতির হার</div><div class="v">${a.pct == null ? '—' : a.pct + '%'}</div><div class="s">${a.came} / ${a.total} ক্লাস</div></div><div class="card stat"><div class="l">প্রথম ক্লাস</div><div class="v" style="font-size:20px">${fmtD(a.first)}</div></div><div class="card stat"><div class="l">শেষ ক্লাস</div><div class="v" style="font-size:20px">${fmtD(a.last)}</div></div></div>
    <div class="row" style="margin:14px 0"><span class="spacer"></span><button class="btn gold" id="cert" ${a.hours ? '' : 'disabled'}>স্টাডি-আওয়ার সার্টিফিকেট প্রিন্ট</button></div>
    <div class="tw">${recs.length ? `<table><tr><th>তারিখ</th><th>লেভেল · ব্যাচ</th><th>বিষয়</th><th>অবস্থা</th><th class="num">ঘণ্টা</th></tr>${recs.map(({ r, ss }) => `<tr><td>${fmtD(ss.class_date)}</td><td>${esc(ss.level)} · ${esc(BATCH[ss.batch] || '')}</td><td>${esc(ss.topic || '—')}</td><td>${esc(ATT[r.status])}</td><td class="num">${r.status === 'present' || r.status === 'late' ? num(ss.hours) : 0}</td></tr>`).join('')}</table>` : '<div class="empty">এখনো কোনো হাজিরা নেই</div>'}</div>`;
  }
  if (tab === 'docs') {
    const docs = new Map(S.documents.filter(d => d.student_id === s.id).map(d => [d.doc_type, d]));
    const done = DOC_TYPES.filter(([k]) => docs.get(k) && docs.get(k).status !== 'missing').length;
    body = `<div class="card" style="margin-bottom:14px"><div class="row"><b>${done} / ${DOC_TYPES.length}</b> <span class="muted">কাগজ জমা হয়েছে</span><span class="spacer"></span>${[...docs.values()].some(x => x.file_path) ? '<button class="btn sm ghost" id="dzip">⬇ সব কাগজ ZIP</button>' : ''}<div class="bar" style="width:200px"><i style="width:${Math.round(done * 100 / DOC_TYPES.length)}%"></i></div></div></div>
    <div class="tw"><table><tr><th>কাগজ</th><th>অবস্থা</th><th>ফাইল</th><th class="hide-m">নোট</th></tr>${DOC_TYPES.map(([k, l]) => { const d = docs.get(k) || { status: 'missing' }; const al = docAlertFor(s, k); const dd = DOC_DATE[k]; return `<tr data-doc="${k}"><td><b>${l}</b>${d.student_upload_at ? `<div class="small" style="color:var(--navy)">📱 ছাত্র নিজে দিয়েছে · ${fmtDT(d.student_upload_at)}</div>` : ''}${d.feedback && d.status === 'missing' ? `<div class="small" style="color:var(--red)">↩ ফেরত পাঠানো: ${esc(d.feedback)}</div>` : ''}${dd ? `<label class="small muted ddt">${dd[1]} <input type="date" data-dt="${dd[0]}" value="${esc(d[dd[0]] || '')}"></label>` : ''}${al ? `<div style="margin-top:4px">${badge(al.level === 'red' ? 'due' : 'trial', al.issue)}</div>` : ''}</td><td><select data-dst>${Object.entries(DOC_STATUS).map(([sk, sl]) => `<option value="${sk}" ${d.status === sk ? 'selected' : ''}>${sl}</option>`).join('')}</select></td><td><div class="row" style="gap:6px">${d.file_path ? `<button class="btn sm ghost" data-view="${esc(d.file_path)}">দেখুন</button>` : ''}${d.file_path && d.status === 'received' && d.id ? `<button class="btn sm ghost" data-ret="${d.id}" title="ছাত্রকে আবার দিতে বলুন" style="color:var(--red)">↩</button>` : ''}<label class="btn sm ghost" style="cursor:pointer">${d.file_path ? 'বদলান' : 'আপলোড'}<input type="file" data-up accept="image/*,application/pdf" hidden></label></div></td><td class="hide-m"><input data-note value="${esc(d.note || '')}" placeholder="নোট" style="width:100%"></td></tr>`; }).join('')}</table></div>
    <p class="small muted">ছবি বা PDF আপলোড করা যায়। ফাইল সুরক্ষিত থাকে, শুধু স্টাফরা লগইন করে দেখতে পারেন।</p>`;
  }
  if (tab === 'exams') {
    const res = studentResults(s.id); const taken = res.filter(x => pctOf(x.r, x.ex) != null);
    const avg = taken.length ? Math.round(taken.reduce((a, x) => a + pctOf(x.r, x.ex), 0) / taken.length) : null;
    const best = taken.length ? Math.max(...taken.map(x => pctOf(x.r, x.ex))) : null;
    const W = 640, H = 160, pts = taken.map((x, i) => [taken.length === 1 ? W / 2 : 56 + i * (W - 80) / (taken.length - 1), 10 + (100 - pctOf(x.r, x.ex)) / 100 * H]);
    const chart = taken.length >= 2 ? `<svg viewBox="0 0 ${W} ${H + 34}" width="100%" role="img" aria-label="রেজাল্টের ধারা">${[0, 50, 80, 100].map(v => `<line x1="44" x2="${W}" y1="${10 + (100 - v) / 100 * H}" y2="${10 + (100 - v) / 100 * H}" stroke="${v === 80 ? '#C9A95C' : '#E3D8C3'}" stroke-dasharray="${v === 80 ? '5 4' : ''}"/><text x="38" y="${14 + (100 - v) / 100 * H}" text-anchor="end" font-size="11" fill="#6E665A">${v}%</text>`).join('')}<polyline fill="none" stroke="#1B2945" stroke-width="2.5" points="${pts.map(p => p.join(',')).join(' ')}"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${passed(taken[i].r, taken[i].ex) ? '#2E7D4F' : '#C8372B'}"><title>${esc(taken[i].ex.title)}: ${pctOf(taken[i].r, taken[i].ex)}%</title></circle>`).join('')}<text x="${W}" y="${H + 28}" text-anchor="end" font-size="10.5" fill="#6E665A">সোনালি দাগ = ৮০% · সবুজ = পাস · লাল = পাস করেনি</text></svg>` : '';
    body = `<div class="grid g3"><div class="card stat"><div class="l">মোট পরীক্ষা</div><div class="v">${res.length}</div><div class="s">${res.length - taken.length ? (res.length - taken.length) + 'টিতে অনুপস্থিত' : ''}</div></div><div class="card stat ${avg != null && avg < 60 ? 'red' : 'green'}"><div class="l">গড় নম্বর</div><div class="v">${avg == null ? '—' : avg + '%'}</div></div><div class="card stat"><div class="l">সর্বোচ্চ</div><div class="v">${best == null ? '—' : best + '%'}</div></div></div>
    ${chart ? `<div class="card" style="margin-top:14px"><h2>উন্নতির ধারা</h2>${chart}</div>` : ''}
    <div class="row" style="margin:14px 0"><span class="spacer"></span><button class="btn gold" id="tr" ${res.length ? '' : 'disabled'}>成績証明書 (রেজাল্ট সার্টিফিকেট) প্রিন্ট</button></div>
    <div class="tw">${res.length ? `<table class="stack"><tr><th>তারিখ</th><th>পরীক্ষা</th><th class="num">নম্বর</th><th class="num">%</th><th>ফল</th><th></th></tr>${[...res].reverse().map(({ r, ex }) => `<tr class="click" data-go="#/exam/${ex.id}"><td data-l="তারিখ">${fmtD(ex.exam_date)}</td><td data-l="পরীক্ষা"><b>${esc(ex.title)}</b><div class="small muted">${esc(EXAM_TYPE[ex.type] || ex.type)} · ${esc(ex.level)}</div></td><td class="num" data-l="নম্বর">${r.absent ? '—' : num(r.marks) + ' / ' + num(ex.max_marks)}</td><td class="num" data-l="%">${pctOf(r, ex) == null ? '—' : pctOf(r, ex) + '%'}</td><td data-l="ফল">${r.absent ? badge('dropped', 'অনুপস্থিত') : passed(r, ex) ? badge('active', 'পাস') : badge('due', 'পাস করেনি')}</td><td class="num" data-l="">${waBtn(guardianPhone(s), resultMsg(s, ex, r), '')}</td></tr>`).join('')}</table>` : '<div class="empty">এখনো কোনো পরীক্ষার নম্বর নেই। "পরীক্ষা ও রেজাল্ট" পাতা থেকে নম্বর তুলুন।</div>'}</div>`;
  }
  if (tab === 'japan') {
    const idx = JSTAGES.findIndex(([k]) => k === (s.japan_stage || 'none'));
    const jmiss = jpInfoChecklist(s, s.japan_info || {});
    body = `<div class="card" style="margin-bottom:14px"><div class="row"><div><h2 style="margin:0">আবেদনের কাগজ</h2><p class="small muted" style="margin:4px 0 0">入学願書 · 履歴書 · 経費支弁書 — ${jmiss.length ? `<span style="color:var(--red)">${jmiss.length}টি তথ্য বাকি</span>` : '<span style="color:var(--green)">তথ্য সম্পূর্ণ</span>'}</p></div><span class="spacer"></span><a class="btn gold" href="#/student/${s.id}/jp">তথ্য পূরণ ও প্রিন্ট</a></div></div>
    <div class="card"><h2>জাপানে আবেদনের ধাপ</h2><div class="steps">${JSTAGES.slice(1).map(([k, l], i) => `<span class="${i + 1 < idx ? 'done' : i + 1 === idx ? 'cur' : ''}">${i + 1}. ${l}</span>`).join('')}</div>
    <form class="form" id="jf" style="margin-top:16px"><label class="f">বর্তমান ধাপ<select name="japan_stage">${JSTAGES.map(([k, l]) => `<option value="${k}" ${k === (s.japan_stage || 'none') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">লক্ষ্য সেশন (যেমন 2027-04)<input name="intake" value="${esc(s.intake || '')}" placeholder="2027-04"></label>
    <label class="f full">জাপানের স্কুল<input name="target_school" value="${esc(s.target_school || '')}" placeholder="যেমন 春日日本語学院"></label>
    <div class="full row" style="justify-content:flex-end"><button class="btn">সংরক্ষণ</button></div></form></div>
    <div class="row" style="margin:16px 0 10px"><h2 style="margin:0;font:700 17px 'Noto Serif Bengali';color:var(--navy)">স্কুলে আবেদন</h2><span class="spacer"></span><button class="btn gold" id="napp">+ নতুন আবেদন</button></div>
    <div class="tw">${(() => { const ap = S.applications.filter(x => x.student_id === s.id).sort((x, y) => (y.intake || '').localeCompare(x.intake || '')); return ap.length ? appRows(ap, { showStudent: false }) : '<div class="empty">এখনো কোনো স্কুলে আবেদন হয়নি</div>'; })()}</div>`;
  }
  if (tab === 'mock') body = mockRecordHtml(s);
  if (tab === 'hist') body = '<div id="histbox"><div class="empty">লোড হচ্ছে…</div></div>';
  const photo = S.documents.find(d => d.student_id === s.id && d.doc_type === 'photo' && d.file_path);
  mount('#/students', `
  <div class="top"><div class="phead"><label class="avatar avup" id="avl" title="${isTeacher() ? '' : 'ছবি দিন / বদলান'}"><span id="av">${esc(initials(s))}</span>${isTeacher() ? '' : '<i class="avcam">📷</i><input type="file" id="avfile" accept="image/*" hidden>'}</label><div><h1>${esc(s.name_bn || s.name_en)}</h1><p>${esc(s.name_en)} · ${esc(s.admission_no)} · ${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</p><div class="row" style="margin-top:4px">${badge(s.status, STATUS[s.status])}${isTeacher() ? '' : due ? badge('due', 'বকেয়া ' + tk(due)) : badge('paid', 'ফি পরিশোধিত')}</div></div></div>
  <div class="row no-print">${isTeacher() ? '' : `${waBtn(guardianPhone(s), `আসসালামু আলাইকুম। ${S.settings.institute_bn} থেকে বলছি। `, 'অভিভাবক')}<button class="btn ghost" id="plink">অভিভাবকের লিংক${s.parent_token ? ' ✓' : ''}</button><button class="btn ghost" id="ssite">ছাত্রদের সাইট${s.auth_user_id ? ' ✓' : ''}</button>${isAdmin() ? '<button class="btn ghost" id="idc">আইডি কার্ড</button>' : ''}<button class="btn ghost" id="dos">📄 সম্পূর্ণ ফাইল</button><button class="btn ghost" id="certs">🎓 সার্টিফিকেট</button><a class="btn" href="#/student/${s.id}/edit">✏️ সম্পাদনা</a>${isAdmin() ? '<button class="btn ghost" id="del" style="color:var(--red);border-color:var(--red)">মুছুন</button>' : ''}`}</div></div>
  <div class="tabs">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`, () => {
    $$('[data-tab]').forEach(b => b.onclick = () => { location.hash = `#/student/${s.id}?t=${b.dataset.tab}`; });
    const pms = $('#pms'); if (pms) pms.onclick = () => printMockSheet(s);
    if (tab === 'mock') { bindGo(); $$('[data-mcert]').forEach(b => b.onclick = () => printMockCertificate(s, b.dataset.mcert)); }
    const dos = $('#dos'); if (dos) dos.onclick = () => printDossier(s);
    const certs = $('#certs'); if (certs) certs.onclick = () => certListModal(s);
    if ($('#plink')) { const ic = $('#idc'); if (ic) ic.onclick = () => printIdCards([s]); $('#plink').onclick = () => parentLinkModal(s); $('#ssite').onclick = () => studentSiteModal(s); }
    if (tab === 'hist') API.auditList({ student: s.id, from: '2020-01-01', to: todayISO(), limit: 300 }).then(r => { const box = $('#histbox'); if (box) box.innerHTML = r.rows.length ? `<div class="tw">${audRows(r.rows)}</div><p class="small muted" style="margin-top:8px">এই ছাত্রের তথ্য, টাকা জমা, কাগজ, আবেদন আর নম্বরে যা যা যোগ, বদল বা মোছা হয়েছে।</p>` : '<div class="empty">এখনো কোনো রেকর্ড নেই</div>'; }).catch(e => { const box = $('#histbox'); if (box) box.innerHTML = `<div class="empty">${/audit_log|does not exist|schema cache/i.test(e.message || '') ? 'কাজের রেকর্ডের টেবিল এখনো তৈরি হয়নি।' : esc(errMsg(e))}</div>`; });
    if (photo) API.fileUrl(photo.file_path).then(u => { if (u) $('#av').innerHTML = `<img alt="" src="${esc(u)}">`; }).catch(() => {});
    const avf = $('#avfile'); if (avf) avf.onchange = async (e) => {   // the student's photo: made small and square-ish, saved as the "পাসপোর্ট সাইজ ছবি" paper
      const f = e.target.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('ছবির ফাইল দিন', true);
      toast('ছবি আপলোড হচ্ছে…');
      try {
        const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(f)); const k = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
        const path = await API.upload(`${s.id}/photo-${Date.now()}.jpg`, new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
        const ex = S.documents.find(d => d.student_id === s.id && d.doc_type === 'photo');
        const row = ex ? await API.update('documents', ex.id, { file_path: path, status: 'verified', feedback: '', updated_at: new Date().toISOString() }) : await API.insert('documents', { student_id: s.id, doc_type: 'photo', status: 'verified', file_path: path });
        putLocal('documents', row); toast('ছবি যোগ হয়েছে ✓'); render();
      } catch (err) { toast(errMsg(err), true); }
    };
    const del = $('#del'); if (del) del.onclick = async () => {
      if (S.payments.some(p => p.student_id === s.id)) return toast('এই ছাত্রের টাকা জমার রেকর্ড আছে, তাই মোছা যাবে না। অবস্থা "বাদ দিয়েছে" করে দিন।', true);
      if (!(await confirmBox(`${studentName(s)}-এর সব তথ্য, হাজিরা ও কাগজপত্র মুছে যাবে।`))) return;
      try { await API.remove('students', s.id); S.students = S.students.filter(x => x.id !== s.id); S.attendance = S.attendance.filter(x => x.student_id !== s.id); S.documents = S.documents.filter(x => x.student_id !== s.id); S.applications = S.applications.filter(x => x.student_id !== s.id); toast('মুছে ফেলা হয়েছে'); location.hash = '#/students'; } catch (e) { toast(errMsg(e), true); }
    };
    if (tab === 'fees') { $('#addpay').onclick = () => paymentModal(s.id); $$('[data-rc]').forEach(b => b.onclick = () => printReceipt(byId(S.payments, b.dataset.rc))); }
    if (tab === 'att') { const c = $('#cert'); if (c) c.onclick = () => printCertificate(s); }
    if (tab === 'exams') { bindGo(); const t = $('#tr'); if (t) t.onclick = () => printTranscript(s); }
    if (tab === 'japan') { $('#napp').onclick = () => appModal(null, { student_id: s.id, intake: s.intake || undefined }); bindApps(); }
    if (tab === 'japan') $('#jf').onsubmit = async (e) => { e.preventDefault(); try { putLocal('students', await API.update('students', s.id, formData(e.target))); toast('সংরক্ষণ হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); } };
    if (tab === 'docs') {
      const saveDoc = async (k, patch) => {
        const ex = S.documents.find(d => d.student_id === s.id && d.doc_type === k);
        const row = ex ? await API.update('documents', ex.id, { ...patch, updated_at: new Date().toISOString() }) : await API.insert('documents', { student_id: s.id, doc_type: k, status: 'missing', ...patch });
        putLocal('documents', row); return row;
      };
      const z = $('#dzip'); if (z) z.onclick = () => downloadDocsZip(s);
      $$('tr[data-doc]').forEach(tr => {
        const k = tr.dataset.doc;
        $('[data-dst]', tr).onchange = async (e) => { try { await saveDoc(k, { status: e.target.value }); toast('আপডেট হয়েছে'); } catch (err) { toast(errMsg(err), true); } };
        const dt = $('[data-dt]', tr); if (dt) dt.onchange = async (e) => { try { await saveDoc(k, { [dt.dataset.dt]: e.target.value || null }); toast('তারিখ সংরক্ষণ হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); } };
        $('[data-note]', tr).onchange = async (e) => { try { await saveDoc(k, { note: e.target.value.trim() }); toast('নোট সংরক্ষণ হয়েছে'); } catch (err) { toast(errMsg(err), true); } };
        $('[data-up]', tr).onchange = async (e) => {
          const file = e.target.files[0]; if (!file) return;
          if (file.size > 10e6) return toast('ফাইল ১০ MB-এর চেয়ে ছোট হতে হবে', true);
          toast('আপলোড হচ্ছে…');
          try {
            const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
            const path = await API.upload(`${s.id}/${k}-${Date.now()}.${ext}`, file);
            const cur = S.documents.find(d => d.student_id === s.id && d.doc_type === k);
            await saveDoc(k, { file_path: path, status: cur && cur.status === 'verified' ? 'verified' : 'received' });
            toast('আপলোড হয়েছে'); render();
          } catch (err) { toast(errMsg(err), true); }
        };
        const rt = $('[data-ret]', tr); if (rt) rt.onclick = () => docReturnModal(byId(S.documents, rt.dataset.ret));
        const v = $('[data-view]', tr); if (v) v.onclick = async () => { try { const u = await API.fileUrl(v.dataset.view); const w = window.open(); if (w) { w.opener = null; w.location = u; } } catch (err) { toast(errMsg(err), true); } };
      });
    }
  });
}

// ------------------------------------------------------------------ payments
function paymentModal(studentId, preset = null, onSaved = null) {
  const opts = S.students.filter(s => s.status !== 'dropped').sort((a, b) => (a.admission_no || '').localeCompare(b.admission_no || ''));
  if (!opts.length) return toast('আগে একজন ছাত্র ভর্তি করুন', true);
  const pre = studentId ? byId(S.students, studentId) : null;
  openModal(`<h2>টাকা জমা</h2><form class="form" id="pf">
    <label class="f full">ছাত্র<select name="student_id" required>${studentId ? '' : '<option value="">— বাছাই করুন —</option>'}${opts.map(s => `<option value="${s.id}" ${s.id === studentId ? 'selected' : ''}>${esc(s.admission_no)} · ${esc(studentName(s))} (বকেয়া ${tk(dueOf(s))})</option>`).join('')}</select></label>
    <label class="f">টাকার পরিমাণ (৳)<input name="amount" type="number" min="1" step="1" required value="${preset ? esc(preset.amount) : pre && dueOf(pre) ? dueOf(pre) : ''}"></label>
    <label class="f">তারিখ<input name="paid_on" type="date" required value="${esc((preset && preset.paid_on) || todayISO())}"></label>
    <label class="f">মাধ্যম<select name="method">${Object.entries(METHOD).map(([k, l]) => `<option value="${k}" ${preset && preset.method === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">ট্রানজেকশন আইডি (বিকাশ/নগদ/ব্যাংক)<input name="trx_id" value="${esc((preset && preset.trx_id) || '')}"></label>
    <label class="f">বাবদ<select name="purpose">${Object.entries(PURPOSE).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label class="f">পরের কিস্তির তারিখ (যদি থাকে)<input name="next_due_date" type="date" value="${pre && pre.next_due_date ? esc(pre.next_due_date) : ''}"></label>
    <label class="f full">নোট<input name="note" value="${esc((preset && preset.note) || '')}"></label>
    <p class="full small muted" style="margin:0">রশিদ নম্বর নিজে থেকে বসবে। ভুল হলে শুধু অ্যাডমিন ঠিক করতে পারবেন।</p>
    <div class="full row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="pc">বাতিল</button><button class="btn gold" type="submit">জমা করুন ও রশিদ</button></div></form>`);
  $('#pc').onclick = closeModal;
  const f = $('#pf');
  const sugg = () => { const s = byId(S.students, f.student_id.value); if (s) { const d = f.purpose.value === 'processing' ? procDueOf(s) : dueOf(s); f.amount.value = d || ''; } };
  f.student_id.onchange = () => { const s = byId(S.students, f.student_id.value); if (s) { sugg(); f.next_due_date.value = s.next_due_date || ''; } };
  f.purpose.onchange = sugg;
  f.onsubmit = async (e) => {
    e.preventDefault(); const d = formData(f); const next = d.next_due_date; delete d.next_due_date;
    if (!d.student_id) return toast('ছাত্র বাছাই করুন', true);
    if (!(d.amount > 0)) return toast('সঠিক টাকার পরিমাণ দিন', true);
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      let row; for (let i = 0; i < 3; i++) { try { row = await API.insert('payments', { ...d, receipt_no: nextReceiptNo() }); break; } catch (err) { if (!/duplicate|unique/i.test(errMsg(err) + err.message) || i === 2) throw err; S.payments = await API.fetchAll('payments'); } }
      putLocal('payments', row);
      const st = byId(S.students, d.student_id);
      const patch = {}; if ((next || null) !== (st.next_due_date || null)) patch.next_due_date = next || null; if (st.status === 'trial') patch.status = 'active';
      if (Object.keys(patch).length) putLocal('students', await API.update('students', st.id, patch));
      if (onSaved) { try { await onSaved(row); } catch (err) { console.warn(err); } }
      closeModal(); toast('জমা হয়েছে · ' + row.receipt_no); render(); printReceipt(row);
    } catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}
function viewPayments(q) {
  const m = q.get('m') || monthISO();
  const list = S.payments.filter(p => (p.paid_on || '').startsWith(m)).sort((a, b) => (b.paid_on + b.receipt_no).localeCompare(a.paid_on + a.receipt_no));
  const total = list.reduce((a, p) => a + num(p.amount), 0);
  const byMethod = {}; list.forEach(p => { byMethod[p.method] = (byMethod[p.method] || 0) + num(p.amount); });
  mount('#/payments', `
  <div class="top"><div><h1>ফি ও হিসাব</h1><p>মাস অনুযায়ী সব জমা</p></div><div class="row"><input type="month" id="mon" value="${esc(m)}"><button class="btn ghost" id="csv">CSV ডাউনলোড</button><button class="btn gold" id="np">+ টাকা জমা</button></div></div>
  <div class="grid g4" style="margin-bottom:16px"><div class="card stat green"><div class="l">এ মাসে মোট</div><div class="v">${tk(total)}</div><div class="s">${list.length}টি রশিদ</div></div>${[['cash', 'ক্যাশ'], ['bkash', 'বিকাশ'], ['nagad', 'নগদ / ব্যাংক']].map(([k, l]) => `<div class="card stat"><div class="l">${l}</div><div class="v" style="font-size:20px">${tk((byMethod[k] || 0) + (k === 'nagad' ? (byMethod.bank || 0) : 0))}</div></div>`).join('')}</div>
  <div class="tw">${list.length ? `<table class="stack"><tr><th>তারিখ</th><th>রশিদ নং</th><th>ছাত্র</th><th class="hide-m">বাবদ</th><th>মাধ্যম</th><th class="num">টাকা</th><th></th></tr>${list.map(p => { const s = byId(S.students, p.student_id); return `<tr><td data-l="ছাত্র" class="mt2"><a href="#/student/${p.student_id}?t=fees">${esc(studentName(s))}</a></td><td data-l="তারিখ">${fmtD(p.paid_on)}</td><td data-l="রশিদ নং">${esc(p.receipt_no)}</td><td class="dm"><a href="#/student/${p.student_id}?t=fees">${esc(studentName(s))}</a></td><td class="hide-m">${esc(PURPOSE[p.purpose] || p.purpose)}</td><td data-l="মাধ্যম">${esc(METHOD[p.method] || p.method)}</td><td class="num" data-l="টাকা"><b>${tk(p.amount)}</b></td><td class="num" data-l=""><button class="btn sm ghost" data-rc="${p.id}">রশিদ</button>${isAdmin() ? ` <button class="btn sm ghost" data-dp="${p.id}" style="color:var(--red)">মুছুন</button>` : ''}</td></tr>`; }).join('')}<tr><td colspan="5" data-l="" class="dm"><b>মোট</b></td><td class="num" data-l="মোট"><b>${tk(total)}</b></td><td class="dm"></td></tr></table>` : '<div class="empty">এই মাসে কোনো জমা নেই</div>'}</div>`, () => {
    $('#mon').onchange = (e) => { location.hash = '#/payments?m=' + e.target.value; };
    $('#np').onclick = () => paymentModal(null);
    $('#csv').onclick = () => csvDownload(`sakura-payments-${m}.csv`, [['Date', 'Receipt', 'Admission no', 'Student', 'Purpose', 'Method', 'TrxID', 'Amount'], ...list.map(p => { const s = byId(S.students, p.student_id) || {}; return [p.paid_on, p.receipt_no, s.admission_no, s.name_en || s.name_bn, PURPOSE[p.purpose], METHOD[p.method], p.trx_id, p.amount]; })]);
    $$('[data-rc]').forEach(b => b.onclick = () => printReceipt(byId(S.payments, b.dataset.rc)));
    $$('[data-dp]').forEach(b => b.onclick = async () => { const p = byId(S.payments, b.dataset.dp); if (!(await confirmBox(`রশিদ ${p.receipt_no} (${tk(p.amount)}) মুছে যাবে।`))) return; try { await API.remove('payments', p.id); S.payments = S.payments.filter(x => x.id !== p.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } });
  });
}

// ------------------------------------------------------------------ attendance
function viewAttendance(q) {
  const date = q.get('d') || todayISO(); const level = q.get('l') || 'N5'; const batch = q.get('b') || 'morning';
  const session = S.sessions.find(s => s.class_date === date && s.level === level && s.batch === batch);
  const marks = new Map(session ? S.attendance.filter(a => a.session_id === session.id).map(a => [a.student_id, a.status]) : []);
  const roster = S.students.filter(s => (s.current_level === level && s.batch === batch && (s.status === 'active' || s.status === 'trial')) || marks.has(s.id)).sort((a, b) => (a.name_en || '').localeCompare(b.name_en || ''));
  const prevCount = S.sessions.filter(s => s.level === level && s.batch === batch && s.class_date < date).length;
  const recent = [...S.sessions].sort((a, b) => b.class_date.localeCompare(a.class_date)).slice(0, 12);
  const sel = (id, opts, cur) => `<select id="${id}">${Object.entries(opts).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  mount('#/attendance', `
  <div class="top"><div><h1>হাজিরা</h1><p>${session ? 'এই ক্লাসের হাজিরা নেওয়া হয়েছে, চাইলে বদলাতে পারেন' : 'নতুন ক্লাসের হাজিরা'}</p></div></div>
  ${(() => { const di = dayInfo(date, batch); return di.off ? `<div class="alertbar" style="margin-bottom:14px"><b>এই দিন ছুটি</b><span>${esc(di.why)} — তবুও ক্লাস হয়ে থাকলে হাজিরা নিতে পারেন।</span></div>` : ''; })()}
  <div class="card row" style="margin-bottom:14px;padding:12px"><input type="date" id="ad" value="${esc(date)}">${sel('al', Object.fromEntries(LEVELS.map(l => [l, l])), level)}${sel('ab', BATCH, batch)}</div>
  <form id="atf"><div class="card form" style="margin-bottom:14px">
    <label class="f">ক্লাস নম্বর<input name="class_no" type="number" min="1" value="${esc(session ? session.class_no ?? '' : prevCount + 1)}"></label>
    <label class="f">ঘণ্টা<input name="hours" type="number" min="0.5" step="0.5" value="${esc(session ? session.hours : S.settings.hours_per_class)}" required></label>
    <label class="f">আজকের পাঠ / বিষয়<input name="topic" value="${esc(session ? session.topic : '')}" placeholder="যেমন: পাঠ ৩ — ここ／そこ"></label>
    ${(() => { const act = S.teachers.filter(t => t.active !== false || (session && session.teacher_id === t.id)).sort((a, b) => (a.name || '').localeCompare(b.name || '')); if (!act.length) return `<label class="f">শিক্ষক<input name="teacher" value="${esc(session ? session.teacher : '')}" placeholder="শিক্ষক ও বেতন পাতায় শিক্ষক যোগ করলে এখানে বেছে নেওয়া যাবে"></label>`; const prev = [...S.sessions].filter(x => x.level === level && x.batch === batch && x.teacher_id && x.class_date <= date).sort((a, b) => b.class_date.localeCompare(a.class_date))[0]; const cur = session ? session.teacher_id : prev && prev.teacher_id; return `<label class="f">শিক্ষক<select name="teacher_id"><option value="">— বেছে নিন —</option>${act.map(t => `<option value="${t.id}" ${cur === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>`; })()}
  </div>
  <div class="row" style="margin-bottom:10px"><b>${roster.length} জন</b><span class="spacer"></span><button type="button" class="btn sm ghost" id="allp">সবাই উপস্থিত</button></div>
  <div class="tw">${roster.length ? `<table class="stack att-m"><tr><th>ছাত্র</th><th>হাজিরা</th></tr>${roster.map(s => { const st = marks.get(s.id) || ''; return `<tr data-sid="${s.id}"><td data-l=""><b>${esc(s.name_bn || s.name_en)}</b><div class="small muted">${esc(s.admission_no)} · ${esc(s.name_en)}</div></td><td data-l=""><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="mk">${Object.entries(ATT).map(([k, l]) => `<button type="button" data-st="${k}" class="${k} ${st === k ? 'on' : ''}">${l}</button>`).join('')}</div>${st === 'absent' ? waBtn(guardianPhone(s), absentMsg(s, date, attOf(s.id)), '') : ''}</div></td></tr>`; }).join('')}</table>` : `<div class="empty">${level} · ${BATCH[batch]} ব্যাচে কোনো চলমান ছাত্র নেই</div>`}</div>
  ${roster.length ? '<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" type="submit">হাজিরা সংরক্ষণ</button></div>' : ''}</form>
  <div class="card" style="margin-top:22px"><h2>সাম্প্রতিক ক্লাস</h2>${recent.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>লেভেল · ব্যাচ</th><th class="hide-m">বিষয়</th><th>উপস্থিত</th></tr>${recent.map(ss => { const r = S.attendance.filter(a => a.session_id === ss.id); const c = r.filter(a => a.status === 'present' || a.status === 'late').length; return `<tr class="click" data-go="#/attendance?d=${ss.class_date}&l=${ss.level}&b=${ss.batch}"><td>${fmtD(ss.class_date)}</td><td>${esc(ss.level)} · ${esc(BATCH[ss.batch])}</td><td class="hide-m">${esc(ss.topic || '—')}</td><td>${c} / ${r.length}</td></tr>`; }).join('')}</table></div>` : '<div class="empty">এখনো কোনো ক্লাস নেই</div>'}</div>`, () => {
    const go = () => { location.hash = `#/attendance?d=${$('#ad').value}&l=${$('#al').value}&b=${$('#ab').value}`; };
    ['#ad', '#al', '#ab'].forEach(id => { $(id).onchange = go; });
    $$('.mk button').forEach(b => b.onclick = () => { $$('button', b.parentNode).forEach(x => x.classList.remove('on')); b.classList.add('on'); });
    const allp = $('#allp'); if (allp) allp.onclick = () => $$('tr[data-sid]').forEach(tr => { $$('.mk button', tr).forEach(x => x.classList.toggle('on', x.dataset.st === 'present')); });
    bindGo();
    $('#atf').onsubmit = async (e) => {
      e.preventDefault();
      const rows = $$('tr[data-sid]').map(tr => ({ student_id: tr.dataset.sid, status: ($('.mk button.on', tr) || {}).dataset?.st })).filter(r => r.status);
      const unmarked = $$('tr[data-sid]').length - rows.length;
      if (!rows.length) return toast('অন্তত একজনের হাজিরা দিন', true);
      if (unmarked && !(await confirmBox(`${unmarked} জনের হাজিরা দেওয়া হয়নি। তাদের বাদ দিয়ে সংরক্ষণ করবেন?`, 'হ্যাঁ, সংরক্ষণ'))) return;
      const d = formData(e.target); const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        const meta = { class_no: d.class_no || null, hours: d.hours || S.settings.hours_per_class, topic: d.topic };
        if ('teacher_id' in d) { meta.teacher_id = d.teacher_id || null; const tt = byId(S.teachers, d.teacher_id); meta.teacher = tt ? tt.name : ''; } else meta.teacher = d.teacher;
        const ss = session ? await API.update('sessions', session.id, meta) : await API.insert('sessions', { class_date: date, level, batch, ...meta });
        putLocal('sessions', ss);
        const saved = await API.upsertAttendance(rows.map(r => ({ ...r, session_id: ss.id })));
        saved.forEach(r => { const i = S.attendance.findIndex(a => a.session_id === r.session_id && a.student_id === r.student_id); if (i >= 0) S.attendance[i] = r; else S.attendance.push(r); });
        toast('হাজিরা সংরক্ষণ হয়েছে'); render();
      } catch (err) { toast(errMsg(err), true); btn.disabled = false; }
    };
  });
}

// ------------------------------------------------------------------ expenses & profit
function expenseModal() {
  openModal(`<h2>খরচ যোগ করুন</h2><form class="form" id="ef">
    <label class="f">তারিখ<input name="spent_on" type="date" required value="${todayISO()}"></label>
    <label class="f">টাকার পরিমাণ (৳)<input name="amount" type="number" min="1" step="1" required></label>
    <label class="f">খাত<select name="category">${Object.entries(EXP_CAT).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label class="f">মাধ্যম<select name="method">${Object.entries(METHOD).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label class="f full">কাকে দেওয়া হলো<input name="paid_to" placeholder="যেমন: বাড়িওয়ালা, শিক্ষকের নাম, দোকানের নাম"></label>
    <label class="f full">বিবরণ<input name="note" placeholder="যেমন: নভেম্বরের ভাড়া"></label>
    <p class="full small muted" style="margin:0">খরচ লেখার পর ভুল হলে শুধু অ্যাডমিন মুছতে পারবেন।</p>
    <div class="full row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="ec">বাতিল</button><button class="btn" type="submit">খরচ যোগ করুন</button></div></form>`);
  $('#ec').onclick = closeModal;
  $('#ef').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target);
    if (!(d.amount > 0)) return toast('সঠিক টাকার পরিমাণ দিন', true);
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try { putLocal('expenses', await API.insert('expenses', d)); closeModal(); toast('খরচ যোগ হয়েছে'); render(); }
    catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}
function viewExpenses(q) {
  const m = q.get('m') || monthISO();
  const list = S.expenses.filter(x => (x.spent_on || '').startsWith(m)).sort((a, b) => (b.spent_on + (b.created_at || '')).localeCompare(a.spent_on + (a.created_at || '')));
  const feeInc = S.payments.filter(p => (p.paid_on || '').startsWith(m) && p.purpose !== 'processing').reduce((a, p) => a + num(p.amount), 0); const procInc = S.payments.filter(p => (p.paid_on || '').startsWith(m) && p.purpose === 'processing').reduce((a, p) => a + num(p.amount), 0); const cInc = commIncome(m);
  const income = incomeOf(m); const spent = list.reduce((a, x) => a + num(x.amount), 0); const profit = income - spent;
  const byCat = {}; list.forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + num(x.amount); });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]); const maxCat = Math.max(1, ...cats.map(c => c[1]));
  mount('#/expenses', `
  <div class="top"><div><h1>খরচ ও লাভ</h1><p>মাস অনুযায়ী আয়, খরচ আর লাভ-ক্ষতি</p></div><div class="row"><input type="month" id="mon" value="${esc(m)}"><button class="btn ghost" id="csv">CSV ডাউনলোড</button><button class="btn" id="ne">+ খরচ যোগ</button></div></div>
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card stat green"><div class="l">আয়</div><div class="v">${tk(income)}</div><div class="s">কোর্স ফি ${tk(feeInc)}${procInc ? ` · প্রসেসিং ${tk(procInc)}` : ''}${cInc ? ` · কমিশন ${tk(cInc)}` : ''}</div></div>
    <div class="card stat red"><div class="l">খরচ</div><div class="v">${tk(spent)}</div><div class="s">${list.length}টি খরচ</div></div>
    <div class="card stat ${profit < 0 ? 'red' : 'green'}"><div class="l">${profit < 0 ? 'ক্ষতি' : 'লাভ'}</div><div class="v">${tk(Math.abs(profit))}</div><div class="s">আয় − খরচ</div></div>
  </div>
  ${cats.length ? `<div class="card" style="margin-bottom:16px"><h2>খাত অনুযায়ী খরচ</h2><div class="catbars">${cats.map(([k, v]) => `<div class="cb"><span>${esc(EXP_CAT[k] || k)}</span><div class="bar"><i style="width:${Math.round(v * 100 / maxCat)}%;background:var(--red)"></i></div><b>${tk(v)}</b></div>`).join('')}</div></div>` : ''}
  <div class="tw">${list.length ? `<table class="stack"><tr><th>তারিখ</th><th>খাত</th><th>বিবরণ</th><th>মাধ্যম</th><th class="num">টাকা</th><th></th></tr>${list.map(x => `<tr><td data-l="তারিখ">${fmtD(x.spent_on)}</td><td data-l="খাত">${esc(EXP_CAT[x.category] || x.category)}</td><td data-l="বিবরণ">${x.teacher_id && byId(S.teachers, x.teacher_id) ? `<a href="#/teacher/${x.teacher_id}?m=${esc(x.period || '')}">${esc(x.paid_to)}</a>${x.note ? ' · ' + esc(x.note) : ''}` : esc([x.paid_to, x.note].filter(Boolean).join(' · ') || '—')}</td><td data-l="মাধ্যম">${esc(METHOD[x.method] || x.method)}</td><td class="num" data-l="টাকা"><b>${tk(x.amount)}</b></td><td class="num" data-l="">${isAdmin() ? `<button class="btn sm ghost" data-de="${x.id}" style="color:var(--red)">মুছুন</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="empty">এই মাসে কোনো খরচ লেখা হয়নি। উপরের "+ খরচ যোগ" দিয়ে শুরু করুন।</div>'}</div>`, () => {
    $('#mon').onchange = (e) => { location.hash = '#/expenses?m=' + e.target.value; };
    $('#ne').onclick = expenseModal;
    $('#csv').onclick = () => csvDownload(`sakura-expenses-${m}.csv`, [['Date', 'Category', 'Paid to', 'Note', 'Method', 'Amount'], ...list.map(x => [x.spent_on, EXP_CAT[x.category] || x.category, x.paid_to, x.note, METHOD[x.method] || x.method, x.amount]), [], ['Income (fees)', '', '', '', '', income], ['Expenses', '', '', '', '', spent], ['Profit', '', '', '', '', profit]]);
    $$('[data-de]').forEach(b => b.onclick = async () => { const x = byId(S.expenses, b.dataset.de); if (!(await confirmBox(`${EXP_CAT[x.category] || ''} ${tk(x.amount)} খরচটা মুছে যাবে।`))) return; try { await API.remove('expenses', x.id); S.expenses = S.expenses.filter(y => y.id !== x.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } });
  });
}

// ------------------------------------------------------------------ inquiries (leads)
function leadModal(l) {
  const v = l || { created_on: todayISO(), source: 'facebook', interest: 'N5', status: 'new', next_follow_up: todayISO() };
  const sel = (name, opts) => `<select name="${name}">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${v[name] === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  openModal(`<h2>${l ? 'আগ্রহী ছাত্রের তথ্য' : 'নতুন আগ্রহী ছাত্র'}</h2><form class="form" id="lf2">
    <label class="f">নাম<input name="name" required value="${esc(v.name || '')}"></label>
    <label class="f">মোবাইল / WhatsApp<input name="phone" type="tel" required value="${esc(v.phone || '')}"></label>
    <label class="f">কোথা থেকে জেনেছে${sel('source', LEAD_SRC)}</label>
    <label class="f">কী চায়${sel('interest', LEAD_INT)}</label>
    <label class="f">অবস্থা${sel('status', LEAD_ST)}</label>
    <label class="f">আবার কবে যোগাযোগ করবেন<input name="next_follow_up" type="date" value="${esc(v.next_follow_up || '')}"></label>
    <label class="f">প্রথম যোগাযোগের তারিখ<input name="created_on" type="date" value="${esc(v.created_on || todayISO())}"></label>
    <label class="f full">নোট<textarea name="notes" placeholder="যেমন: HSC পাস ২০২৫, এপ্রিল সেশনে জাপান যেতে চায়, বাবা স্পনসর">${esc(v.notes || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end">${l && isAdmin() ? '<button type="button" class="btn ghost" id="ld" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="lc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  $('#lc').onclick = closeModal;
  const del = $('#ld'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox(`${l.name}-এর তথ্য মুছে যাবে।`))) return; try { await API.remove('inquiries', l.id); S.inquiries = S.inquiries.filter(x => x.id !== l.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } };
  $('#lf2').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target); const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try { putLocal('inquiries', l ? await API.update('inquiries', l.id, d) : await API.insert('inquiries', d)); closeModal(); toast('সংরক্ষণ হয়েছে'); render(); }
    catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}
function viewLeads(q) {
  const f = { st: q.get('st') || 'open', s: q.get('s') || '' }; const today = todayISO(); const m = monthISO();
  const open = (l) => ['new', 'contacted', 'trial'].includes(l.status);
  const list = S.inquiries.filter(l => {
    if (f.st === 'open' && !open(l)) return false;
    if (f.st !== 'open' && f.st !== 'all' && l.status !== f.st) return false;
    if (f.s) { const t = f.s.toLowerCase(); if (![l.name, l.phone, l.notes].some(x => (x || '').toLowerCase().includes(t))) return false; }
    return true;
  }).sort((a, b) => (open(a) === open(b) ? (a.next_follow_up || '9999').localeCompare(b.next_follow_up || '9999') : open(a) ? -1 : 1));
  const thisMonth = S.inquiries.filter(l => (l.created_on || '').startsWith(m));
  const joined = S.inquiries.filter(l => l.status === 'joined').length; const decided = S.inquiries.filter(l => l.status === 'joined' || l.status === 'lost').length;
  const dueToday = S.inquiries.filter(l => open(l) && l.next_follow_up && l.next_follow_up <= today).length;
  const bySrc = {}; S.inquiries.forEach(l => { const k = l.source || 'other'; bySrc[k] = bySrc[k] || { n: 0, j: 0 }; bySrc[k].n++; if (l.status === 'joined') bySrc[k].j++; });
  mount('#/leads', `
  <div class="top"><div><h1>আগ্রহী ছাত্র</h1><p>যারা জিজ্ঞেস করেছে, তাদের ফলো-আপ আর ভর্তি</p></div><div class="row"><button class="btn ghost" id="weblink">ওয়েবসাইটের লিংক</button><button class="btn" id="nl">+ নতুন আগ্রহী</button></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">এ মাসে নতুন জিজ্ঞাসা</div><div class="v">${thisMonth.length}</div><div class="s">মোট ${S.inquiries.length} জন</div></div>
    <div class="card stat green"><div class="l">ভর্তি হয়েছে</div><div class="v">${joined}</div><div class="s">এ মাসে ${thisMonth.filter(l => l.status === 'joined').length} জন</div></div>
    <div class="card stat"><div class="l">ভর্তির হার</div><div class="v">${decided ? Math.round(joined * 100 / decided) + '%' : '—'}</div><div class="s">ভর্তি ÷ (ভর্তি + আগ্রহ নেই)</div></div>
    <div class="card stat ${dueToday ? 'red' : ''}"><div class="l">আজ ফোন করতে হবে</div><div class="v">${dueToday}</div><div class="s">তারিখ পার হওয়াসহ</div></div>
  </div>
  <form class="row card" id="flt" style="padding:12px;margin-bottom:14px">
    <input class="search" name="s" placeholder="নাম, ফোন বা নোট দিয়ে খুঁজুন" value="${esc(f.s)}">
    <select name="st"><option value="open" ${f.st === 'open' ? 'selected' : ''}>চলমান (নতুন, কথা হয়েছে, ট্রায়াল)</option><option value="all" ${f.st === 'all' ? 'selected' : ''}>সবাই</option>${Object.entries(LEAD_ST).map(([k, v]) => `<option value="${k}" ${f.st === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="btn ghost">খুঁজুন</button></form>
  <div class="tw">${list.length ? `<table class="stack"><tr><th>নাম</th><th>কী চায়</th><th>উৎস</th><th>অবস্থা</th><th>ফলো-আপ</th><th></th></tr>${list.map(l => `<tr class="click" data-lead="${l.id}"><td class="mt" data-l=""><span><b>${esc(l.name)}</b><span class="small muted"> · ${esc(l.phone)}</span></span></td><td class="dm"><b>${esc(l.name)}</b><div class="small muted">${esc(l.phone)}</div></td><td data-l="কী চায়">${esc(LEAD_INT[l.interest] || l.interest)}</td><td data-l="উৎস">${esc(LEAD_SRC[l.source] || l.source)}</td><td data-l="অবস্থা">${badge(LEAD_ST_CLS[l.status], LEAD_ST[l.status])}</td><td data-l="ফলো-আপ">${!open(l) || !l.next_follow_up ? '<span class="muted">—</span>' : l.next_follow_up < today ? badge('due', fmtD(l.next_follow_up)) : l.next_follow_up === today ? badge('trial', 'আজ') : fmtD(l.next_follow_up)}</td><td class="num" data-l=""><div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:nowrap">${waBtn(l.phone, leadMsg(l), '')}${l.status === 'joined' && l.student_id ? `<a class="btn sm ghost" href="#/student/${l.student_id}" data-stop>প্রোফাইল</a>` : l.status !== 'lost' ? `<a class="btn sm gold" href="#/students/new?lead=${l.id}" data-stop>ভর্তি করুন</a>` : ''}</div></td></tr>`).join('')}</table>` : '<div class="empty">এই তালিকায় কেউ নেই। কেউ ফোন করলে বা ফেসবুকে মেসেজ দিলে "+ নতুন আগ্রহী" দিয়ে লিখে রাখুন।</div>'}</div>
  ${Object.keys(bySrc).length ? `<div class="card" style="margin-top:16px"><h2>কোথা থেকে ছাত্র আসছে</h2><div class="tw"><table><tr><th>উৎস</th><th class="num">জিজ্ঞাসা</th><th class="num">ভর্তি</th></tr>${Object.entries(bySrc).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `<tr><td>${esc(LEAD_SRC[k] || k)}</td><td class="num">${v.n}</td><td class="num">${v.j}</td></tr>`).join('')}</table></div><p class="small muted">যে উৎস থেকে বেশি ভর্তি হয়, বিজ্ঞাপনের টাকা সেখানে বেশি দিন।</p></div>` : ''}`, () => {
    $('#nl').onclick = () => leadModal(null);
    $('#weblink').onclick = websiteModal;
    $('#flt').onsubmit = (e) => { e.preventDefault(); const d = formData(e.target); location.hash = '#/leads?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
    $$('#flt select').forEach(sel => sel.onchange = () => $('#flt').requestSubmit());
    $$('[data-lead]').forEach(tr => tr.onclick = () => leadModal(byId(S.inquiries, tr.dataset.lead)));
    bindGo();
  });
}

const siteUrl = (src) => new URL('web/' + (src ? '?src=' + src : ''), location.href.split('#')[0]).href;
function websiteModal() {
  const rows = [['সাধারণ লিংক (প্রোফাইল, ভিজিটিং কার্ড)', ''], ['ফেসবুক পোস্ট ও বিজ্ঞাপনের জন্য', 'facebook'], ['WhatsApp-এ শেয়ার করার জন্য', 'whatsapp'], ['পরিচিতদের দেওয়ার জন্য', 'referral']];
  openModal(`<h2>ওয়েবসাইট ও ভর্তির ফর্ম</h2><p class="small muted">এই লিংক যে কেউ খুলতে পারে। কেউ ফর্ম পূরণ করলে তার নাম "আগ্রহী ছাত্র" তালিকায় নিজে থেকে চলে আসবে (উৎস দেখে বুঝবেন কোথা থেকে এসেছে)। ফি আর ফোন নম্বর সেটিংস থেকে নেয়।</p>
  ${rows.map(([l, src]) => `<div class="card" style="padding:10px;margin:8px 0"><div class="small muted">${l}</div><div class="row" style="gap:8px;flex-wrap:nowrap"><code style="flex:1;word-break:break-all;font-size:12.5px">${esc(siteUrl(src))}</code><button class="btn sm ghost" data-cp="${esc(siteUrl(src))}">কপি</button></div></div>`).join('')}
  <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><a class="btn ghost" href="${esc(siteUrl(''))}" target="_blank" rel="noopener">ওয়েবসাইট খুলুন</a><button class="btn" id="wmc">ঠিক আছে</button></div>`);
  $('#wmc').onclick = closeModal;
  $$('[data-cp]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.cp); toast('লিংক কপি হয়েছে'); } catch { toast('কপি হয়নি — লিংকটা হাতে সিলেক্ট করে কপি করুন', true); } });
}

// ------------------------------------------------------------------ exams
function examModal(ex) {
  const v = ex || { exam_date: todayISO(), type: 'quiz', level: 'N5', batch: 'all', max_marks: 20 };
  const sel = (name, opts) => `<select name="${name}">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${String(v[name]) === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  openModal(`<h2>${ex ? 'পরীক্ষার তথ্য' : 'নতুন পরীক্ষা'}</h2><form class="form" id="xf">
    <label class="f full">পরীক্ষার নাম<input name="title" required value="${esc(v.title || '')}" placeholder="যেমন: কুইজ ৪ — পাঠ ৮, বা টেস্ট ১ (পাঠ ১–১০)"></label>
    <label class="f">ধরন${sel('type', EXAM_TYPE)}</label>
    <label class="f">তারিখ<input name="exam_date" type="date" required value="${esc(v.exam_date || '')}"></label>
    <label class="f">লেভেল${sel('level', Object.fromEntries(LEVELS.map(l => [l, l])))}</label>
    <label class="f">ব্যাচ${sel('batch', { all: 'দুই ব্যাচ', ...BATCH })}</label>
    <label class="f">পূর্ণ নম্বর<input name="max_marks" type="number" min="1" step="0.5" required value="${esc(v.max_marks)}"></label>
    <label class="f">পাস নম্বর (খালি রাখলে ৬০%)<input name="pass_marks" type="number" min="0" step="0.5" value="${esc(v.pass_marks ?? '')}"></label>
    <p class="full small muted" style="margin:0">JLPT N5: পূর্ণ নম্বর ১৮০, পাস ৮০। NAT-TEST 5Q: পূর্ণ নম্বর ১৮০, পাস ১০০।</p>
    <div class="full row" style="justify-content:flex-end">${ex && (isAdmin() || !S.exam_results.some(r => r.exam_id === ex.id)) ? '<button type="button" class="btn ghost" id="xd" style="color:var(--red);margin-right:auto">পরীক্ষা মুছুন</button>' : ''}<button type="button" class="btn ghost" id="xc">বাতিল</button><button class="btn" type="submit">${ex ? 'সংরক্ষণ' : 'তৈরি করে নম্বর তুলুন'}</button></div></form>`);
  $('#xc').onclick = closeModal;
  const f = $('#xf');
  f.type.onchange = () => { if (['jlpt', 'nat'].includes(f.type.value)) { f.max_marks.value = 180; f.pass_marks.value = f.type.value === 'jlpt' ? 80 : 100; } };
  const del = $('#xd'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox(`"${ex.title}" আর এর সব নম্বর মুছে যাবে।`))) return; try { await API.remove('exams', ex.id); S.exams = S.exams.filter(x => x.id !== ex.id); S.exam_results = S.exam_results.filter(r => r.exam_id !== ex.id); toast('মুছে ফেলা হয়েছে'); location.hash = '#/exams'; } catch (e) { toast(errMsg(e), true); } };
  f.onsubmit = async (e) => {
    e.preventDefault(); const d = formData(f); if (d.pass_marks != null && d.pass_marks > d.max_marks) return toast('পাস নম্বর পূর্ণ নম্বরের চেয়ে বেশি হতে পারে না', true);
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try { const row = ex ? await API.update('exams', ex.id, d) : await API.insert('exams', d); putLocal('exams', row); closeModal(); toast('সংরক্ষণ হয়েছে'); if (ex) render(); else location.hash = '#/exam/' + row.id; }
    catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}
function examStats(ex) {
  const rs = S.exam_results.filter(r => r.exam_id === ex.id); const sat = rs.filter(r => pctOf(r, ex) != null);
  return { n: rs.length, sat: sat.length, avg: sat.length ? Math.round(sat.reduce((a, r) => a + pctOf(r, ex), 0) / sat.length) : null, pass: sat.filter(r => passed(r, ex)).length, hi: sat.length ? Math.max(...sat.map(r => num(r.marks))) : null, lo: sat.length ? Math.min(...sat.map(r => num(r.marks))) : null };
}
function viewExams(q) {
  const lv = q.get('l') || '';
  const list = S.exams.filter(e => !lv || e.level === lv).sort((a, b) => (b.exam_date || '').localeCompare(a.exam_date || ''));
  mount('#/exams', `
  <div class="top"><div><h1>পরীক্ষা ও রেজাল্ট</h1><p>কুইজ, টেস্ট, মক টেস্ট আর JLPT/NAT-এর ফলাফল</p></div><div class="row"><select id="lv"><option value="">সব লেভেল</option>${LEVELS.map(l => `<option ${lv === l ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn" id="nx">+ নতুন পরীক্ষা</button></div></div>
  <div class="tw">${list.length ? `<table class="stack"><tr><th>তারিখ</th><th>পরীক্ষা</th><th>লেভেল · ব্যাচ</th><th class="num">নম্বর তোলা</th><th class="num">গড়</th><th class="num">পাস</th></tr>${list.map(ex => { const st = examStats(ex); return `<tr class="click" data-go="#/exam/${ex.id}"><td class="mt" data-l=""><span><b>${esc(ex.title)}</b></span></td><td data-l="তারিখ">${fmtD(ex.exam_date)}</td><td class="dm"><b>${esc(ex.title)}</b><div class="small muted">${esc(EXAM_TYPE[ex.type] || ex.type)}</div></td><td data-l="লেভেল · ব্যাচ">${esc(ex.level)} · ${ex.batch === 'all' ? 'দুই ব্যাচ' : esc(BATCH[ex.batch] || '')}</td><td class="num" data-l="নম্বর তোলা">${st.n ? st.n + ' জন' : badge('due', 'বাকি')}</td><td class="num" data-l="গড়">${st.avg == null ? '—' : st.avg + '%'}</td><td class="num" data-l="পাস">${st.sat ? `${st.pass} / ${st.sat}` : '—'}</td></tr>`; }).join('')}</table>` : '<div class="empty">এখনো কোনো পরীক্ষা নেই। "+ নতুন পরীক্ষা" দিয়ে প্রথম কুইজটা যোগ করুন।</div>'}</div>`, () => {
    $('#nx').onclick = () => examModal(null);
    $('#lv').onchange = (e) => { location.hash = '#/exams' + (e.target.value ? '?l=' + e.target.value : ''); };
    bindGo();
  });
}
function viewExam(id) {
  const ex = byId(S.exams, id);
  if (!ex) return mount('#/exams', '<div class="empty">পরীক্ষা পাওয়া যায়নি</div>');
  const res = new Map(S.exam_results.filter(r => r.exam_id === ex.id).map(r => [r.student_id, r]));
  const roster = S.students.filter(s => res.has(s.id) || (s.current_level === ex.level && (ex.batch === 'all' || s.batch === ex.batch) && (s.status === 'active' || s.status === 'trial'))).sort((a, b) => (a.name_en || '').localeCompare(b.name_en || ''));
  const st = examStats(ex); const pm = passMark(ex);
  const ranked = [...res.values()].filter(r => pctOf(r, ex) != null).sort((a, b) => num(b.marks) - num(a.marks)); const rank = new Map(ranked.map((r, i) => [r.student_id, i + 1]));
  mount('#/exams', `
  <div class="top"><div><h1>${esc(ex.title)}</h1><p>${esc(EXAM_TYPE[ex.type] || ex.type)} · ${fmtD(ex.exam_date)} · ${esc(ex.level)} · ${ex.batch === 'all' ? 'দুই ব্যাচ' : esc(BATCH[ex.batch] || '')} · পূর্ণ নম্বর ${num(ex.max_marks)}, পাস ${pm}</p></div><div class="row"><button class="btn ghost" id="xe">পরীক্ষার তথ্য বদলান</button><button class="btn ghost" id="csv">CSV</button></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">পরীক্ষা দিয়েছে</div><div class="v">${st.sat} / ${roster.length}</div></div>
    <div class="card stat ${st.avg != null && st.avg < 60 ? 'red' : 'green'}"><div class="l">গড়</div><div class="v">${st.avg == null ? '—' : st.avg + '%'}</div></div>
    <div class="card stat green"><div class="l">পাস করেছে</div><div class="v">${st.sat ? st.pass + ' জন' : '—'}</div><div class="s">${st.sat ? Math.round(st.pass * 100 / st.sat) + '% পাসের হার' : ''}</div></div>
    <div class="card stat"><div class="l">সর্বোচ্চ / সর্বনিম্ন</div><div class="v">${st.hi == null ? '—' : st.hi + ' / ' + st.lo}</div></div>
  </div>
  <form id="mf"><div class="tw">${roster.length ? `<table class="stack att-m"><tr><th>ছাত্র</th><th>নম্বর (${num(ex.max_marks)}-এর মধ্যে)</th><th>ফল</th><th></th></tr>${roster.map(s => { const r = res.get(s.id); const p = pctOf(r, ex); return `<tr data-sid="${s.id}"><td data-l=""><b>${esc(s.name_bn || s.name_en)}</b><div class="small muted">${esc(s.admission_no)} · ${esc(s.name_en)}</div></td><td data-l=""><div class="row" style="gap:10px;flex-wrap:nowrap"><input type="number" inputmode="decimal" min="0" max="${num(ex.max_marks)}" step="0.5" data-mk value="${r && !r.absent && r.marks != null ? num(r.marks) : ''}" style="width:96px" aria-label="নম্বর"><label class="small" style="display:flex;gap:4px;align-items:center;white-space:nowrap"><input type="checkbox" data-ab ${r && r.absent ? 'checked' : ''}> অনুপস্থিত</label></div></td><td data-l="">${!r ? '<span class="muted small">—</span>' : r.absent ? badge('dropped', 'অনুপস্থিত') : `${passed(r, ex) ? badge('active', 'পাস') : badge('due', 'পাস করেনি')} <span class="small">${p}%${rank.has(s.id) ? ' · ' + rank.get(s.id) + 'ম' : ''}</span>`}</td><td class="num" data-l="">${r ? waBtn(guardianPhone(s), resultMsg(s, ex, r), '') : ''}</td></tr>`; }).join('')}</table>` : `<div class="empty">${esc(ex.level)} লেভেলে কোনো চলমান ছাত্র নেই</div>`}</div>
  ${roster.length ? '<div class="row" style="justify-content:flex-end;margin-top:14px"><span class="small muted" style="margin-right:auto">খালি ঘর বাদ যাবে। পরে এসে বাকিদের নম্বর তোলা যায়।</span><button class="btn" type="submit">নম্বর সংরক্ষণ</button></div>' : ''}</form>`, () => {
    $('#xe').onclick = () => examModal(ex);
    $('#csv').onclick = () => csvDownload(`sakura-exam-${ex.exam_date}.csv`, [['Exam', ex.title], ['Date', ex.exam_date], ['Max', ex.max_marks], ['Pass', pm], [], ['Admission no', 'Name', 'Marks', '%', 'Result'], ...roster.map(s => { const r = res.get(s.id); return [s.admission_no, s.name_en || s.name_bn, r ? (r.absent ? 'Absent' : r.marks) : '', pctOf(r, ex) ?? '', r ? (r.absent ? 'Absent' : passed(r, ex) ? 'Pass' : 'Fail') : '']; })]);
    $$('[data-ab]').forEach(cb => cb.onchange = () => { const inp = $('[data-mk]', cb.closest('tr')); inp.disabled = cb.checked; if (cb.checked) inp.value = ''; });
    $$('[data-ab]:checked').forEach(cb => { $('[data-mk]', cb.closest('tr')).disabled = true; });
    bindGo();
    const f = $('#mf'); if (!roster.length) return;
    f.onsubmit = async (e) => {
      e.preventDefault(); const rows = []; let bad = '';
      for (const tr of $$('tr[data-sid]')) {
        const ab = $('[data-ab]', tr).checked; const raw = $('[data-mk]', tr).value.trim();
        if (ab) { rows.push({ exam_id: ex.id, student_id: tr.dataset.sid, marks: null, absent: true }); continue; }
        if (raw === '') continue;
        const m = Number(raw); if (!(m >= 0 && m <= num(ex.max_marks))) { bad = raw; break; }
        rows.push({ exam_id: ex.id, student_id: tr.dataset.sid, marks: m, absent: false });
      }
      if (bad) return toast(`নম্বর ০ থেকে ${num(ex.max_marks)}-এর মধ্যে হতে হবে (${bad})`, true);
      if (!rows.length) return toast('অন্তত একজনের নম্বর দিন', true);
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        const saved = await API.upsertResults(rows);
        saved.forEach(r => { const i = S.exam_results.findIndex(a => a.exam_id === r.exam_id && a.student_id === r.student_id); if (i >= 0) S.exam_results[i] = r; else S.exam_results.push(r); });
        toast(`${rows.length} জনের নম্বর সংরক্ষণ হয়েছে`); render();
      } catch (err) { toast(errMsg(err), true); btn.disabled = false; }
    };
  });
}

// ------------------------------------------------------------------ Japan: schools & applications
const intakeLabel = (v) => v && /^\d{4}-\d{2}$/.test(v) ? `${v.slice(0, 4)} ${MONTH_BN[v.slice(5)] || v.slice(5) + ' মাস'}` : (v || '—');
function intakeOptions(cur) {
  const out = []; const d = new Date(); let y = d.getFullYear(), m = d.getMonth() + 1;
  for (let i = 0; out.length < 8 && i < 40; i++) { if ([1, 4, 7, 10].includes(m)) out.push(`${y}-${pad(m, 2)}`); m++; if (m > 12) { m = 1; y++; } }
  const used = S.applications.map(a => a.intake).filter(Boolean);
  return [...new Set([...(cur ? [cur] : []), ...used, ...out])].sort();
}
const schoolName = (sc) => sc ? (sc.name_ja || sc.name_en || '—') : '—';
const yen = (n) => n == null || n === '' ? '—' : '¥' + Math.round(num(n)).toLocaleString('en-US');
const appOpen = (a) => !APP_CLOSED.includes(a.status) && a.status !== 'departed';
function appNext(a) { // the nearest date that still matters for this application
  const t = todayISO(); const c = [];
  if (a.status === 'preparing' && a.deadline_on) c.push([a.deadline_on, 'আবেদনের শেষ তারিখ']);
  if (['submitted', 'interview'].includes(a.status) && a.interview_on && a.interview_on >= t) c.push([a.interview_on, 'ইন্টারভিউ']);
  if (['accepted', 'coe_applied'].includes(a.status) && a.result_on) c.push([a.result_on, 'COE-র ফল']);
  if (a.status === 'visa' && a.depart_on) c.push([a.depart_on, 'যাত্রা']);
  c.sort((x, y) => x[0].localeCompare(y[0])); return c[0] || null;
}
function nextCell(a) {
  const n = appNext(a); if (!n) return '<span class="muted">—</span>';
  const t = todayISO(); const late = n[0] < t; const soon = !late && n[0] <= isoPlus(7);
  return `<span class="cell">${late ? badge('due', fmtD(n[0])) : soon ? badge('trial', fmtD(n[0])) : fmtD(n[0])}<div class="small muted">${n[1]}${late ? ' পার হয়েছে' : ''}</div></span>`;
}
const isoPlus = (days) => { const x = new Date(); x.setDate(x.getDate() + days); return `${x.getFullYear()}-${pad(x.getMonth() + 1, 2)}-${pad(x.getDate(), 2)}`; };
function japanMsg(s, a) { const sc = byId(S.jp_schools, a.school_id); return fillTpl(S.settings.wa_japan, { ...tplBase(), name: s.name_bn || s.name_en, school: schoolName(sc), intake: intakeLabel(a.intake), status: APP_ST[a.status] || a.status }); }

async function syncStudentStage(sid) { // move the student's Japan stage forward to match their best application
  const s = byId(S.students, sid); if (!s) return;
  const apps = S.applications.filter(a => a.student_id === sid && !APP_CLOSED.includes(a.status));
  if (!apps.length) return;
  const best = apps.reduce((b, a) => APP_FLOW.indexOf(a.status) > APP_FLOW.indexOf(b.status) ? a : b);
  const order = JSTAGES.map(([k]) => k); const want = APP_STAGE[best.status];
  const patch = {};
  if (order.indexOf(want) > order.indexOf(s.japan_stage || 'none')) patch.japan_stage = want;
  const sc = byId(S.jp_schools, best.school_id);
  if (APP_FLOW.indexOf(best.status) >= APP_FLOW.indexOf('accepted') || !s.target_school) { if (sc && s.target_school !== schoolName(sc)) patch.target_school = schoolName(sc); if (best.intake && s.intake !== best.intake) patch.intake = best.intake; }
  if (best.status === 'departed' && s.status !== 'japan') patch.status = 'japan';
  if (Object.keys(patch).length) { putLocal('students', await API.update('students', sid, patch)); return patch; }
}

function schoolModal(sc) {
  const v = sc || { prefecture: '兵庫県', intakes: '1, 4, 7, 10', active: 'yes' };
  openModal(`<h2>${sc ? 'স্কুলের তথ্য' : 'নতুন জাপানি স্কুল'}</h2><form class="form" id="scf">
    <label class="f full">স্কুলের নাম (জাপানি)<input name="name_ja" required value="${esc(v.name_ja || '')}" placeholder="যেমন 春日日本語学院"></label>
    <label class="f full">স্কুলের নাম (ইংরেজি)<input name="name_en" value="${esc(v.name_en || '')}" placeholder="Kasuga Japanese Language School"></label>
    <label class="f">প্রিফেকচার<input name="prefecture" value="${esc(v.prefecture || '')}" placeholder="兵庫県"></label>
    <label class="f">শহর / ওয়ার্ড<input name="city" value="${esc(v.city || '')}" placeholder="神戸市中央区"></label>
    <label class="f full">ঠিকানা<input name="address" value="${esc(v.address || '')}"></label>
    <label class="f">বছরে টিউশন ফি (¥)<input name="tuition_yen" type="number" min="0" value="${esc(v.tuition_yen ?? '')}"></label>
    <label class="f">আসন সংখ্যা<input name="capacity" type="number" min="0" value="${esc(v.capacity ?? '')}"></label>
    <label class="f">ভর্তির মাস<input name="intakes" value="${esc(v.intakes || '')}" placeholder="1, 4, 7, 10"></label>
    <label class="f">অবস্থা<select name="active"><option value="yes" ${v.active !== false && v.active !== 'no' ? 'selected' : ''}>কাজ চলছে</option><option value="no" ${v.active === false || v.active === 'no' ? 'selected' : ''}>এখন পাঠাচ্ছি না</option></select></label>
    <label class="f">যোগাযোগের ব্যক্তি<input name="contact_person" value="${esc(v.contact_person || '')}" placeholder="যেমন 田中さん (入学担当)"></label>
    <label class="f">ফোন<input name="phone" type="tel" value="${esc(v.phone || '')}"></label>
    <label class="f">ইমেইল<input name="email" type="email" value="${esc(v.email || '')}"></label>
    <label class="f">ওয়েবসাইট<input name="website" type="url" value="${esc(v.website || '')}" placeholder="https://"></label>
    <label class="f full">নোট<textarea name="notes" placeholder="যেমন: আবেদনের শেষ তারিখ, এজেন্ট কমিশন, ভর্তি পরীক্ষা লাগে কিনা">${esc(v.notes || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end">${sc && isAdmin() ? '<button type="button" class="btn ghost" id="scd" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="scc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  $('#scc').onclick = closeModal;
  const del = $('#scd'); if (del) del.onclick = async () => {
    if (S.applications.some(a => a.school_id === sc.id)) { closeModal(); return toast('এই স্কুলে আবেদনের রেকর্ড আছে, তাই মোছা যাবে না। অবস্থা "এখন পাঠাচ্ছি না" করে দিন।', true); }
    closeModal(); if (!(await confirmBox(`${schoolName(sc)} তালিকা থেকে মুছে যাবে।`))) return;
    try { await API.remove('jp_schools', sc.id); S.jp_schools = S.jp_schools.filter(x => x.id !== sc.id); toast('মুছে ফেলা হয়েছে'); location.hash = '#/japan?v=schools'; } catch (e) { toast(errMsg(e), true); }
  };
  $('#scf').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target); d.active = d.active !== 'no';
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try { const row = sc ? await API.update('jp_schools', sc.id, d) : await API.insert('jp_schools', d); putLocal('jp_schools', row); closeModal(); toast('সংরক্ষণ হয়েছে'); if (sc) render(); else location.hash = '#/school/' + row.id; }
    catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}

function appModal(a, preset = {}) {
  const v = a || { status: 'preparing', school_fee: 'none', intake: intakeOptions()[0], ...Object.fromEntries(Object.entries(preset).filter(([, x]) => x != null && x !== '')) };
  const studs = S.students.filter(s => s.status !== 'dropped' || s.id === v.student_id).sort((x, y) => (x.name_en || '').localeCompare(y.name_en || ''));
  const schools = S.jp_schools.filter(sc => sc.active !== false || sc.id === v.school_id).sort((x, y) => schoolName(x).localeCompare(schoolName(y)));
  if (!schools.length) return toast('আগে "স্কুল" ট্যাবে অন্তত একটা জাপানি স্কুল যোগ করুন', true);
  const sel = (name, opts) => `<select name="${name}">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${v[name] === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  openModal(`<h2>${a ? 'আবেদনের তথ্য' : 'নতুন আবেদন'}</h2><form class="form" id="apf">
    <label class="f full">ছাত্র<select name="student_id" required ${a ? 'disabled' : ''}><option value="">— বেছে নিন —</option>${studs.map(s => `<option value="${s.id}" ${v.student_id === s.id ? 'selected' : ''}>${esc(s.admission_no)} · ${esc(s.name_bn || s.name_en)}</option>`).join('')}</select></label>
    <label class="f full">জাপানি স্কুল<select name="school_id" required><option value="">— বেছে নিন —</option>${schools.map(sc => `<option value="${sc.id}" ${v.school_id === sc.id ? 'selected' : ''}>${esc(schoolName(sc))}${sc.city ? ' · ' + esc(sc.city) : ''}</option>`).join('')}</select></label>
    <label class="f">সেশন (ভর্তির মাস)<select name="intake" required>${intakeOptions(v.intake).map(x => `<option value="${x}" ${v.intake === x ? 'selected' : ''}>${intakeLabel(x)}</option>`).join('')}</select></label>
    <label class="f">অবস্থা${sel('status', APP_ST)}</label>
    <label class="f">স্কুলে আবেদনের শেষ তারিখ<input name="deadline_on" type="date" value="${esc(v.deadline_on || '')}"></label>
    <label class="f">আবেদন জমার তারিখ<input name="submitted_on" type="date" value="${esc(v.submitted_on || '')}"></label>
    <label class="f">ইন্টারভিউর তারিখ<input name="interview_on" type="date" value="${esc(v.interview_on || '')}"></label>
    <label class="f">COE-র ফলের তারিখ<input name="result_on" type="date" value="${esc(v.result_on || '')}"></label>
    <label class="f">যাত্রার তারিখ<input name="depart_on" type="date" value="${esc(v.depart_on || '')}"></label>
    <label class="f">স্কুলের ফি (জাপানে পাঠানো)${sel('school_fee', SCHOOL_FEE)}</label>
    <label class="f full">নোট<textarea name="note" placeholder="যেমন: স্কুল আরও ব্যাংক স্টেটমেন্ট চেয়েছে, ইন্টারভিউ Zoom-এ সকাল ১০টায় (জাপান সময়)">${esc(v.note || '')}</textarea></label>
    <p class="full small muted" style="margin:0">অবস্থা বদলালে ছাত্রের "জাপান প্রসেস" ধাপ, স্কুল আর সেশন নিজে থেকে এগিয়ে যাবে।</p>
    <div class="full row" style="justify-content:flex-end">${a && isAdmin() ? '<button type="button" class="btn ghost" id="apd" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="apc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  $('#apc').onclick = closeModal;
  const del = $('#apd'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('এই আবেদনের রেকর্ড মুছে যাবে।'))) return; try { await API.remove('applications', a.id); S.applications = S.applications.filter(x => x.id !== a.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } };
  $('#apf').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target); if (a) delete d.student_id;
    const sid = a ? a.student_id : d.student_id;
    if (!sid || !d.school_id) return toast('ছাত্র আর স্কুল বেছে নিন', true);
    if (S.applications.some(x => x.id !== (a && a.id) && x.student_id === sid && x.school_id === d.school_id && x.intake === d.intake)) return toast('এই ছাত্রের এই স্কুলে এই সেশনের আবেদন আগে থেকেই আছে', true);
    const t = todayISO();
    if (d.status === 'submitted' && !d.submitted_on) d.submitted_on = t;
    if (['coe_granted', 'coe_denied'].includes(d.status) && !d.result_on) d.result_on = t;
    d.updated_at = new Date().toISOString();
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      putLocal('applications', a ? await API.update('applications', a.id, d) : await API.insert('applications', d));
      const moved = await syncStudentStage(sid).catch(() => null);
      closeModal(); toast(moved && moved.japan_stage ? `সংরক্ষণ হয়েছে · ছাত্রের ধাপ এখন "${(JSTAGES.find(([k]) => k === moved.japan_stage) || [])[1]}"` : 'সংরক্ষণ হয়েছে'); render();
    } catch (err) { toast(/duplicate|unique/i.test(errMsg(err) + (err && err.message)) ? 'এই ছাত্রের এই স্কুলে এই সেশনের আবেদন আগে থেকেই আছে' : errMsg(err), true); btn.disabled = false; }
  };
}

function appRows(list, { showStudent = true, showSchool = true } = {}) {
  return `<table class="stack"><tr>${showStudent ? '<th>ছাত্র</th>' : ''}${showSchool ? '<th>স্কুল</th>' : ''}<th>সেশন</th><th>অবস্থা</th><th>পরের তারিখ</th><th></th></tr>${list.map(a => {
    const s = byId(S.students, a.student_id); const sc = byId(S.jp_schools, a.school_id);
    const title = showStudent ? `<b>${esc(studentName(s))}</b>` : `<b>${esc(schoolName(sc))}</b>`;
    return `<tr class="click" data-app="${a.id}"><td class="mt" data-l=""><span>${title}</span></td>${showStudent ? `<td class="dm"><b>${esc(studentName(s))}</b><div class="small muted">${esc(s ? s.admission_no : '')} · ${esc(s ? s.current_level : '')}</div></td>` : ''}${showSchool ? `<td ${showStudent ? 'data-l="স্কুল"' : 'class="dm"'}><span class="cell">${showStudent ? esc(schoolName(sc)) : `<b>${esc(schoolName(sc))}</b>`}<div class="small muted">${esc(sc ? sc.city || '' : '')}</div></span></td>` : ''}<td data-l="সেশন">${esc(intakeLabel(a.intake))}</td><td data-l="অবস্থা">${badge(APP_CLS[a.status], APP_ST[a.status] || a.status)}</td><td data-l="পরের তারিখ">${appOpen(a) ? nextCell(a) : '<span class="muted">—</span>'}</td><td class="num" data-l="">${s ? waBtn(guardianPhone(s), japanMsg(s, a), '') : ''}</td></tr>`;
  }).join('')}</table>`;
}
function bindApps() { $$('[data-app]').forEach(tr => tr.onclick = () => appModal(byId(S.applications, tr.dataset.app))); $$('[data-app] a').forEach(el => el.addEventListener('click', e => e.stopPropagation())); }

function viewJapan(q) {
  const v = ['schools', 'income'].includes(q.get('v')) ? q.get('v') : 'apps';
  const tabs = `<div class="tabs"><button data-jv="apps" class="${v === 'apps' ? 'on' : ''}">আবেদন</button><button data-jv="schools" class="${v === 'schools' ? 'on' : ''}">জাপানি স্কুল (${S.jp_schools.length})</button>${isAdmin() ? `<button data-jv="income" class="${v === 'income' ? 'on' : ''}">আয় ও কমিশন</button>` : ''}</div>`;
  const bindTabs = () => $$('[data-jv]').forEach(b => b.onclick = () => { location.hash = '#/japan' + (b.dataset.jv === 'apps' ? '' : '?v=' + b.dataset.jv); });
  if (v === 'schools') return viewSchools(q, tabs, bindTabs);
  if (v === 'income' && isAdmin()) return viewJapanIncome(q, tabs, bindTabs);
  const f = { st: q.get('st') || 'open', in: q.get('in') || '', s: q.get('s') || '' };
  const list = S.applications.filter(a => {
    if (f.st === 'open' && !appOpen(a)) return false;
    if (!['open', 'all'].includes(f.st) && a.status !== f.st) return false;
    if (f.in && a.intake !== f.in) return false;
    if (f.s) { const t = f.s.toLowerCase(); const s = byId(S.students, a.student_id); const sc = byId(S.jp_schools, a.school_id); if (![s && s.name_bn, s && s.name_en, s && s.admission_no, sc && sc.name_ja, sc && sc.name_en].some(x => (x || '').toLowerCase().includes(t))) return false; }
    return true;
  }).sort((a, b) => ((appNext(a) || ['9999'])[0]).localeCompare((appNext(b) || ['9999'])[0]) || APP_FLOW.indexOf(b.status) - APP_FLOW.indexOf(a.status));
  const scope = S.applications.filter(a => !f.in || a.intake === f.in);
  const count = (st) => scope.filter(a => a.status === st).length;
  const soon = S.applications.filter(a => appOpen(a) && appNext(a) && appNext(a)[0] <= isoPlus(14)).length;
  const decided = scope.filter(a => ['coe_granted', 'visa', 'departed', 'coe_denied'].includes(a.status)); const granted = decided.filter(a => a.status !== 'coe_denied').length;
  const intakes = [...new Set(S.applications.map(a => a.intake).filter(Boolean))].sort().reverse();
  const byIntake = intakes.map(i => { const r = S.applications.filter(a => a.intake === i); return { i, n: r.length, students: new Set(r.map(a => a.student_id)).size, coe: r.filter(a => ['coe_granted', 'visa', 'departed'].includes(a.status)).length, den: r.filter(a => a.status === 'coe_denied').length, dep: r.filter(a => a.status === 'departed').length }; });
  mount('#/japan', `
  <div class="top"><div><h1>জাপান আবেদন</h1><p>কে কোন স্কুলে আবেদন করেছে, ইন্টারভিউ, COE, ভিসা আর যাত্রা</p></div><div class="row"><button class="btn ghost" id="acsv">CSV</button><button class="btn" id="na">+ নতুন আবেদন</button></div></div>
  ${tabs}
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">চলমান আবেদন</div><div class="v">${S.applications.filter(appOpen).length}</div><div class="s">${new Set(S.applications.filter(appOpen).map(a => a.student_id)).size} জন ছাত্র</div></div>
    <div class="card stat ${soon ? 'red' : ''}"><div class="l">সামনের ১৪ দিনে তারিখ</div><div class="v">${soon}</div><div class="s">শেষ তারিখ, ইন্টারভিউ, COE, যাত্রা</div></div>
    <div class="card stat green"><div class="l">COE পেয়েছে${f.in ? ' (এই সেশন)' : ''}</div><div class="v">${granted}</div><div class="s">${decided.length ? 'COE-র হার ' + Math.round(granted * 100 / decided.length) + '%' : 'এখনো ফল আসেনি'}</div></div>
    <div class="card stat"><div class="l">জাপানে গেছে${f.in ? ' (এই সেশন)' : ''}</div><div class="v">${count('departed')}</div></div>
  </div>
  <div class="card" style="margin-bottom:14px;padding:12px"><div class="steps">${APP_FLOW.map(st => `<a href="#/japan?st=${st}${f.in ? '&in=' + f.in : ''}" class="pipe ${f.st === st ? 'cur' : ''}">${APP_ST[st]} <b>${count(st)}</b></a>`).join('')}</div></div>
  <form class="row card" id="flt" style="padding:12px;margin-bottom:14px">
    <input class="search" name="s" placeholder="ছাত্র বা স্কুলের নাম দিয়ে খুঁজুন" value="${esc(f.s)}">
    <select name="in"><option value="">সব সেশন</option>${intakes.map(i => `<option value="${i}" ${f.in === i ? 'selected' : ''}>${intakeLabel(i)}</option>`).join('')}</select>
    <select name="st"><option value="open" ${f.st === 'open' ? 'selected' : ''}>চলমান আবেদন</option><option value="all" ${f.st === 'all' ? 'selected' : ''}>সব আবেদন</option>${Object.entries(APP_ST).map(([k, l]) => `<option value="${k}" ${f.st === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button class="btn ghost">খুঁজুন</button></form>
  <div class="tw">${list.length ? appRows(list) : `<div class="empty">${S.applications.length ? 'এই তালিকায় কোনো আবেদন নেই' : S.jp_schools.length ? 'এখনো কোনো আবেদন নেই। "+ নতুন আবেদন" দিয়ে শুরু করুন।' : 'আগে "জাপানি স্কুল" ট্যাবে স্কুল যোগ করুন, তারপর আবেদন লিখুন।'}</div>`}</div>
  ${byIntake.length ? `<div class="card" style="margin-top:16px"><h2>সেশন অনুযায়ী ফলাফল</h2><div class="tw"><table class="stack"><tr><th>সেশন</th><th class="num">ছাত্র</th><th class="num">আবেদন</th><th class="num">COE পেয়েছে</th><th class="num">COE পায়নি</th><th class="num">জাপানে গেছে</th></tr>${byIntake.map(r => `<tr class="click" data-go="#/japan?st=all&in=${r.i}"><td data-l="সেশন"><b>${esc(intakeLabel(r.i))}</b></td><td class="num" data-l="ছাত্র">${r.students}</td><td class="num" data-l="আবেদন">${r.n}</td><td class="num" data-l="COE পেয়েছে">${r.coe}</td><td class="num" data-l="COE পায়নি">${r.den}</td><td class="num" data-l="জাপানে গেছে">${r.dep}</td></tr>`).join('')}</table></div><p class="small muted">COE-র হার ভালো থাকলে নতুন ছাত্রদের সেটা দেখানো যায়।</p></div>` : ''}`, () => {
    bindTabs(); bindApps(); bindGo();
    $('#na').onclick = () => appModal(null, f.in ? { intake: f.in } : {});
    $('#flt').onsubmit = (e) => { e.preventDefault(); const d = formData(e.target); location.hash = '#/japan?' + new URLSearchParams(Object.entries(d).filter(([, x]) => x)); };
    $$('#flt select').forEach(sel => sel.onchange = () => $('#flt').requestSubmit());
    $('#acsv').onclick = () => csvDownload(`sakura-japan-applications-${todayISO()}.csv`, [['Admission no', 'Student', 'Passport', 'School', 'City', 'Intake', 'Status', 'Deadline', 'Submitted', 'Interview', 'COE result', 'Departure', 'School fee', 'Guardian phone', 'Note'], ...list.map(a => { const s = byId(S.students, a.student_id) || {}; const sc = byId(S.jp_schools, a.school_id) || {}; return [s.admission_no, s.name_en || s.name_bn, s.passport_no, schoolName(sc), sc.city, a.intake, APP_ST[a.status], a.deadline_on, a.submitted_on, a.interview_on, a.result_on, a.depart_on, SCHOOL_FEE[a.school_fee] || '', s.guardian_phone, a.note]; })]);
  });
}

function viewSchools(q, tabs, bindTabs) {
  const s = (q.get('s') || '').toLowerCase(); const showAll = q.get('all') === '1';
  const stats = (id) => { const r = S.applications.filter(a => a.school_id === id); return { n: r.length, coe: r.filter(a => ['coe_granted', 'visa', 'departed'].includes(a.status)).length, open: r.filter(appOpen).length }; };
  const list = S.jp_schools.filter(sc => (showAll || sc.active !== false) && (!s || [sc.name_ja, sc.name_en, sc.city, sc.prefecture].some(x => (x || '').toLowerCase().includes(s)))).sort((a, b) => stats(b.id).n - stats(a.id).n || schoolName(a).localeCompare(schoolName(b)));
  const missingKobe = KOBE_SCHOOLS.filter(k => !S.jp_schools.some(sc => sc.name_ja === k[0])).length;
  mount('#/japan', `
  <div class="top"><div><h1>জাপান আবেদন</h1><p>যেসব জাপানি স্কুলে ছাত্র পাঠান তাদের তালিকা</p></div><div class="row">${missingKobe ? `<button class="btn ghost" id="kobe">কোবের ${missingKobe}টি স্কুল যোগ করুন</button>` : ''}<button class="btn" id="ns">+ নতুন স্কুল</button></div></div>
  ${tabs}
  <form class="row card" id="flt" style="padding:12px;margin-bottom:14px"><input type="hidden" name="v" value="schools"><input class="search" name="s" placeholder="স্কুল বা শহরের নাম" value="${esc(q.get('s') || '')}"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="sall" ${showAll ? 'checked' : ''}> যাদের কাছে এখন পাঠাচ্ছি না তাদেরও দেখান</label><button class="btn ghost">খুঁজুন</button></form>
  <div class="tw">${list.length ? `<table class="stack"><tr><th>স্কুল</th><th>শহর</th><th class="num">টিউশন / বছর</th><th class="num">আবেদন</th><th class="num">COE</th></tr>${list.map(sc => { const st = stats(sc.id); return `<tr class="click" data-go="#/school/${sc.id}"><td class="mt" data-l=""><span><b>${esc(schoolName(sc))}</b></span></td><td class="dm"><b>${esc(schoolName(sc))}</b>${sc.name_en ? `<div class="small muted">${esc(sc.name_en)}</div>` : ''}${sc.active === false ? ' ' + badge('dropped', 'পাঠাচ্ছি না') : ''}</td><td data-l="শহর">${esc(sc.city || sc.prefecture || '—')}</td><td class="num" data-l="টিউশন / বছর">${yen(sc.tuition_yen)}</td><td class="num" data-l="আবেদন">${st.n ? st.n + (st.open ? ` <span class="small muted">(${st.open} চলমান)</span>` : '') : '—'}</td><td class="num" data-l="COE">${st.coe || '—'}</td></tr>`; }).join('')}</table>` : `<div class="empty">${S.jp_schools.length ? 'কোনো স্কুল পাওয়া যায়নি' : 'এখনো কোনো স্কুল যোগ করা হয়নি। কোবের স্কুলের তালিকা এক ক্লিকে যোগ করতে পারেন।'}</div>`}</div>`, () => {
    bindTabs(); bindGo();
    $('#ns').onclick = () => schoolModal(null);
    $('#flt').onsubmit = (e) => { e.preventDefault(); const p = new URLSearchParams({ v: 'schools' }); const t = e.target.s.value.trim(); if (t) p.set('s', t); if ($('#sall').checked) p.set('all', '1'); location.hash = '#/japan?' + p; };
    $('#sall').onchange = () => $('#flt').requestSubmit();
    const kb = $('#kobe'); if (kb) kb.onclick = async () => {
      if (!(await confirmBox(`কোবে ও আশেপাশের ${missingKobe}টি জাপানি ভাষা স্কুলের নাম, ঠিকানা, ফি আর ওয়েবসাইট তালিকায় যোগ হবে। পরে যেকোনোটা বদলানো বা মোছা যাবে।`, 'হ্যাঁ, যোগ করুন'))) return;
      kb.disabled = true; let n = 0;
      try { for (const [name_ja, city, address, capacity, tuition_yen, website, notes] of KOBE_SCHOOLS) { if (S.jp_schools.some(sc => sc.name_ja === name_ja)) continue; putLocal('jp_schools', await API.insert('jp_schools', { name_ja, prefecture: '兵庫県', city, address, capacity, tuition_yen, website, notes, intakes: '', active: true })); n++; } toast(`${n}টি স্কুল যোগ হয়েছে`); }
      catch (err) { toast((n ? `${n}টি যোগ হয়েছে, তারপর সমস্যা: ` : '') + errMsg(err), true); }
      render();
    };
  });
}

function viewSchool(id) {
  const sc = byId(S.jp_schools, id);
  if (!sc) return mount('#/japan', '<div class="empty">স্কুল পাওয়া যায়নি</div>');
  const apps = S.applications.filter(a => a.school_id === sc.id).sort((a, b) => (b.intake || '').localeCompare(a.intake || '') || APP_FLOW.indexOf(b.status) - APP_FLOW.indexOf(a.status));
  const coe = apps.filter(a => ['coe_granted', 'visa', 'departed'].includes(a.status)).length; const den = apps.filter(a => a.status === 'coe_denied').length;
  const link = (u) => /^https?:\/\//i.test(u || '') ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : esc(u || '—');
  const kv = [['ইংরেজি নাম', esc(sc.name_en || '—')], ['ঠিকানা', esc([sc.prefecture, sc.address || sc.city].filter(Boolean).join(' ') || '—')], ['বছরে টিউশন ফি', yen(sc.tuition_yen)], ['আসন', esc(sc.capacity ?? '—')], ['ভর্তির মাস', esc(sc.intakes || '—')], ['যোগাযোগ', esc(sc.contact_person || '—')], ['ফোন', esc(sc.phone || '—')], ['ইমেইল', sc.email ? `<a href="mailto:${esc(sc.email)}">${esc(sc.email)}</a>` : '—'], ['ওয়েবসাইট', link(sc.website)], ['নোট', esc(sc.notes || '—')]];
  mount('#/japan', `
  <div class="top"><div><h1>${esc(schoolName(sc))}</h1><p>${esc(sc.city || sc.prefecture || '')}${sc.active === false ? ' · এখন পাঠাচ্ছি না' : ''}</p></div><div class="row"><button class="btn ghost" id="se">সম্পাদনা</button><button class="btn" id="sa">+ এই স্কুলে আবেদন</button></div></div>
  <div class="grid g3" style="margin-bottom:16px"><div class="card stat"><div class="l">মোট আবেদন</div><div class="v">${apps.length}</div><div class="s">${apps.filter(appOpen).length} চলমান</div></div><div class="card stat green"><div class="l">COE পেয়েছে</div><div class="v">${coe}</div></div><div class="card stat ${den ? 'red' : ''}"><div class="l">COE পায়নি</div><div class="v">${den}</div><div class="s">${coe + den ? 'COE-র হার ' + Math.round(coe * 100 / (coe + den)) + '%' : ''}</div></div></div>
  <div class="grid g2"><div class="card"><h2>স্কুলের তথ্য</h2><dl class="kv">${kv.map(([k, x]) => `<dt>${k}</dt><dd>${x}</dd>`).join('')}</dl></div>
  <div class="card"><h2>এই স্কুলে আবেদন</h2><div class="tw">${apps.length ? appRows(apps, { showSchool: false }) : '<div class="empty">এখনো কেউ আবেদন করেনি</div>'}</div></div></div>`, () => {
    $('#se').onclick = () => schoolModal(sc); $('#sa').onclick = () => appModal(null, { school_id: sc.id }); bindApps();
  });
}

// ------------------------------------------------------------------ alerts (document expiry & deadlines)
const DOC_DATE = { passport: ['expires_on', 'মেয়াদ শেষ'], bank: ['issued_on', 'ইস্যুর তারিখ'], sponsor: ['issued_on', 'ইস্যুর তারিখ'] };
const REQUIRED_DOCS = ['photo', 'passport', 'nid', 'ssc', 'hsc', 'study_hours', 'sponsor', 'bank', 'relation'];
const docLabel = (k) => (DOC_TYPES.find(([x]) => x === k) || [k, k])[1];
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const addMonthsISO = (iso, m) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 10); };
function missingDocs(sid) { const got = new Set(S.documents.filter(d => d.student_id === sid && d.status !== 'missing').map(d => d.doc_type)); return REQUIRED_DOCS.filter(k => !got.has(k)); }
function docAlertFor(s, k) { return computeAlerts().find(a => a.sid === s.id && a.doc === k); }

let _alertsCache = null, _alertsKey = '';
function computeAlerts() {
  const key = [S.students.length, S.documents.length, S.applications.length, todayISO(), JSON.stringify([S.settings.alert_passport_months, S.settings.alert_fresh_days, S.settings.alert_deadline_days]), S.documents.map(d => d.expires_on + d.issued_on + d.status).join(), S.applications.map(a => a.status + a.deadline_on + a.interview_on).join(), S.students.map(s => s.status).join()].join('|');
  if (_alertsCache && key === _alertsKey) return _alertsCache;
  const t = todayISO(); const out = [];
  const pm = num(S.settings.alert_passport_months) || 6, fresh = num(S.settings.alert_fresh_days) || 90, dl = num(S.settings.alert_deadline_days) || 14;
  const openApps = (sid) => S.applications.filter(a => a.student_id === sid && appOpen(a) && APP_FLOW.indexOf(a.status) <= APP_FLOW.indexOf('coe_applied'));
  for (const s of S.students) {
    if (['dropped', 'japan'].includes(s.status)) continue;
    const docs = new Map(S.documents.filter(d => d.student_id === s.id).map(d => [d.doc_type, d]));
    const apps = openApps(s.id); const inProcess = apps.length > 0 || !['none', undefined, ''].includes(s.japan_stage);
    // passport validity
    const pp = docs.get('passport');
    if (pp && pp.expires_on) {
      const left = daysBetween(t, pp.expires_on);
      if (pp.expires_on < addMonthsISO(t, pm)) out.push({ level: left < 0 || pp.expires_on < addMonthsISO(t, 3) ? 'red' : 'amber', sid: s.id, doc: 'passport', what: 'পাসপোর্ট', issue: left < 0 ? `মেয়াদ শেষ হয়ে গেছে (${fmtD(pp.expires_on)})` : `মেয়াদ শেষ হবে ${fmtD(pp.expires_on)} (${left} দিন বাকি)`, date: pp.expires_on, go: `#/student/${s.id}?t=docs` });
    } else if (inProcess) out.push({ level: 'amber', sid: s.id, doc: 'passport', what: 'পাসপোর্ট', issue: pp && pp.status !== 'missing' ? 'মেয়াদ শেষের তারিখ লেখা নেই' : 'পাসপোর্ট জমা হয়নি', date: null, go: `#/student/${s.id}?t=docs` });
    // bank statement & sponsor income proof must be recent
    if (inProcess) for (const k of ['bank', 'sponsor']) {
      const d = docs.get(k); if (!d || d.status === 'missing' || !d.issued_on) continue;
      const age = daysBetween(d.issued_on, t);
      if (age > fresh - 21) out.push({ level: age > fresh ? 'red' : 'amber', sid: s.id, doc: k, what: docLabel(k), issue: age > fresh ? `${age} দিন পুরোনো, নতুন করে তুলতে হবে` : `${age} দিন পুরোনো, ${fresh - age} দিনের মধ্যে পুরোনো হয়ে যাবে`, date: isoAdd(d.issued_on, fresh), go: `#/student/${s.id}?t=docs` });
    }
    // application deadlines and interviews
    for (const a of apps) {
      const sc = byId(S.jp_schools, a.school_id);
      if (a.status === 'preparing' && a.deadline_on) {
        const left = daysBetween(t, a.deadline_on);
        if (left <= dl) { const miss = missingDocs(s.id); out.push({ level: left <= 3 ? 'red' : 'amber', sid: s.id, app: a.id, what: `আবেদনের শেষ তারিখ · ${schoolName(sc)}`, issue: (left < 0 ? `শেষ তারিখ পার হয়ে গেছে (${fmtD(a.deadline_on)})` : left === 0 ? 'আজই শেষ তারিখ' : `${left} দিন বাকি (${fmtD(a.deadline_on)})`) + (miss.length ? ` · ${miss.length}টি কাগজ বাকি: ${miss.map(docLabel).join(', ')}` : ' · সব কাগজ জমা হয়েছে'), date: a.deadline_on, go: `#/student/${s.id}?t=${miss.length ? 'docs' : 'japan'}` }); }
      }
      if (['submitted', 'interview'].includes(a.status) && a.interview_on) {
        const left = daysBetween(t, a.interview_on);
        if (left >= 0 && left <= 3) out.push({ level: 'amber', sid: s.id, app: a.id, what: `ইন্টারভিউ · ${schoolName(sc)}`, issue: left === 0 ? 'আজ ইন্টারভিউ' : `${left} দিন পর (${fmtD(a.interview_on)})`, date: a.interview_on, go: `#/student/${s.id}?t=japan` });
      }
    }
  }
  out.sort((x, y) => (x.level === y.level ? (x.date || '0000').localeCompare(y.date || '0000') : x.level === 'red' ? -1 : 1));
  _alertsCache = out; _alertsKey = key; return out;
}
const isoAdd = (iso, days) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
function docMsg(s, a) { return fillTpl(S.settings.wa_doc, { ...tplBase(), name: s.name_bn || s.name_en, doc: a.what, issue: a.issue }); }

function alertRows(list) {
  return `<table class="stack"><tr><th></th><th>ছাত্র</th><th>কী</th><th>সমস্যা</th><th></th></tr>${list.map(a => { const s = byId(S.students, a.sid); return `<tr class="click" data-go="${a.go}"><td class="mt" data-l=""><span>${a.level === 'red' ? badge('due', 'জরুরি') : badge('trial', 'শিগগির')} <b>${esc(studentName(s))}</b></span></td><td class="dm">${a.level === 'red' ? badge('due', 'জরুরি') : badge('trial', 'শিগগির')}</td><td class="dm" style="min-width:150px"><b>${esc(studentName(s))}</b><div class="small muted">${esc(s.admission_no)}</div></td><td data-l="কী" style="min-width:150px">${esc(a.what)}</td><td data-l="সমস্যা"><span class="cell">${esc(a.issue)}</span></td><td class="num" data-l="">${waBtn(guardianPhone(s), docMsg(s, a), '')}</td></tr>`; }).join('')}</table>`;
}
function viewAlerts(q) {
  const all = computeAlerts(); const f = q.get('l') || '';
  const list = all.filter(a => !f || a.level === f);
  const red = all.filter(a => a.level === 'red').length;
  const pm = num(S.settings.alert_passport_months) || 6, fresh = num(S.settings.alert_fresh_days) || 90, dl = num(S.settings.alert_deadline_days) || 14;
  mount('#/alerts', `
  <div class="top"><div><h1>সতর্কতা</h1><p>পাসপোর্টের মেয়াদ, পুরোনো ব্যাংক কাগজ, আবেদনের শেষ তারিখ আর ইন্টারভিউ</p></div><select id="al"><option value="">সব (${all.length})</option><option value="red" ${f === 'red' ? 'selected' : ''}>শুধু জরুরি (${red})</option><option value="amber" ${f === 'amber' ? 'selected' : ''}>শুধু শিগগির (${all.length - red})</option></select></div>
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card stat ${red ? 'red' : 'green'}"><div class="l">জরুরি</div><div class="v">${red}</div><div class="s">মেয়াদ শেষ বা তারিখ পার, এখনই দেখুন</div></div>
    <div class="card stat"><div class="l">শিগগির</div><div class="v">${all.length - red}</div><div class="s">সামনে আসছে, প্রস্তুতি নিন</div></div>
    <div class="card stat"><div class="l">কাগজ বাকি</div><div class="v">${S.students.filter(s => S.applications.some(a => a.student_id === s.id && appOpen(a)) && missingDocs(s.id).length).length}</div><div class="s">চলমান আবেদনের ছাত্র যাদের কাগজ অসম্পূর্ণ</div></div>
  </div>
  <div class="tw">${list.length ? alertRows(list) : '<div class="empty">কোনো সতর্কতা নেই। সব ঠিক আছে।</div>'}</div>
  <p class="small muted" style="margin-top:12px">নিয়ম: পাসপোর্টের মেয়াদ ${pm} মাসের কম থাকলে সতর্কতা (৩ মাসের কম হলে জরুরি)। ব্যাংক স্টেটমেন্ট আর আয়ের প্রমাণ ${fresh} দিনের বেশি পুরোনো হলে জরুরি। আবেদনের শেষ তারিখের ${dl} দিন আগে থেকে সতর্কতা। সংখ্যাগুলো সেটিংসে বদলানো যায়। তারিখগুলো ছাত্রের "কাগজপত্র" ট্যাবে লিখুন।</p>`, () => {
    bindGo(); $('#al').onchange = (e) => { location.hash = '#/alerts' + (e.target.value ? '?l=' + e.target.value : ''); };
  });
}

// ------------------------------------------------------------------ teachers & salary
const PAY_TYPE = { monthly: 'মাসিক নির্দিষ্ট বেতন', hourly: 'ঘণ্টা হিসেবে', per_class: 'ক্লাস হিসেবে' };
const PAY_UNIT = { monthly: '/ মাস', hourly: '/ ঘণ্টা', per_class: '/ ক্লাস' };
const monthEnd = (m) => { const [y, mo] = m.split('-').map(Number); return `${m}-${pad(new Date(y, mo, 0).getDate(), 2)}`; };
const monthLabel = (m) => { const n = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']; return `${n[num(m.slice(5)) - 1]} ${m.slice(0, 4)}`; };
function teacherMonth(t, m) {
  const ss = S.sessions.filter(s => s.teacher_id === t.id && (s.class_date || '').startsWith(m));
  const hours = ss.reduce((a, s) => a + num(s.hours), 0);
  const worked = (!t.joined_on || t.joined_on <= monthEnd(m)) && (!t.left_on || t.left_on >= m + '-01');
  const earned = t.pay_type === 'hourly' ? Math.round(hours * num(t.rate)) : t.pay_type === 'per_class' ? ss.length * num(t.rate) : (worked && (t.active !== false || ss.length) ? num(t.rate) : 0);
  const pays = S.expenses.filter(x => x.teacher_id === t.id && x.period === m);
  const paid = pays.reduce((a, x) => a + num(x.amount), 0);
  return { ss, classes: ss.length, hours: Math.round(hours * 10) / 10, earned, paid, due: Math.max(0, earned - paid), pays };
}
const lastMonths = (n, from = monthISO()) => { const out = []; const [y, mo] = from.split('-').map(Number); for (let i = 0; i < n; i++) { const d = new Date(y, mo - 1 - i, 1); out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}`); } return out; };

function teacherModal(t) {
  const v = t || { pay_type: 'hourly', joined_on: todayISO(), active: true, levels: 'N5' };
  openModal(`<h2>${t ? 'শিক্ষকের তথ্য' : 'নতুন শিক্ষক'}</h2><form class="form" id="tf">
    <label class="f">নাম<input name="name" required value="${esc(v.name || '')}"></label>
    <label class="f">মোবাইল / WhatsApp<input name="phone" type="tel" value="${esc(v.phone || '')}"></label>
    <label class="f">ইমেইল<input name="email" type="email" value="${esc(v.email || '')}"></label>
    <label class="f">NID<input name="nid" value="${esc(v.nid || '')}"></label>
    <label class="f full">ঠিকানা<input name="address" value="${esc(v.address || '')}"></label>
    <label class="f">কোন লেভেল পড়ান<input name="levels" value="${esc(v.levels || '')}" placeholder="N5, N4"></label>
    <label class="f">যোগ্যতা<input name="qualification" value="${esc(v.qualification || '')}" placeholder="যেমন: JLPT N2, জাপানে ৫ বছর"></label>
    <label class="f">বেতনের ধরন<select name="pay_type">${Object.entries(PAY_TYPE).map(([k, l]) => `<option value="${k}" ${v.pay_type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span id="rl">হার (৳ ${PAY_UNIT[v.pay_type]})</span><input name="rate" type="number" min="0" step="1" required value="${esc(v.rate ?? '')}"></label>
    <label class="f">যোগদানের তারিখ<input name="joined_on" type="date" value="${esc(v.joined_on || '')}"></label>
    <label class="f">অবস্থা<select name="active"><option value="yes" ${v.active !== false ? 'selected' : ''}>কাজ করছেন</option><option value="no" ${v.active === false ? 'selected' : ''}>এখন নেই</option></select></label>
    <label class="f full">নোট<textarea name="notes" placeholder="যেমন: বিকাশ নম্বর, ক্লাসের সময়">${esc(v.notes || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end">${t && isAdmin() ? '<button type="button" class="btn ghost" id="td" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="tc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  const f = $('#tf'); $('#tc').onclick = closeModal;
  f.pay_type.onchange = () => { $('#rl').textContent = `হার (৳ ${PAY_UNIT[f.pay_type.value]})`; };
  const del = $('#td'); if (del) del.onclick = async () => {
    if (S.sessions.some(s => s.teacher_id === t.id) || S.expenses.some(x => x.teacher_id === t.id)) { closeModal(); return toast('এই শিক্ষকের ক্লাস বা বেতনের রেকর্ড আছে, তাই মোছা যাবে না। অবস্থা "এখন নেই" করে দিন।', true); }
    closeModal(); if (!(await confirmBox(`${t.name}-এর তথ্য মুছে যাবে।`))) return;
    try { await API.remove('teachers', t.id); S.teachers = S.teachers.filter(x => x.id !== t.id); toast('মুছে ফেলা হয়েছে'); location.hash = '#/teachers'; } catch (e) { toast(errMsg(e), true); }
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); const d = formData(f); d.active = d.active !== 'no';
    if (!d.active && !(t && t.left_on)) d.left_on = todayISO(); if (d.active) d.left_on = null;
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try { const row = t ? await API.update('teachers', t.id, d) : await API.insert('teachers', d); putLocal('teachers', row); closeModal(); toast('সংরক্ষণ হয়েছে'); if (t) render(); else location.hash = '#/teacher/' + row.id; }
    catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}

function salaryModal(t, m) {
  const tm = teacherMonth(t, m);
  openModal(`<h2>বেতন দিন — ${esc(t.name)}</h2>
    <div class="card" style="margin-bottom:12px;padding:12px"><dl class="kv" style="margin:0"><dt>মাস</dt><dd>${monthLabel(m)}</dd><dt>হিসাব</dt><dd>${t.pay_type === 'monthly' ? 'মাসিক ' + tk(t.rate) : `${tm.classes}টি ক্লাস · ${tm.hours} ঘণ্টা × ${tk(t.rate)} ${PAY_UNIT[t.pay_type]}`}</dd><dt>মোট পাওনা</dt><dd><b>${tk(tm.earned)}</b></dd><dt>আগে দেওয়া</dt><dd>${tk(tm.paid)}</dd><dt>বাকি</dt><dd><b style="color:var(--red)">${tk(tm.due)}</b></dd></dl></div>
    <form class="form" id="sf">
    <label class="f">টাকার পরিমাণ (৳)<input name="amount" type="number" min="1" step="1" required value="${tm.due || ''}"></label>
    <label class="f">তারিখ<input name="spent_on" type="date" required value="${todayISO()}"></label>
    <label class="f">মাধ্যম<select name="method">${Object.entries(METHOD).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label class="f">নোট<input name="note" value="${esc(monthLabel(m))} মাসের বেতন"></label>
    <p class="full small muted" style="margin:0">এটা "খরচ ও লাভ"-এ বেতন হিসেবে উঠবে। ভুল হলে খরচের পাতা থেকে অ্যাডমিন মুছতে পারবেন।</p>
    <div class="full row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="sc">বাতিল</button><button class="btn" type="submit">বেতন দিন ও রশিদ প্রিন্ট</button></div></form>`);
  $('#sc').onclick = closeModal;
  $('#sf').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target);
    if (!(d.amount > 0)) return toast('সঠিক টাকার পরিমাণ দিন', true);
    if (d.amount > tm.due && tm.due > 0 && !(await confirmBox(`বাকি ${tk(tm.due)}, কিন্তু দিচ্ছেন ${tk(d.amount)}। তবুও দেবেন?`, 'হ্যাঁ, দিন'))) return;
    const btn = e.target.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
    try { const x = await API.insert('expenses', { ...d, category: 'salary', paid_to: t.name, teacher_id: t.id, period: m }); putLocal('expenses', x); closeModal(); toast('বেতন দেওয়া হয়েছে'); render(); printSalarySlip(x); }
    catch (err) { toast(errMsg(err), true); if (btn) btn.disabled = false; }
  };
}

function viewTeachers(q) {
  const m = q.get('m') || monthISO(); const showAll = q.get('all') === '1';
  const list = S.teachers.filter(t => showAll || t.active !== false || teacherMonth(t, m).classes).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const rows = list.map(t => ({ t, tm: teacherMonth(t, m) }));
  const tot = rows.reduce((a, r) => ({ c: a.c + r.tm.classes, h: a.h + r.tm.hours, e: a.e + r.tm.earned, p: a.p + r.tm.paid, d: a.d + r.tm.due }), { c: 0, h: 0, e: 0, p: 0, d: 0 });
  const noTeacher = S.sessions.filter(s => !s.teacher_id && (s.class_date || '').startsWith(m)).length;
  mount('#/teachers', `
  <div class="top"><div><h1>শিক্ষক ও বেতন</h1><p>ক্লাস আর ঘণ্টা থেকে মাসিক বেতনের হিসাব</p></div><div class="row"><input type="month" id="mon" value="${esc(m)}">${isAdmin() ? '<button class="btn" id="nt">+ নতুন শিক্ষক</button>' : ''}</div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">${monthLabel(m)}-এ ক্লাস</div><div class="v">${tot.c}</div><div class="s">${Math.round(tot.h * 10) / 10} ঘণ্টা</div></div>
    <div class="card stat"><div class="l">মোট বেতন (পাওনা)</div><div class="v">${tk(tot.e)}</div></div>
    <div class="card stat green"><div class="l">দেওয়া হয়েছে</div><div class="v">${tk(tot.p)}</div></div>
    <div class="card stat ${tot.d ? 'red' : ''}"><div class="l">বাকি</div><div class="v">${tk(tot.d)}</div></div>
  </div>
  ${noTeacher ? `<div class="alertbar" style="margin-bottom:14px"><b>${noTeacher}টি ক্লাসে শিক্ষক বেছে নেওয়া হয়নি</b><span>হাজিরার পাতায় ক্লাস খুলে "শিক্ষক" বেছে দিন, না হলে ঘণ্টার বেতন কম আসবে।</span></div>` : ''}
  <div class="tw">${rows.length ? `<table class="stack"><tr><th>শিক্ষক</th><th>বেতনের ধরন</th><th class="num">ক্লাস · ঘণ্টা</th><th class="num">পাওনা</th><th class="num">দেওয়া</th><th class="num">বাকি</th><th></th></tr>${rows.map(({ t, tm }) => `<tr class="click" data-go="#/teacher/${t.id}?m=${m}"><td class="mt" data-l=""><span><b>${esc(t.name)}</b></span></td><td class="dm"><b>${esc(t.name)}</b>${t.active === false ? ' ' + badge('dropped', 'এখন নেই') : ''}<div class="small muted">${esc(t.levels || '')}</div></td><td data-l="বেতনের ধরন">${esc(PAY_TYPE[t.pay_type] || '')}<div class="small muted">${tk(t.rate)} ${PAY_UNIT[t.pay_type] || ''}</div></td><td class="num" data-l="ক্লাস · ঘণ্টা">${tm.classes} · ${tm.hours}</td><td class="num" data-l="পাওনা">${tk(tm.earned)}</td><td class="num" data-l="দেওয়া">${tk(tm.paid)}</td><td class="num" data-l="বাকি">${tm.due ? `<b style="color:var(--red)">${tk(tm.due)}</b>` : badge('paid', tm.earned ? 'পরিশোধিত' : '—')}</td><td class="num" data-l="">${isAdmin() && tm.due ? `<button class="btn sm gold" data-pay="${t.id}" data-stop>বেতন দিন</button>` : ''}</td></tr>`).join('')}</table>` : `<div class="empty">${S.teachers.length ? 'এই মাসে কোনো শিক্ষক নেই' : 'এখনো কোনো শিক্ষক যোগ করা হয়নি। "+ নতুন শিক্ষক" দিয়ে শুরু করুন।'}</div>`}</div>
  <p class="small muted" style="margin-top:10px"><label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="tall" ${showAll ? 'checked' : ''}> যারা এখন নেই তাদেরও দেখান</label> · ঘণ্টা/ক্লাস হিসেবে বেতন হাজিরার পাতায় বেছে নেওয়া শিক্ষক থেকে হিসাব হয়।</p>`, () => {
    $('#mon').onchange = (e) => { location.hash = '#/teachers?m=' + e.target.value + (showAll ? '&all=1' : ''); };
    $('#tall').onchange = (e) => { location.hash = '#/teachers?m=' + m + (e.target.checked ? '&all=1' : ''); };
    const nt = $('#nt'); if (nt) nt.onclick = () => teacherModal(null);
    bindGo(); $$('[data-pay]').forEach(b => b.onclick = (e) => { e.stopPropagation(); salaryModal(byId(S.teachers, b.dataset.pay), m); });
  });
}


// ------------------------------------------------------------------ teachers' notes: for every lesson of the さくら日本語 N5/N4 books — the goal and a 120-minute plan for each class
let TN_LOADING = null;
function loadTnotes() { if (window.TNOTES) return Promise.resolve(window.TNOTES); if (!TN_LOADING) TN_LOADING = new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'teacher-notes.js?v=2'; sc.onload = () => ok(window.TNOTES); sc.onerror = () => { TN_LOADING = null; no(new Error('নোট লোড করা যায়নি — ইন্টারনেট দেখে আবার চেষ্টা করুন')); }; document.head.appendChild(sc); }); return TN_LOADING; }
const TN_BN = (n) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const tnTabs = (cur) => [['N5', 'N5'], ['N4', 'N4'], ['app', '📱 অ্যাপ নির্দেশিকা']].map(([k, l]) => `<a class="tnt ${k === cur ? 'on' : ''}" href="#/tnotes/${k}">${l}</a>`).join('');
function tnLessonPrint(u, lv) {
  const clock = (rows) => { let t = 0; return rows.map(r => { const a = t; t += r[0]; return [a, t, ...r]; }); };
  return `<div style="padding:14px 4px"><div style="font-size:12px;color:#6E665A">শিক্ষকের নোট · さくら日本語 ${lv} · পাঠ ${esc(String(u.no))}</div><h2 style="margin:2px 0;font:700 22px 'Shippori Mincho B1',serif">${fx(u.title)}</h2><div>${esc(u.titleBn)} · ${TN_BN(u.classes.length)}টি ক্লাস</div>
      <p style="background:#F6F0E4;padding:8px 10px;border-radius:6px"><b>🎯 লক্ষ্য:</b> ${esc(u.cando)}</p>${u.grammar.length ? `<b>ব্যাকরণ:</b><ol style="margin-top:2px">${u.grammar.map(g => `<li>${fx(g)}</li>`).join('')}</ol>` : ''}
      ${(u.gx || []).map((g, i) => `<div style="border-top:1px solid #D8CDB9;padding:8px 0;break-inside:avoid"><b style="font-size:15px">${i + 1}. ${fx(g.pt)}</b><div style="font-size:13px;line-height:1.6;margin:3px 0">${fx(g.bn)}</div>${g.ex.map(e => `<div style="font-size:13px">・${fx(e[0])} <small style="color:#6E665A">${esc(e[1] || '')}</small></div>`).join('')}<div style="font-size:12.5px;margin-top:4px"><b>⚠️ সাধারণ ভুল:</b> ${fx(g.err)}<br><b>🧑‍🏫 কীভাবে পড়াবেন:</b> ${fx(g.how)}</div></div>`).join('')}
      ${u.classes.map(c => `<h3 style="margin:14px 0 4px">${esc(c.t)}</h3><table><tr><th style="width:18%">সময়</th><th>কী করবেন</th></tr>${clock(c.rows).map(([a, b, m, what, how]) => `<tr><td>${TN_BN(m)} মি <small>(${TN_BN(a)}–${TN_BN(b)})</small></td><td><b>${fx(what)}</b>${how ? `<br><small>${esc(how)}</small>` : ''}</td></tr>`).join('')}</table>`).join('')}</div>`;
}
function viewTnotesApp() {
  const A = window.TNOTES.app || [];
  mount('#/tnotes', `<div class="top"><div><h1>শিক্ষকের নোট</h1><p>অ্যাপ নির্দেশিকা — ছাত্রদের অ্যাপ আর শিক্ষকের পোর্টাল কীভাবে কাজ করে, আর বইয়ের সাথে কীভাবে ব্যবহার করবেন</p></div><div class="row"><div class="tntabs">${tnTabs('app')}</div><button class="btn ghost" id="tnprintapp">🖨 প্রিন্ট</button></div></div>
  ${A.map(sec => `<div class="card tnc"><h3>${sec.ic} ${esc(sec.t)}</h3><div class="tnapp">${sec.items.map(([t, d]) => `<div><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('')}</div></div>`).join('')}`, () => {
    $('#tnprintapp').onclick = () => printWindow('App guide for teachers', headHtml() + `<style>@page{size:A4;margin:8mm}.ag table{font-size:12px;line-height:1.5}.ag td,.ag th{padding:5px 7px}.hd{padding:8px 12px}.km{width:40px;height:40px}.t1{font-size:16px}</style><div class="ag" style="padding:6px 2px"><h2 style="margin:0 0 2px;font:800 17px 'Shippori Mincho B1',serif">শিক্ষকের নোট · অ্যাপ নির্দেশিকা</h2>${A.map(sec => `<h3 style="margin:10px 0 4px;font-size:14px">${sec.ic} ${esc(sec.t)}</h3><table>${sec.items.map(([t, d]) => `<tr><th style="width:19%">${esc(t)}</th><td>${esc(d)}</td></tr>`).join('')}</table>`).join('')}</div>`);
  });
}
function viewTnotes(lv, id) {
  const isApp = lv === 'app'; lv = lv === 'N4' ? 'N4' : 'N5';
  if (!window.TNOTES) { mount('#/tnotes', `<div class="top"><div><h1>শিক্ষকের নোট</h1></div></div><div class="card"><div class="empty">লোড হচ্ছে…</div></div>`); loadTnotes().then(() => { if (location.hash.startsWith('#/tnotes')) viewTnotes(isApp ? 'app' : lv, id); }).catch(e => toast(e.message, true)); return; }
  if (isApp) return viewTnotesApp();
  const L = window.TNOTES[lv]; const u = L.find(x => x.id === id) || L[0];
  const all = L.reduce((a, x) => a + x.classes.length, 0);
  const tabs = tnTabs(lv);
  const list = L.map(x => `<a class="tnl ${x.id === u.id ? 'on' : ''}" href="#/tnotes/${lv}/${x.id}"><span class="tnn">${esc(String(x.no))}</span><span class="tnx"><b>${fx(x.title)}</b><small>${esc(x.titleBn)} · ${TN_BN(x.classes.length)}টি ক্লাস</small></span></a>`).join('');
  const clock = (rows) => { let t = 0; return rows.map(r => { const a = t; t += r[0]; return [a, t, ...r]; }); };
  const classes = u.classes.map((c, i) => `<div class="card tnc"><h3>${esc(c.t)}</h3><div class="tw"><table class="tnt2"><tr><th style="width:92px">সময়</th><th>কী করবেন</th></tr>
    ${clock(c.rows).map(([a, b, m, what, how]) => `<tr class="${what === 'বিরতি' ? 'brk' : ''}"><td><b>${TN_BN(m)} মিনিট</b><small>${TN_BN(a)}–${TN_BN(b)}</small></td><td><b>${fx(what)}</b>${how ? `<div class="small muted">${esc(how)}</div>` : ''}</td></tr>`).join('')}</table></div></div>`).join('');
  const body = `<div class="card tnh"><div class="tnh1"><div><div class="small muted">পাঠ ${esc(String(u.no))}</div><h2 class="tnttl">${fx(u.title)} <button class="tnsay" type="button" data-tsay="${esc(u.title)}" aria-label="শুনুন" title="শুনুন">🔊</button></h2><div>${esc(u.titleBn)}</div></div><div class="tnbadge">${TN_BN(u.classes.length)}টি ক্লাস<br><small>${TN_BN(u.classes.length * 2)} ঘণ্টা</small></div></div>
    <div class="tngoal"><b>🎯 পাঠের লক্ষ্য</b><p>${esc(u.cando)}</p></div>
    ${u.grammar.length ? `<div class="tnsec"><b>এই পাঠের ব্যাকরণ</b><ol>${u.grammar.map(g => `<li>${fx(g)}</li>`).join('')}</ol></div>` : ''}
    <div class="tnmeta"><span>📖 নতুন শব্দ: <b>${TN_BN(u.vocab)}টি</b></span><span>✍️ অনুশীলনী: <b>${TN_BN(u.ex)}টি</b></span>${u.kanji.length ? `<span>漢 কানজি: <b class="jp">${esc(u.kanji.join(' '))}</b></span>` : ''}</div></div>
    ${(u.gx || []).length ? `<div class="card tnc"><h3>📘 ব্যাকরণ — শিক্ষকের জন্য ব্যাখ্যা</h3>${u.gx.map((g, i) => `<div class="tng"><div class="tngh"><span>${TN_BN(i + 1)}</span><b>${fx(g.pt)}</b></div>
      <p class="tngb">${fx(g.bn)}</p>${g.ex.length ? `<div class="tnex">${g.ex.map(e => `<div><button class="tnsay" type="button" data-tsay="${esc(e[0])}" aria-label="শুনুন" title="শুনুন">🔊</button><span class="jp">${fx(e[0])}</span><small>${esc(e[1] || '')}</small></div>`).join('')}</div>` : ''}
      <div class="tntip"><div><b>⚠️ ছাত্রদের সাধারণ ভুল</b><p>${fx(g.err)}</p></div><div><b>🧑‍🏫 কীভাবে পড়াবেন</b><p>${fx(g.how)}</p></div></div></div>`).join('')}</div>` : ''}
    ${classes}`;
  mount('#/tnotes', `<div class="top"><div><h1>শিক্ষকের নোট</h1><p>さくら日本語 ${lv} বই · ${TN_BN(L.length)}টি পাঠ · মোট ${TN_BN(all)}টি ক্লাস (${TN_BN(all * 2)} ঘণ্টা) · প্রতি ক্লাস ১২০ মিনিট</p></div><div class="row"><div class="tntabs">${tabs}</div><button class="btn ghost" id="tnprint">🖨 এই পাঠ প্রিন্ট</button><button class="btn ghost" id="tnprintall">🖨 পুরো ${lv} নোট প্রিন্ট</button></div></div>
  <div class="tngrid"><nav class="card tnlist" aria-label="পাঠের তালিকা">${list}</nav><div class="tnbody">${body}</div></div>`, () => {
    $('#tnprint').onclick = () => printWindow('Teacher notes ' + lv + ' ' + u.no, headHtml() + tnLessonPrint(u, lv));
    $('#tnprintall').onclick = () => printWindow('Teacher notes ' + lv, headHtml() + `<div style="padding:30px 4px"><h1 style="font:800 26px 'Shippori Mincho B1',serif;margin:0">শিক্ষকের নোট · さくら日本語 ${lv}</h1><p>${TN_BN(L.length)}টি পাঠ · মোট ${TN_BN(all)}টি ক্লাস (${TN_BN(all * 2)} ঘণ্টা) · প্রতি ক্লাস ১২০ মিনিট</p><ol style="columns:2;line-height:2">${L.map(x => `<li>${fx(x.title)} <small>(${esc(x.titleBn)})</small></li>`).join('')}</ol></div>` + L.map(x => `<div style="break-before:page">${tnLessonPrint(x, lv)}</div>`).join(''));
    $$('[data-tsay]').forEach(b => b.onclick = () => sayJa(b.dataset.tsay));
    const on = $('.tnl.on'); if (on && matchMedia('(min-width:861px)').matches) on.scrollIntoView({ block: 'nearest' });
  });
}
function viewTeacher(id, q) {
  const t = byId(S.teachers, id);
  if (!t) return mount('#/teachers', '<div class="empty">শিক্ষক পাওয়া যায়নি</div>');
  const m = q.get('m') || monthISO(); const tm = teacherMonth(t, m);
  const hist = lastMonths(12).map(x => ({ m: x, ...teacherMonth(t, x) })).filter(r => r.classes || r.earned || r.paid);
  const pays = S.expenses.filter(x => x.teacher_id === t.id).sort((a, b) => (b.spent_on || '').localeCompare(a.spent_on || ''));
  const kv = [['মোবাইল', t.phone], ['ইমেইল', t.email], ['NID', t.nid], ['ঠিকানা', t.address], ['লেভেল', t.levels], ['যোগ্যতা', t.qualification], ['বেতন', `${PAY_TYPE[t.pay_type] || ''} · ${tk(t.rate)} ${PAY_UNIT[t.pay_type] || ''}`], ['যোগদান', fmtD(t.joined_on)], ['নোট', t.notes]];
  mount('#/teachers', `
  <div class="top"><div><h1>${esc(t.name)}</h1><p>${esc(t.levels || '')}${t.active === false ? ' · এখন নেই' : ''}</p></div><div class="row">${t.phone ? waBtn(t.phone, `আসসালামু আলাইকুম ${t.name}। ${S.settings.institute_bn} থেকে বলছি। `, 'WhatsApp') : ''}${isAdmin() ? '<button class="btn ghost" id="te">সম্পাদনা</button>' : ''}<input type="month" id="mon" value="${esc(m)}">${isAdmin() && tm.due ? '<button class="btn gold" id="tp">বেতন দিন</button>' : ''}</div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">${monthLabel(m)}-এ ক্লাস</div><div class="v">${tm.classes}</div><div class="s">${tm.hours} ঘণ্টা</div></div>
    <div class="card stat"><div class="l">পাওনা</div><div class="v">${tk(tm.earned)}</div></div>
    <div class="card stat green"><div class="l">দেওয়া হয়েছে</div><div class="v">${tk(tm.paid)}</div></div>
    <div class="card stat ${tm.due ? 'red' : ''}"><div class="l">বাকি</div><div class="v">${tk(tm.due)}</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><h2>তথ্য</h2><dl class="kv">${kv.map(([k, x]) => `<dt>${k}</dt><dd>${esc(x || '—')}</dd>`).join('')}</dl></div>
    <div class="card"><h2>মাসভিত্তিক হিসাব</h2>${hist.length ? `<div class="tw"><table><tr><th>মাস</th><th class="num">ক্লাস</th><th class="num">পাওনা</th><th class="num">দেওয়া</th><th class="num">বাকি</th></tr>${hist.map(r => `<tr class="click" data-go="#/teacher/${t.id}?m=${r.m}"><td>${monthLabel(r.m)}</td><td class="num">${r.classes}</td><td class="num">${tk(r.earned)}</td><td class="num">${tk(r.paid)}</td><td class="num">${r.due ? `<b style="color:var(--red)">${tk(r.due)}</b>` : '—'}</td></tr>`).join('')}</table></div>` : '<div class="empty">এখনো কোনো হিসাব নেই</div>'}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>${monthLabel(m)}-এর ক্লাস</h2>${tm.ss.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>লেভেল · ব্যাচ</th><th class="hide-m">বিষয়</th><th class="num">ঘণ্টা</th></tr>${[...tm.ss].sort((a, b) => a.class_date.localeCompare(b.class_date)).map(s => `<tr class="click" data-go="#/attendance?d=${s.class_date}&l=${s.level}&b=${s.batch}"><td>${fmtD(s.class_date)}</td><td>${esc(s.level)} · ${esc(BATCH[s.batch] || '')}</td><td class="hide-m">${esc(s.topic || '—')}</td><td class="num">${num(s.hours)}</td></tr>`).join('')}</table></div>` : '<div class="empty">এই মাসে কোনো ক্লাস নেই</div>'}</div>
    <div class="card"><h2>বেতন দেওয়ার রেকর্ড</h2>${pays.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>মাস</th><th class="num">টাকা</th><th></th></tr>${pays.map(x => `<tr><td>${fmtD(x.spent_on)}</td><td>${x.period ? monthLabel(x.period) : '—'}</td><td class="num"><b>${tk(x.amount)}</b></td><td class="num"><button class="btn sm ghost" data-slip="${x.id}">রশিদ</button></td></tr>`).join('')}</table></div>` : '<div class="empty">এখনো বেতন দেওয়া হয়নি</div>'}</div>
  </div>`, () => {
    bindGo();
    $('#mon').onchange = (e) => { location.hash = `#/teacher/${t.id}?m=${e.target.value}`; };
    const te = $('#te'); if (te) te.onclick = () => teacherModal(t);
    const tp = $('#tp'); if (tp) tp.onclick = () => salaryModal(t, m);
    $$('[data-slip]').forEach(b => b.onclick = () => printSalarySlip(byId(S.expenses, b.dataset.slip)));
  });
}

function printSalarySlip(x) {
  if (!x) return; const t = byId(S.teachers, x.teacher_id) || { name: x.paid_to };
  const m = x.period || (x.spent_on || '').slice(0, 7); const tm = t.id ? teacherMonth(t, m) : null;
  printWindow('Salary ' + (t.name || ''), `<div style="border:1.5px solid #A3843A">${headHtml()}
  <div style="padding:16px 20px"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px"><div><div style="font:700 11px 'Shippori Mincho B1';letter-spacing:3px;color:#A3843A">SALARY SLIP</div><div style="font:800 20px 'Noto Serif Bengali'">বেতনের রশিদ</div></div><div style="text-align:right;font-size:13px">তারিখ: <b>${fmtD(x.spent_on)}</b></div></div>
  <table><tr><th>শিক্ষকের নাম</th><td>${esc(t.name || '')}</td></tr><tr><th>মাস</th><td>${monthLabel(m)}</td></tr>
  ${tm ? `<tr><th>ক্লাস · ঘণ্টা</th><td>${tm.classes}টি ক্লাস · ${tm.hours} ঘণ্টা</td></tr><tr><th>বেতনের হার</th><td>${esc(PAY_TYPE[t.pay_type] || '')} · ${tk(t.rate)} ${PAY_UNIT[t.pay_type] || ''}</td></tr><tr><th>মোট পাওনা</th><td>${tk(tm.earned)}</td></tr>` : ''}
  <tr><th>এবার দেওয়া হলো</th><td><b style="font-size:17px;color:#C8372B">${tk(x.amount)}</b><br><span style="font-size:12px">In words: Taka ${words(x.amount)} only</span></td></tr>
  <tr><th>মাধ্যম</th><td>${esc(METHOD[x.method] || x.method)}</td></tr>
  ${tm ? `<tr><th>এই মাসে মোট দেওয়া · বাকি</th><td>${tk(tm.paid)} · <b>${tk(tm.due)}</b></td></tr>` : ''}${x.note ? `<tr><th>নোট</th><td>${esc(x.note)}</td></tr>` : ''}</table>
  <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:12.5px"><div style="border-top:1px dotted #8A7F6C;width:40%;padding-top:4px">গ্রহণকারীর স্বাক্ষর (শিক্ষক)</div><div style="border-top:1px dotted #8A7F6C;width:40%;padding-top:4px;text-align:right">প্রদানকারীর স্বাক্ষর ও সিল</div></div></div></div>`);
}

// ------------------------------------------------------------------ activity log (admin only)
const AUD_TABLE = { students: 'ছাত্র', payments: 'টাকা জমা', sessions: 'ক্লাস', attendance: 'হাজিরা', documents: 'কাগজপত্র', expenses: 'খরচ', inquiries: 'আগ্রহী ছাত্র', exams: 'পরীক্ষা', exam_results: 'নম্বর', jp_schools: 'জাপানি স্কুল', applications: 'জাপান আবেদন', teachers: 'শিক্ষক', commissions: 'কমিশন', holidays: 'ছুটি', settings: 'সেটিংস', profiles: 'স্টাফ' };
const AUD_ACT = { insert: ['যোগ', 'active'], update: ['বদল', 'trial'], delete: ['মুছেছে', 'due'] };
const MONEY_TABLES = ['payments', 'expenses'];
const AUD_FIELD = { name_bn: 'বাংলা নাম', name_en: 'ইংরেজি নাম', phone: 'ফোন', guardian_phone: 'অভিভাবকের ফোন', guardian_name: 'অভিভাবক', total_fee: 'মোট ফি', discount: 'ছাড়', next_due_date: 'পরের কিস্তি', status: 'অবস্থা', current_level: 'লেভেল', batch: 'ব্যাচ', package: 'প্যাকেজ', amount: 'টাকা', paid_on: 'তারিখ', spent_on: 'তারিখ', method: 'মাধ্যম', receipt_no: 'রশিদ নং', purpose: 'বাবদ', category: 'খাত', paid_to: 'কাকে', note: 'নোট', notes: 'নোট', japan_stage: 'জাপান ধাপ', target_school: 'স্কুল', intake: 'সেশন', passport_no: 'পাসপোর্ট নং', nid: 'NID', address_present: 'ঠিকানা', marks: 'নম্বর', absent: 'অনুপস্থিত', doc_type: 'কাগজ', file_path: 'ফাইল', expires_on: 'মেয়াদ', issued_on: 'ইস্যুর তারিখ', rate: 'বেতনের হার', processing_fee: 'প্রসেসিং ফি', amount_bdt: 'টাকা (৳)', amount_yen: 'টাকা (¥)', pay_type: 'বেতনের ধরন', hours: 'ঘণ্টা', topic: 'বিষয়', teacher_id: 'শিক্ষক', deadline_on: 'শেষ তারিখ', interview_on: 'ইন্টারভিউ', result_on: 'COE-র ফল', title: 'নাম', max_marks: 'পূর্ণ নম্বর', role: 'ভূমিকা', data: 'সেটিংস', active: 'কাজ চলছে', school_id: 'স্কুল' };
const AUD_HIDE = ['id', 'created_at', 'created_by', 'updated_at'];

function audValue(k, v) {
  if (v == null || v === '') return '—';
  if (['amount', 'total_fee', 'discount', 'rate', 'processing_fee', 'amount_bdt'].includes(k)) return tk(v); if (k === 'amount_yen') return yen(v);
  if (/_on$|_date$|^dob$/.test(k) && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return fmtD(String(v).slice(0, 10));
  if (k === 'status') return STATUS[v] || APP_ST[v] || ATT[v] || DOC_STATUS[v] || LEAD_ST[v] || v;
  if (k === 'method') return METHOD[v] || v; if (k === 'purpose') return PURPOSE[v] || v; if (k === 'pay_type') return PAY_TYPE[v] || v; if (k === 'role') return ROLE_NAME[v] || v; if (k === 'category') return EXP_CAT[v] || v; if (k === 'batch') return BATCH[v] || v;
  if (k === 'teacher_id') { const t = byId(S.teachers, v); return t ? t.name : 'শিক্ষক'; }
  if (k === 'school_id') { const t = byId(S.jp_schools, v); return t ? schoolName(t) : 'স্কুল'; }
  if (k === 'doc_type') return docLabel(v);
  if (typeof v === 'boolean') return v ? 'হ্যাঁ' : 'না';
  if (typeof v === 'object') return 'বদলেছে';
  const sv = String(v); return sv.length > 60 ? sv.slice(0, 58) + '…' : sv;
}
function audSubject(e) {
  const r = e.new_data || e.old_data || {}; const cur = S[e.table_name] && e.row_id ? byId(S[e.table_name], e.row_id) : null; const x = { ...(cur || {}), ...r };
  const st = byId(S.students, e.student_id || x.student_id);
  switch (e.table_name) {
    case 'students': return `${x.name_bn || x.name_en || ''} ${x.admission_no ? '· ' + x.admission_no : ''}`;
    case 'payments': return `${x.receipt_no || ''} · ${tk(x.amount)}${st ? ' · ' + studentName(st) : ''}`;
    case 'expenses': return `${EXP_CAT[x.category] || x.category || ''} · ${tk(x.amount)}${x.paid_to ? ' · ' + x.paid_to : ''}`;
    case 'sessions': return `${fmtD(x.class_date)} · ${x.level || ''} ${BATCH[x.batch] || ''}`;
    case 'attendance': { const ss = byId(S.sessions, x.session_id); return `${st ? studentName(st) : ''}${ss ? ' · ' + fmtD(ss.class_date) : ''}`; }
    case 'documents': return `${st ? studentName(st) + ' · ' : ''}${docLabel(x.doc_type || '')}`;
    case 'inquiries': return x.name || '';
    case 'exams': return x.title || '';
    case 'exam_results': { const ex = byId(S.exams, x.exam_id); return `${st ? studentName(st) : ''}${ex ? ' · ' + ex.title : ''}`; }
    case 'jp_schools': return x.name_ja || x.name_en || '';
    case 'applications': return `${st ? studentName(st) : ''}${x.school_id ? ' · ' + schoolName(byId(S.jp_schools, x.school_id)) : ''}`;
    case 'teachers': return x.name || '';
    case 'holidays': return `${fmtD(x.on_date)} · ${x.title || ''}`;
    case 'profiles': return x.name || '';
    default: return '';
  }
}
function audLink(e) {
  const x = { ...(e.old_data || {}), ...(e.new_data || {}) };
  if (e.action === 'delete' && ['students', 'teachers', 'exams', 'jp_schools'].includes(e.table_name)) return '';
  if (e.table_name === 'students') return `#/student/${e.row_id}`;
  if (e.student_id && byId(S.students, e.student_id)) return `#/student/${e.student_id}${e.table_name === 'payments' ? '?t=fees' : e.table_name === 'documents' ? '?t=docs' : e.table_name === 'applications' ? '?t=japan' : e.table_name === 'exam_results' ? '?t=exams' : ''}`;
  if (e.table_name === 'teachers') return `#/teacher/${e.row_id}`;
  if (e.table_name === 'exams') return `#/exam/${e.row_id}`;
  if (e.table_name === 'jp_schools') return `#/school/${e.row_id}`;
  if (e.table_name === 'expenses') return `#/expenses?m=${(x.spent_on || '').slice(0, 7)}`;
  if (e.table_name === 'inquiries') return '#/leads?st=all';
  return '';
}
function audDetail(e) {
  if (e.action === 'update') return Object.keys(e.new_data || {}).filter(k => !AUD_HIDE.includes(k) && audValue(k, (e.old_data || {})[k]) !== audValue(k, e.new_data[k])).map(k => `<div><span class="muted">${esc(AUD_FIELD[k] || k)}:</span> <s>${esc(audValue(k, (e.old_data || {})[k]))}</s> → <b>${esc(audValue(k, e.new_data[k]))}</b></div>`).join('');
  const d = e.new_data || e.old_data || {};
  const keys = Object.keys(d).filter(k => !AUD_HIDE.includes(k) && d[k] != null && d[k] !== '' && AUD_FIELD[k] && !['student_id'].includes(k)).slice(0, 5);
  return keys.map(k => `<span class="muted">${esc(AUD_FIELD[k])}:</span> ${esc(audValue(k, d[k]))}`).join(' · ');
}
const fmtDT = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${pad(d.getDate(), 2)}-${pad(d.getMonth() + 1, 2)}-${d.getFullYear()} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`; };
function audRows(list, { showWhere = true } = {}) {
  return `<table class="stack"><tr><th>সময়</th><th>কে</th><th>কাজ</th>${showWhere ? '<th>কোথায়</th>' : ''}<th>কী</th><th>বিবরণ</th></tr>${list.map(e => { const [al, ac] = AUD_ACT[e.action] || [e.action, '']; const link = audLink(e); const money = MONEY_TABLES.includes(e.table_name) && e.action !== 'insert'; return `<tr class="${money ? 'audmoney' : ''}"><td data-l="সময়" style="white-space:nowrap">${fmtDT(e.at)}</td><td data-l="কে">${esc(e.user_name || (e.user_id ? 'স্টাফ' : e.table_name === 'inquiries' && e.action === 'insert' ? 'ওয়েবসাইট' : 'সিস্টেম'))}</td><td data-l="কাজ">${badge(ac, al)}${money ? ' ' + badge('due', 'টাকার রেকর্ড') : ''}</td>${showWhere ? `<td data-l="কোথায়">${esc(AUD_TABLE[e.table_name] || e.table_name)}</td>` : ''}<td data-l="কী">${link ? `<a href="${link}">${esc(audSubject(e) || '—')}</a>` : esc(audSubject(e) || '—')}</td><td data-l="বিবরণ"><span class="cell small">${audDetail(e) || '—'}</span></td></tr>`; }).join('')}</table>`;
}

async function viewAudit(q) {
  if (!isAdmin()) return mount('#/audit', '<div class="empty">কাজের রেকর্ড শুধু অ্যাডমিন দেখতে পারেন।</div>');
  const f = { from: q.get('from') || isoAdd(todayISO(), -30), to: q.get('to') || todayISO(), t: q.get('t') || '', a: q.get('a') || '', u: q.get('u') || '' };
  mount('#/audit', '<div class="top"><div><h1>কাজের রেকর্ড</h1><p>লোড হচ্ছে…</p></div></div>');
  const h0 = location.hash; let list = [], more = false;
  try { const r = await API.auditList({ ...f, limit: 300 }); list = r.rows; more = r.more; }
  catch (e) { return mount('#/audit', `<div class="top"><div><h1>কাজের রেকর্ড</h1></div></div><div class="empty">${/audit_log|does not exist|schema cache/i.test(e.message || '') ? 'কাজের রেকর্ডের টেবিল এখনো তৈরি হয়নি (supabase-migration-v7.sql চালাতে হবে)।' : esc(errMsg(e))}</div>`); }
  if (location.hash !== h0) return;
  const dels = list.filter(e => e.action === 'delete').length; const moneyCh = list.filter(e => MONEY_TABLES.includes(e.table_name) && e.action !== 'insert').length;
  const users = [...new Set([...S.profiles.map(p => p.name).filter(Boolean), ...list.map(e => e.user_name).filter(Boolean)])];
  mount('#/audit', `
  <div class="top"><div><h1>কাজের রেকর্ড</h1><p>কে কখন কী যোগ করেছে, বদলেছে বা মুছেছে · শুধু আপনি দেখতে পান</p></div><button class="btn ghost" id="acsv">CSV</button></div>
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card stat"><div class="l">মোট কাজ</div><div class="v">${list.length}${more ? '+' : ''}</div><div class="s">${fmtD(f.from)} থেকে ${fmtD(f.to)}</div></div>
    <div class="card stat ${dels ? 'red' : ''}"><div class="l">মোছা হয়েছে</div><div class="v">${dels}</div></div>
    <div class="card stat ${moneyCh ? 'red' : ''}"><div class="l">টাকার রেকর্ড বদল / মোছা</div><div class="v">${moneyCh}</div><div class="s">টাকা জমা আর খরচ</div></div>
  </div>
  <form class="row card" id="flt" style="padding:12px;margin-bottom:14px">
    <label class="small">থেকে <input type="date" name="from" value="${esc(f.from)}"></label><label class="small">পর্যন্ত <input type="date" name="to" value="${esc(f.to)}"></label>
    <select name="t"><option value="">সব জায়গা</option>${Object.entries(AUD_TABLE).map(([k, l]) => `<option value="${k}" ${f.t === k ? 'selected' : ''}>${l}</option>`).join('')}<option value="money" ${f.t === 'money' ? 'selected' : ''}>শুধু টাকার রেকর্ড</option></select>
    <select name="a"><option value="">সব কাজ</option>${Object.entries(AUD_ACT).map(([k, [l]]) => `<option value="${k}" ${f.a === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select name="u"><option value="">সবাই</option>${users.map(u => `<option ${f.u === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
    <button class="btn ghost">খুঁজুন</button></form>
  <div class="tw">${list.length ? audRows(list) : '<div class="empty">এই সময়ে কোনো কাজের রেকর্ড নেই</div>'}</div>
  ${more ? '<p class="small muted" style="margin-top:10px">সর্বশেষ ৩০০টি দেখানো হচ্ছে। পুরোনোগুলো দেখতে তারিখ ছোট করে খুঁজুন।</p>' : ''}
  <p class="small muted" style="margin-top:10px">রেকর্ড ডেটাবেস নিজেই লেখে, তাই পোর্টাল থেকে কেউ (আপনিও না) এটা বদলাতে বা মুছতে পারে না। প্রতিদিনের হাজিরা আর নম্বর তোলা লেখা হয় না, শুধু পরে বদলালে বা মুছলে লেখা হয়।</p>`, () => {
    $('#flt').onsubmit = (e) => { e.preventDefault(); const d = formData(e.target); location.hash = '#/audit?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
    $$('#flt select').forEach(s => s.onchange = () => $('#flt').requestSubmit());
    $('#acsv').onclick = () => csvDownload(`sakura-activity-${f.from}-to-${f.to}.csv`, [['Time', 'User', 'Action', 'Where', 'Record', 'Changes (old → new)'], ...list.map(e => [fmtDT(e.at), e.user_name, e.action, e.table_name, audSubject(e), e.action === 'update' ? Object.keys(e.new_data || {}).map(k => `${k}: ${JSON.stringify((e.old_data || {})[k])} → ${JSON.stringify(e.new_data[k])}`).join('; ') : JSON.stringify(e.new_data || e.old_data)])]);
  });
}

// ------------------------------------------------------------------ Japan application documents (入学願書 · 履歴書 · 経費支弁書)
const EDU_LVL = { primary: ['প্রাথমিক (১ম–৫ম)', '小学校', 'Primary School'], secondary: ['মাধ্যমিক (৬ষ্ঠ–১০ম, SSC)', '中学校・高等学校(前期)', 'Secondary School (SSC)'], higher: ['উচ্চ মাধ্যমিক (HSC)', '高等学校(後期)', 'Higher Secondary (HSC)'], diploma: ['ডিপ্লোমা', '専門学校', 'Diploma'], bachelor: ['স্নাতক', '大学', 'Bachelor'], master: ['স্নাতকোত্তর', '大学院', 'Master'], japanese: ['জাপানি ভাষা', '日本語学校', 'Japanese language'], other: ['অন্যান্য', 'その他', 'Other'] };
const REL = { father: ['বাবা', '父', 'Father'], mother: ['মা', '母', 'Mother'], elder_brother: ['বড় ভাই', '兄', 'Elder brother'], younger_brother: ['ছোট ভাই', '弟', 'Younger brother'], elder_sister: ['বড় বোন', '姉', 'Elder sister'], younger_sister: ['ছোট বোন', '妹', 'Younger sister'], spouse: ['স্বামী/স্ত্রী', '配偶者', 'Spouse'], uncle: ['চাচা/মামা', '叔父', 'Uncle'], aunt: ['ফুফু/খালা', '叔母', 'Aunt'], grandfather: ['দাদা/নানা', '祖父', 'Grandfather'], grandmother: ['দাদি/নানি', '祖母', 'Grandmother'], other: ['অন্যান্য', 'その他', 'Other'] };
const JOB = { student: ['ছাত্র', '学生', 'Student'], company: ['চাকরি (প্রাইভেট)', '会社員', 'Company employee'], government: ['সরকারি চাকরি', '公務員', 'Government employee'], business: ['ব্যবসা', '自営業', 'Business owner'], farmer: ['কৃষি', '農業', 'Farmer'], teacher: ['শিক্ষক', '教師', 'Teacher'], housewife: ['গৃহিণী', '主婦', 'Housewife'], retired: ['অবসরপ্রাপ্ত', '退職', 'Retired'], none: ['বেকার', '無職', 'Unemployed'], other: ['অন্যান্য', 'その他', 'Other'] };
const PLAN = { shingaku: ['জাপানে আরও পড়াশোনা (বিশ্ববিদ্যালয়/স্পেশাল স্কুল)', '日本で進学', 'Further study in Japan'], shushoku: ['জাপানে চাকরি', '日本で就職', 'Employment in Japan'], kikoku: ['দেশে ফিরে কাজ', '帰国して就職', 'Return home and work'], undecided: ['এখনো ঠিক হয়নি', '未定', 'Undecided'] };
const jdate = (iso) => { if (!iso) return ''; const [y, m, d] = String(iso).split('-'); return d ? `${y}年${num(m)}月${num(d)}日` : m ? `${y}年${num(m)}月` : `${y}年`; };
const jdateEn = (iso) => { if (!iso) return ''; const [y, m, d] = String(iso).split('-'); const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][num(m) - 1] || ''; return d ? `${num(d)} ${M} ${y}` : m ? `${M} ${y}` : y; };
const ageOn = (dob, on = todayISO()) => { if (!dob) return ''; let a = num(on.slice(0, 4)) - num(dob.slice(0, 4)); if (on.slice(5) < dob.slice(5, 10)) a--; return a; };
const monthsBetween = (a, b) => (a && b) ? Math.max(0, (num(b.slice(0, 4)) - num(a.slice(0, 4))) * 12 + num(b.slice(5, 7)) - num(a.slice(5, 7)) + 1) : 0; // inclusive: Jan–Dec = 12
const lbl3 = (map, k, i) => !k ? '' : (map[k] || map.other || [k, k, k])[i] || '';

function jpInfoChecklist(s, j) {
  const miss = [];
  if (!j.name_kana) miss.push('নামের কাতাকানা'); if (!s.dob) miss.push('জন্ম তারিখ'); if (!s.passport_no) miss.push('পাসপোর্ট নম্বর'); if (!j.birthplace) miss.push('জন্মস্থান');
  if (!(j.edu || []).some(e => e.name)) miss.push('শিক্ষাগত যোগ্যতা'); if (!(j.family || []).some(f => f.name)) miss.push('পরিবারের সদস্য');
  if (!j.sponsor || !j.sponsor.name) miss.push('স্পনসর'); if (!j.purpose_ja) miss.push('পড়ার উদ্দেশ্য (জাপানি)');
  return miss;
}

function viewJapanForm(id) {
  const s = byId(S.students, id); if (!s) return mount('#/students', '<div class="empty">ছাত্র পাওয়া যায়নি</div>');
  const j = { edu: [], work: [], family: [], jlpt: [], sponsor: {}, marital: 'single', occupation: 'student', plan: 'shingaku', prev_coe: 'no', jp_visit: 'no', method: '銀行送金 (Bank transfer)', ...(s.japan_info || {}) };
  if (!j.edu.length) j.edu = [{ lvl: 'primary' }, { lvl: 'secondary' }, { lvl: 'higher' }];
  if (!j.family.length) j.family = [{ rel: 'father' }, { rel: 'mother' }];
  const apps = S.applications.filter(a => a.student_id === s.id).sort((a, b) => (b.intake || '').localeCompare(a.intake || ''));
  const att = attOf(s.id);
  const opt = (map, cur, i = 0) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(Array.isArray(v) ? v[i] : v)}</option>`).join('');
  const sp = j.sponsor || {};
  const eduRow = (e = {}) => `<tr data-row="edu"><td><select data-k="lvl">${opt(EDU_LVL, e.lvl)}</select></td><td><input data-k="name" value="${esc(e.name || '')}" placeholder="School name (English)"></td><td><input data-k="city" value="${esc(e.city || '')}" placeholder="Narayanganj"></td><td><input data-k="from" type="month" value="${esc(e.from || '')}"></td><td><input data-k="to" type="month" value="${esc(e.to || '')}"></td><td><button type="button" class="btn sm ghost" data-del>✕</button></td></tr>`;
  const workRow = (w = {}) => `<tr data-row="work"><td><input data-k="company" value="${esc(w.company || '')}" placeholder="Company name"></td><td><input data-k="job" value="${esc(w.job || '')}" placeholder="Position"></td><td><input data-k="from" type="month" value="${esc(w.from || '')}"></td><td><input data-k="to" type="month" value="${esc(w.to || '')}"></td><td><button type="button" class="btn sm ghost" data-del>✕</button></td></tr>`;
  const famRow = (f = {}) => `<tr data-row="family"><td><select data-k="rel">${opt(REL, f.rel)}</select></td><td><input data-k="name" value="${esc(f.name || '')}" placeholder="Name (English)"></td><td><input data-k="dob" type="date" value="${esc(f.dob || '')}"></td><td><select data-k="job"><option value="">—</option>${opt(JOB, f.job)}</select></td><td><select data-k="together"><option value="yes" ${f.together !== 'no' ? 'selected' : ''}>একসাথে থাকে</option><option value="no" ${f.together === 'no' ? 'selected' : ''}>আলাদা</option></select></td><td><button type="button" class="btn sm ghost" data-del>✕</button></td></tr>`;
  const jlptRow = (x = {}) => `<tr data-row="jlpt"><td><select data-k="test">${opt({ jlpt: 'JLPT', nat: 'NAT-TEST', jtest: 'J.TEST', topj: 'TOP J', other: 'অন্যান্য' }, x.test)}</select></td><td><input data-k="level" value="${esc(x.level || '')}" placeholder="N5 / 5級"></td><td><input data-k="date" type="month" value="${esc(x.date || '')}"></td><td><input data-k="score" value="${esc(x.score || '')}" placeholder="95/180"></td><td><select data-k="result">${opt({ pass: 'পাস', fail: 'ফেল', waiting: 'ফলের অপেক্ষা' }, x.result)}</select></td><td><button type="button" class="btn sm ghost" data-del>✕</button></td></tr>`;
  const autoJ = S.exam_results.filter(r => r.student_id === s.id).map(r => ({ r, e: byId(S.exams, r.exam_id) })).filter(x => x.e && ['jlpt', 'nat'].includes(x.e.type) && !x.r.absent);
  const miss = jpInfoChecklist(s, j);
  mount('#/students', `
  <div class="top"><div><h1>জাপান আবেদনের তথ্য</h1><p>${esc(studentName(s))} · ${esc(s.admission_no)} — এখান থেকে 入学願書, 履歴書 আর 経費支弁書 তৈরি হবে</p></div><a class="btn ghost" href="#/student/${s.id}?t=japan">ফিরে যান</a></div>
  <div class="card" style="margin-bottom:14px"><h2>কাগজ প্রিন্ট</h2>
    <div class="row" style="gap:8px;flex-wrap:wrap"><label class="small">কোন স্কুলের জন্য <select id="jpapp"><option value="">— স্কুলের নাম ছাড়া —</option>${apps.map(a => `<option value="${a.id}">${esc(schoolName(byId(S.jp_schools, a.school_id)))} · ${esc(intakeLabel(a.intake))}</option>`).join('')}</select></label>
    <button class="btn gold" data-doc="gansho">入学願書</button><button class="btn gold" data-doc="rireki">履歴書</button><button class="btn gold" data-doc="shiben">経費支弁書</button></div>
    ${miss.length ? `<p class="small" style="margin:10px 0 0;color:var(--red)">এখনো বাকি: ${miss.join(', ')}। খালি থাকলে কাগজে ঘর ফাঁকা থাকবে।</p>` : '<p class="small" style="margin:10px 0 0;color:var(--green)">মূল তথ্য সব আছে।</p>'}
    <p class="small muted" style="margin:6px 0 0">প্রথমে নিচের তথ্য পূরণ করে "সংরক্ষণ" চাপুন, তারপর প্রিন্ট। ইংরেজি নাম আর বানান পাসপোর্টের সাথে হুবহু মিলিয়ে লিখুন।</p></div>
  <form id="jf2">
  <div class="card form" style="margin-bottom:14px"><h3>ব্যক্তিগত তথ্য</h3>
    <p class="full small muted" style="margin:0">ইংরেজি নাম: <b>${esc(s.name_en || '—')}</b> · জন্ম তারিখ: <b>${fmtD(s.dob)}</b> · পাসপোর্ট: <b>${esc(s.passport_no || '—')}</b> · <a href="#/student/${s.id}/edit">এগুলো বদলাতে ছাত্রের তথ্য সম্পাদনা করুন</a></p>
    <label class="f">নাম কাতাকানায় (フリガナ)<input name="name_kana" value="${esc(j.name_kana || '')}" placeholder="例: モハメド ラヒム"></label>
    <label class="f">জন্মস্থান (ইংরেজিতে)<input name="birthplace" value="${esc(j.birthplace || '')}" placeholder="Narayanganj, Bangladesh"></label>
    <label class="f">বৈবাহিক অবস্থা<select name="marital">${opt({ single: 'অবিবাহিত (未婚)', married: 'বিবাহিত (既婚)' }, j.marital)}</select></label>
    <label class="f">বর্তমান পেশা<select name="occupation">${opt(JOB, j.occupation)}</select></label>
    <label class="f full">স্থায়ী ঠিকানা (ইংরেজিতে, পাসপোর্টের মতো)<input name="address_en" value="${esc(j.address_en || '')}" placeholder="House, Road, Area, Upazila, District, Bangladesh"></label>
    <label class="f">পাসপোর্ট ইস্যুর তারিখ<input name="passport_issued" type="date" value="${esc(j.passport_issued || '')}"></label>
    <label class="f">পাসপোর্টের মেয়াদ শেষ<input name="passport_expires" type="date" value="${esc(j.passport_expires || (S.documents.find(d => d.student_id === s.id && d.doc_type === 'passport') || {}).expires_on || '')}"></label>
    <label class="f">আগে জাপানে গেছে?<select name="jp_visit">${opt({ no: 'না (無)', yes: 'হ্যাঁ (有)' }, j.jp_visit)}</select></label>
    <label class="f">আগে COE-র আবেদন করেছে?<select name="prev_coe">${opt({ no: 'না (無)', yes: 'হ্যাঁ (有)' }, j.prev_coe)}</select></label>
    <label class="f full">জাপান সফর / আগের আবেদনের বিবরণ (থাকলে)<input name="jp_detail" value="${esc(j.jp_detail || '')}" placeholder="例: 2024年4月 ○○日本語学校 不交付"></label>
  </div>
  <div class="card" style="margin-bottom:14px"><h2>শিক্ষাগত যোগ্যতা (学歴)</h2><div class="tw"><table class="jt"><tr><th>স্তর</th><th>প্রতিষ্ঠানের নাম</th><th>জেলা/শহর</th><th>শুরু</th><th>শেষ</th><th></th></tr>${j.edu.map(eduRow).join('')}</table></div><button type="button" class="btn sm ghost" data-add="edu" style="margin-top:8px">+ আরেকটা</button>
    <p class="small muted" style="margin:6px 0 0">জাপানের স্কুলে আবেদনে সাধারণত মোট ১২ বছরের পড়াশোনা লাগে। শুরু আর শেষের মাস সার্টিফিকেট দেখে লিখুন।</p></div>
  <div class="card" style="margin-bottom:14px"><h2>চাকরির অভিজ্ঞতা (職歴) — থাকলে</h2><div class="tw"><table class="jt"><tr><th>প্রতিষ্ঠান</th><th>পদ</th><th>শুরু</th><th>শেষ</th><th></th></tr>${(j.work || []).map(workRow).join('')}</table></div><button type="button" class="btn sm ghost" data-add="work" style="margin-top:8px">+ যোগ করুন</button></div>
  <div class="card" style="margin-bottom:14px"><h2>জাপানি ভাষার পরীক্ষা (JLPT / NAT)</h2>
    ${autoJ.length ? `<p class="small muted" style="margin:0 0 6px">পোর্টালের রেজাল্ট থেকে: ${autoJ.map(x => `${esc(x.e.title)} ${num(x.r.marks)}/${num(x.e.max_marks)}`).join(' · ')}</p>` : ''}
    <div class="tw"><table class="jt"><tr><th>পরীক্ষা</th><th>লেভেল</th><th>মাস</th><th>নম্বর</th><th>ফল</th><th></th></tr>${(j.jlpt || []).map(jlptRow).join('')}</table></div><button type="button" class="btn sm ghost" data-add="jlpt" style="margin-top:8px">+ যোগ করুন</button>
    <p class="small muted" style="margin:6px 0 0">সাকুরায় পড়াশোনা: ${att.first ? `${fmtD(att.first)} থেকে ${fmtD(att.last)}, ${att.hours} ঘণ্টা` : 'এখনো হাজিরা নেই'} — এটা কাগজে নিজে থেকে বসবে।</p></div>
  <div class="card" style="margin-bottom:14px"><h2>পরিবার (家族構成)</h2><div class="tw"><table class="jt"><tr><th>সম্পর্ক</th><th>নাম</th><th>জন্ম তারিখ</th><th>পেশা</th><th>একসাথে?</th><th></th></tr>${j.family.map(famRow).join('')}</table></div><button type="button" class="btn sm ghost" data-add="family" style="margin-top:8px">+ সদস্য যোগ</button></div>
  <div class="card form" style="margin-bottom:14px"><h3>স্পনসর (経費支弁者)</h3>
    <label class="f">নাম (ইংরেজি)<input data-sp="name" value="${esc(sp.name || '')}"></label>
    <label class="f">ছাত্রের সাথে সম্পর্ক<select data-sp="rel">${opt(REL, sp.rel || 'father')}</select></label>
    <label class="f">জন্ম তারিখ<input data-sp="dob" type="date" value="${esc(sp.dob || '')}"></label>
    <label class="f">পেশা<select data-sp="job">${opt(JOB, sp.job || 'business')}</select></label>
    <label class="f">প্রতিষ্ঠান / ব্যবসার নাম<input data-sp="employer" value="${esc(sp.employer || '')}"></label>
    <label class="f">বার্ষিক আয় (৳)<input data-sp="income" type="number" min="0" value="${esc(sp.income ?? '')}"></label>
    <label class="f full">ঠিকানা (ইংরেজিতে)<input data-sp="address" value="${esc(sp.address || '')}"></label>
    <label class="f">ফোন<input data-sp="phone" value="${esc(sp.phone || '')}"></label>
    <label class="f">মাসিক থাকা-খাওয়ার খরচ (¥)<input name="living_yen" type="number" min="0" step="1000" value="${esc(j.living_yen ?? 80000)}"></label>
    <label class="f full">টাকা পাঠানোর পদ্ধতি<input name="method" value="${esc(j.method || '')}"></label>
    <label class="f full">স্পনসর হওয়ার কারণ (経費支弁の引受け経緯) — জাপানিতে বা ইংরেজিতে<textarea name="support_reason" placeholder="例: 私は申請者の父であり、申請者の日本での勉学を強く希望しているため、学費及び生活費の全てを負担します。">${esc(j.support_reason || '')}</textarea></label></div>
  <div class="card form" style="margin-bottom:14px"><h3>পড়ার উদ্দেশ্য ও পরিকল্পনা</h3>
    <label class="f">পড়া শেষে পরিকল্পনা<select name="plan">${opt(PLAN, j.plan)}</select></label>
    <label class="f">বিস্তারিত (যেমন কোন বিষয়ে পড়বে)<input name="plan_detail" value="${esc(j.plan_detail || '')}" placeholder="例: 日本の大学で情報工学を学ぶ"></label>
    <label class="f full">জাপানে পড়ার উদ্দেশ্য (志望動機) — ছাত্র নিজে জাপানিতে লিখবে<textarea name="purpose_ja" rows="6" placeholder="ছাত্রের নিজের ভাষায়, জাপানিতে। স্কুল আর ইমিগ্রেশন এটা মন দিয়ে পড়ে।">${esc(j.purpose_ja || '')}</textarea></label></div>
  <div class="row" style="justify-content:flex-end;margin-bottom:30px"><button class="btn" type="submit">সংরক্ষণ</button></div></form>`, () => {
    const tpl = { edu: eduRow, work: workRow, family: famRow, jlpt: jlptRow };
    const bindDel = () => $$('[data-del]').forEach(b => b.onclick = () => b.closest('tr').remove());
    $$('[data-add]').forEach(b => b.onclick = () => { const t = b.previousElementSibling.querySelector('table'); t.insertAdjacentHTML('beforeend', tpl[b.dataset.add]()); bindDel(); }); bindDel();
    const collect = () => {
      const f = $('#jf2'); const d = formData(f); for (const el of $$('[data-sp]', f)) el.removeAttribute('name');
      const rows = (k) => $$(`tr[data-row="${k}"]`).map(tr => Object.fromEntries($$('[data-k]', tr).map(el => [el.dataset.k, el.value.trim()]))).filter(r => Object.entries(r).some(([kk, v]) => v && !['lvl', 'rel', 'test', 'job', 'together', 'result'].includes(kk)));
      const sponsor = Object.fromEntries($$('[data-sp]').map(el => [el.dataset.sp, el.type === 'number' ? (el.value === '' ? null : num(el.value)) : el.value.trim()]));
      delete d.undefined; return { ...(s.japan_info || {}), ...d, edu: rows('edu'), work: rows('work'), family: rows('family'), jlpt: rows('jlpt'), sponsor };
    };
    $('#jf2').onsubmit = async (e) => {
      e.preventDefault(); const info = collect(); const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
      try { putLocal('students', await API.update('students', s.id, { japan_info: info })); toast('সংরক্ষণ হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); btn.disabled = false; }
    };
    $$('[data-doc]').forEach(b => b.onclick = async () => {
      const info = collect(); const cur = byId(S.students, s.id);
      if (JSON.stringify(info) !== JSON.stringify(cur.japan_info || {})) { try { putLocal('students', await API.update('students', s.id, { japan_info: info })); } catch (err) { return toast(errMsg(err), true); } }
      const a = byId(S.applications, $('#jpapp').value); printJpDoc(b.dataset.doc, byId(S.students, s.id), a);
    });
  });
}

async function printJpDoc(kind, s, a) {
  const j = s.japan_info || {}; const sp = j.sponsor || {}; const st = S.settings; const today = todayISO();
  const sc = a ? byId(S.jp_schools, a.school_id) : null; const school = sc ? schoolName(sc) : '';
  const att = attOf(s.id); const intake = a && a.intake ? `${a.intake.slice(0, 4)}年${num(a.intake.slice(5))}月` : '';
  let photo = ''; const ph = S.documents.find(d => d.student_id === s.id && d.doc_type === 'photo' && d.file_path); if (ph) try { photo = await API.fileUrl(ph.file_path); } catch { /* no photo */ }
  const edu = (j.edu || []).filter(e => e.name || e.from); const years = Math.round(edu.filter(e => e.lvl !== 'japanese').reduce((t, e) => t + monthsBetween(e.from, e.to), 0) / 12 * 10) / 10;
  const jl = (j.jlpt || []).filter(x => x.level || x.score);
  const sex = { male: '男 Male', female: '女 Female' }[s.gender] || '';
  const css = `<style>.jd{font-family:'Shippori Mincho B1','Hind Siliguri',serif;font-size:11.5px;color:#111}.jd h1{text-align:center;font-size:24px;letter-spacing:8px;margin:0}.jd .en{text-align:center;font-size:11px;letter-spacing:2px;color:#444;margin-bottom:10px}
  .jd table{width:100%;border-collapse:collapse;margin-top:6px}.jd td,.jd th{border:1px solid #333;padding:4px 6px;vertical-align:top;font-size:11px}.jd th{background:#F2F2F2;font-weight:700;text-align:left;width:22%}.jd th small,.jd td small{display:block;font-weight:400;color:#555;font-size:9px}
  .jd .sec{margin-top:10px;font-weight:800;font-size:12.5px;border-left:4px solid #333;padding-left:6px}.jd .ph{width:30mm;height:40mm;border:1px solid #333;display:grid;place-items:center;font-size:10px;color:#666;text-align:center;overflow:hidden}.jd .ph img{width:100%;height:100%;object-fit:cover}
  .jd .sig{margin-top:18px;display:flex;justify-content:space-between;gap:20px}.jd .sig div{flex:1;border-bottom:1px solid #333;padding-bottom:20px}.jd .muted{color:#666;font-size:9.5px}</style>`;
  const eduTable = `<table><tr><th style="width:auto">学校名 / School<small>所在地 / Location</small></th><th style="width:auto">区分</th><th style="width:auto">入学年月<small>Entered</small></th><th style="width:auto">卒業年月<small>Graduated</small></th><th style="width:auto">年数</th></tr>${edu.map(e => `<tr><td>${esc(e.name || '')}<small>${esc(e.city || '')}</small></td><td>${lbl3(EDU_LVL, e.lvl, 1)}<small>${lbl3(EDU_LVL, e.lvl, 2)}</small></td><td>${jdate(e.from)}</td><td>${jdate(e.to)}</td><td>${monthsBetween(e.from, e.to) ? Math.round(monthsBetween(e.from, e.to) / 12 * 10) / 10 + '年' : ''}</td></tr>`).join('') || '<tr><td colspan="5">&nbsp;</td></tr>'}<tr><td colspan="4" style="text-align:right">修学年数合計 / Total years of education</td><td><b>${years || ''}年</b></td></tr></table>`;
  const jpStudy = `<table><tr><th>日本語学習歴<small>Japanese study</small></th><td>${esc(st.institute_ja)} (${esc(st.institute_en)})<br>${att.first ? `${jdate(att.first)} 〜 ${jdate(att.last)} · 学習時間 ${att.hours}時間 · 出席率 ${att.pct}%` : ''}</td></tr>
    <tr><th>日本語能力試験等<small>Japanese tests</small></th><td>${jl.map(x => `${{ jlpt: 'JLPT', nat: 'NAT-TEST', jtest: 'J.TEST', topj: 'TOP J' }[x.test] || ''} ${esc(x.level || '')} ${x.date ? '(' + jdate(x.date) + ')' : ''} ${esc(x.score || '')} ${{ pass: '合格', fail: '不合格', waiting: '結果待ち' }[x.result] || ''}`).join('<br>') || 'なし / None'}</td></tr></table>`;
  if (kind === 'gansho') printWindow('入学願書 ' + s.admission_no, `${css}<div class="jd">
    <div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-size:13px">${school ? esc(school) + ' 御中' : '　　　　　　　　　御中'}<br><span class="muted">To: ${esc(sc ? sc.name_en || school : '')}</span></div><div class="ph">${photo ? `<img src="${esc(photo)}" alt="">` : '写真<br>Photo<br>3cm × 4cm'}</div></div>
    <h1>入 学 願 書</h1><div class="en">APPLICATION FOR ADMISSION</div>
    <table><tr><th>入学希望時期<small>Intended enrollment</small></th><td>${intake}</td><th>記入日<small>Date</small></th><td>${jdate(today)}</td></tr></table>
    <div class="sec">1. 本人 / Applicant</div>
    <table><tr><th>氏名<small>Name (as in passport)</small></th><td colspan="3"><b style="font-size:14px">${esc((s.name_en || '').toUpperCase())}</b></td></tr>
    <tr><th>フリガナ</th><td colspan="3">${esc(j.name_kana || '')}</td></tr>
    <tr><th>性別<small>Sex</small></th><td>${sex}</td><th>生年月日<small>Date of birth</small></th><td>${jdate(s.dob)} (${ageOn(s.dob)}歳)</td></tr>
    <tr><th>国籍<small>Nationality</small></th><td>バングラデシュ Bangladesh</td><th>出生地<small>Place of birth</small></th><td>${esc(j.birthplace || '')}</td></tr>
    <tr><th>配偶者<small>Marital status</small></th><td>${j.marital === 'married' ? '既婚 Married' : '未婚 Single'}</td><th>職業<small>Occupation</small></th><td>${lbl3(JOB, j.occupation, 1)} ${lbl3(JOB, j.occupation, 2)}</td></tr>
    <tr><th>本国住所<small>Home address</small></th><td colspan="3">${esc(j.address_en || s.address_permanent || '')}</td></tr>
    <tr><th>電話<small>Phone</small></th><td>${esc(s.phone || '')}</td><th>Eメール<small>E-mail</small></th><td>${esc(s.email || '')}</td></tr>
    <tr><th>旅券番号<small>Passport No.</small></th><td>${esc(s.passport_no || '')}</td><th>発行日 / 有効期限<small>Issued / Expires</small></th><td>${jdate(j.passport_issued)} / ${jdate(j.passport_expires)}</td></tr>
    <tr><th>出入国歴<small>Past entry to Japan</small></th><td>${j.jp_visit === 'yes' ? '有 Yes' : '無 No'}</td><th>在留資格認定証明書申請歴<small>Past COE application</small></th><td>${j.prev_coe === 'yes' ? '有 Yes' : '無 No'}</td></tr>
    ${j.jp_detail ? `<tr><th>詳細<small>Details</small></th><td colspan="3">${esc(j.jp_detail)}</td></tr>` : ''}</table>
    <div class="sec">2. 学歴 / Education</div>${eduTable}
    ${(j.work || []).length ? `<div class="sec">3. 職歴 / Employment</div><table><tr><th style="width:auto">勤務先 / Company</th><th style="width:auto">職種 / Position</th><th style="width:auto">期間 / Period</th></tr>${j.work.map(w => `<tr><td>${esc(w.company || '')}</td><td>${esc(w.job || '')}</td><td>${jdate(w.from)} 〜 ${jdate(w.to) || '現在'}</td></tr>`).join('')}</table>` : ''}
    <div class="sec">${(j.work || []).length ? 4 : 3}. 日本語学習歴 / Japanese language</div>${jpStudy}
    <div class="sec">${(j.work || []).length ? 5 : 4}. 経費支弁者 / Financial sponsor</div>
    <table><tr><th>氏名<small>Name</small></th><td>${esc(sp.name || '')}</td><th>関係<small>Relationship</small></th><td>${lbl3(REL, sp.rel, 1)} ${lbl3(REL, sp.rel, 2)}</td></tr>
    <tr><th>職業<small>Occupation</small></th><td>${lbl3(JOB, sp.job, 1)} ${esc(sp.employer || '')}</td><th>年収<small>Annual income</small></th><td>${sp.income ? `BDT ${num(sp.income).toLocaleString('en-US')}` : ''}</td></tr></table>
    <div class="sec">${(j.work || []).length ? 6 : 5}. 卒業後の予定 / Plan after graduation</div>
    <table><tr><td>${lbl3(PLAN, j.plan, 1)} / ${lbl3(PLAN, j.plan, 2)}${j.plan_detail ? '<br>' + esc(j.plan_detail) : ''}</td></tr></table>
    <p style="margin-top:12px">上記の記載事項は事実と相違ありません。 / I hereby certify that the above statements are true and correct.</p>
    <div class="sig"><div>日付 / Date</div><div>本人署名 / Signature of applicant</div></div>
    <p class="muted" style="margin-top:10px">取次機関 / Agent: ${esc(st.institute_ja)} ${esc(st.institute_en)} · ${esc(st.phone)}</p></div>`);
  if (kind === 'rireki') {
    const hist = [...edu.flatMap(e => [e.from && [e.from, `${esc(e.name || '')} ${lbl3(EDU_LVL, e.lvl, 1)} 入学`], e.to && [e.to, `${esc(e.name || '')} ${lbl3(EDU_LVL, e.lvl, 1)} 卒業`]]), ...(j.work || []).flatMap(w => [w.from && [w.from, `${esc(w.company || '')} 入社 (${esc(w.job || '')})`], w.to && [w.to, `${esc(w.company || '')} 退社`]]), att.first && [att.first.slice(0, 7), `${esc(st.institute_ja)} 入学 (日本語学習)`]].filter(Boolean).sort((x, y) => x[0].localeCompare(y[0]));
    printWindow('履歴書 ' + s.admission_no, `${css}<div class="jd">
    <div style="display:flex;justify-content:space-between;align-items:flex-end"><div><h1 style="text-align:left">履 歴 書</h1><div class="en" style="text-align:left">PERSONAL HISTORY</div></div><div style="text-align:right">${jdate(today)} 現在</div></div>
    <div style="display:flex;gap:10px"><table style="flex:1"><tr><th>フリガナ</th><td>${esc(j.name_kana || '')}</td></tr><tr><th>氏名<small>Name</small></th><td><b style="font-size:15px">${esc((s.name_en || '').toUpperCase())}</b></td></tr>
    <tr><th>生年月日<small>Date of birth</small></th><td>${jdate(s.dob)} (満${ageOn(s.dob)}歳) · ${sex}</td></tr><tr><th>国籍・出生地<small>Nationality / Birthplace</small></th><td>バングラデシュ · ${esc(j.birthplace || '')}</td></tr>
    <tr><th>現住所<small>Address</small></th><td>${esc(j.address_en || s.address_permanent || '')}</td></tr><tr><th>連絡先<small>Contact</small></th><td>${esc(s.phone || '')} ${s.email ? '· ' + esc(s.email) : ''}</td></tr></table>
    <div class="ph" style="margin-top:6px">${photo ? `<img src="${esc(photo)}" alt="">` : '写真<br>Photo'}</div></div>
    <div class="sec">学歴・職歴 / Education and employment</div>
    <table><tr><th style="width:18%">年</th><th style="width:10%">月</th><th style="width:auto">事項</th></tr>${hist.map(([d, t]) => `<tr><td>${d.slice(0, 4)}</td><td>${num(d.slice(5, 7)) || ''}</td><td>${t}</td></tr>`).join('')}<tr><td></td><td></td><td style="text-align:right">以上</td></tr></table>
    <div class="sec">日本語能力 / Japanese ability</div>${jpStudy}
    <div class="sec">家族構成 / Family</div>
    <table><tr><th style="width:auto">続柄</th><th style="width:auto">氏名 / Name</th><th style="width:auto">生年月日</th><th style="width:auto">職業</th><th style="width:auto">同居</th></tr>${(j.family || []).map(f => `<tr><td>${lbl3(REL, f.rel, 1)}</td><td>${esc(f.name || '')}</td><td>${jdate(f.dob)}</td><td>${lbl3(JOB, f.job, 1)}</td><td>${f.together === 'no' ? '別居' : '同居'}</td></tr>`).join('')}</table>
    <div class="sec">志望動機 / Purpose of study</div><table><tr><td style="height:120px;white-space:pre-wrap;font-size:12px">${esc(j.purpose_ja || '')}</td></tr></table>
    <div class="sec">卒業後の予定 / Plan after graduation</div><table><tr><td>${lbl3(PLAN, j.plan, 1)}${j.plan_detail ? ' — ' + esc(j.plan_detail) : ''}</td></tr></table>
    <div class="sig"><div>本人署名 / Signature</div></div></div>`);
  }
  if (kind === 'shiben') {
    const tuition = sc && sc.tuition_yen ? num(sc.tuition_yen) : null; const living = num(j.living_yen) || null;
    printWindow('経費支弁書 ' + s.admission_no, `${css}<div class="jd" style="font-size:12.5px">
    <div>${school ? esc(school) : '　　　　　　　　　'} 校長 殿<br><span class="muted">To the Principal of ${esc(sc ? sc.name_en || school : '')}</span></div>
    <h1 style="margin-top:14px">経 費 支 弁 書</h1><div class="en">LETTER OF FINANCIAL SUPPORT</div>
    <table><tr><th>国籍<small>Nationality</small></th><td>バングラデシュ Bangladesh</td><th>性別<small>Sex</small></th><td>${sex}</td></tr>
    <tr><th>申請者氏名<small>Applicant</small></th><td>${esc((s.name_en || '').toUpperCase())}</td><th>生年月日<small>Date of birth</small></th><td>${jdate(s.dob)}</td></tr></table>
    <p style="margin:14px 0 6px">私は、この度上記の者が日本国に在留中の経費支弁者になりましたので、下記のとおり経費支弁の引受け経緯を説明するとともに経費支弁について証明します。</p>
    <p class="muted" style="margin:0 0 8px">I, the undersigned, hereby certify that I will bear the expenses of the above applicant during the stay in Japan, and explain the circumstances as follows.</p>
    <div class="sec">1. 経費支弁の引受け経緯 / Reason for financial support</div><table><tr><td style="height:90px;white-space:pre-wrap">${esc(j.support_reason || '')}<br><span class="muted">申請者との関係 / Relationship: ${lbl3(REL, sp.rel, 1)} (${lbl3(REL, sp.rel, 2)})</span></td></tr></table>
    <div class="sec">2. 経費支弁内容 / Details of support</div>
    <table><tr><th>学費<small>Tuition</small></th><td>年額 ${tuition ? '¥' + tuition.toLocaleString('en-US') : '¥　　　　　　'} / per year</td></tr>
    <tr><th>生活費<small>Living expenses</small></th><td>月額 ${living ? '¥' + living.toLocaleString('en-US') : '¥　　　　　　'} / per month</td></tr>
    <tr><th>支弁方法<small>Method of payment</small></th><td>${esc(j.method || '')}</td></tr></table>
    <div class="sec">3. 経費支弁者 / Sponsor</div>
    <table><tr><th>氏名<small>Name</small></th><td>${esc(sp.name || '')}</td><th>生年月日<small>Date of birth</small></th><td>${jdate(sp.dob)}</td></tr>
    <tr><th>職業<small>Occupation</small></th><td>${lbl3(JOB, sp.job, 1)} ${lbl3(JOB, sp.job, 2)}<br>${esc(sp.employer || '')}</td><th>年収<small>Annual income</small></th><td>${sp.income ? 'BDT ' + num(sp.income).toLocaleString('en-US') : ''}</td></tr>
    <tr><th>住所<small>Address</small></th><td colspan="3">${esc(sp.address || '')}</td></tr><tr><th>電話<small>Phone</small></th><td colspan="3">${esc(sp.phone || '')}</td></tr></table>
    <div class="sig" style="margin-top:28px"><div>日付 / Date</div><div>経費支弁者署名 / Signature of sponsor</div></div>
    <p class="muted" style="margin-top:12px">※ 学校によっては経費支弁者の自筆での記入を求められます。収入証明書・預金残高証明書を添付してください。 / Some schools require this letter handwritten by the sponsor. Attach proof of income and bank balance.</p></div>`);
  }
}

// ------------------------------------------------------------------ Japan income: processing fees & school commissions
const COMM_ST = { expected: 'পাওয়ার কথা', received: 'পেয়েছি', cancelled: 'বাতিল' };
const COMM_CLS = { expected: 'trial', received: 'active', cancelled: 'dropped' };
function commissionModal(c, preset = {}) {
  const v = c || { status: 'expected', ...preset };
  const schools = [...S.jp_schools].sort((a, b) => schoolName(a).localeCompare(schoolName(b)));
  if (!schools.length) return toast('আগে "জাপানি স্কুল" তালিকায় স্কুল যোগ করুন', true);
  const apps = S.applications.filter(a => ['accepted', 'coe_applied', 'coe_granted', 'visa', 'departed'].includes(a.status));
  openModal(`<h2>${c ? 'কমিশনের তথ্য' : 'স্কুল থেকে কমিশন'}</h2><form class="form" id="cmf">
    <label class="f full">জাপানি স্কুল<select name="school_id" required>${schools.map(sc => `<option value="${sc.id}" ${v.school_id === sc.id ? 'selected' : ''}>${esc(schoolName(sc))}</option>`).join('')}</select></label>
    <label class="f full">কোন ছাত্রের জন্য (থাকলে)<select name="application_id"><option value="">— একাধিক ছাত্র / প্রযোজ্য নয় —</option>${apps.map(a => { const s = byId(S.students, a.student_id); return `<option value="${a.id}" ${v.application_id === a.id ? 'selected' : ''}>${esc(studentName(s))} · ${esc(schoolName(byId(S.jp_schools, a.school_id)))} · ${esc(intakeLabel(a.intake))}</option>`; }).join('')}</select></label>
    <label class="f">অবস্থা<select name="status">${Object.entries(COMM_ST).map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">কমিশন (¥, স্কুলের হিসাবে)<input name="amount_yen" type="number" min="0" step="1000" value="${esc(v.amount_yen ?? '')}"></label>
    <label class="f">পাওয়ার কথা কবে<input name="expected_on" type="date" value="${esc(v.expected_on || '')}"></label>
    <label class="f">হাতে পেয়েছি (৳)<input name="amount_bdt" type="number" min="0" step="1" value="${esc(v.amount_bdt ?? '')}"></label>
    <label class="f">পাওয়ার তারিখ<input name="received_on" type="date" value="${esc(v.received_on || '')}"></label>
    <label class="f full">নোট<input name="note" value="${esc(v.note || '')}" placeholder="যেমন: ব্যাংক ট্রান্সফার, ২ জন ছাত্রের জন্য একসাথে"></label>
    <p class="full small muted" style="margin:0">"পেয়েছি" হলে টাকার অঙ্ক (৳) "খরচ ও লাভ" আর রিপোর্টের আয়ে যোগ হবে, পাওয়ার তারিখের মাসে।</p>
    <div class="full row" style="justify-content:flex-end">${c && isAdmin() ? '<button type="button" class="btn ghost" id="cmd" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="cmc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  const f = $('#cmf'); $('#cmc').onclick = closeModal;
  f.application_id.onchange = () => { const a = byId(S.applications, f.application_id.value); if (a) f.school_id.value = a.school_id; };
  f.status.onchange = () => { if (f.status.value === 'received' && !f.received_on.value) f.received_on.value = todayISO(); };
  const del = $('#cmd'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('এই কমিশনের রেকর্ড মুছে যাবে।'))) return; try { await API.remove('commissions', c.id); S.commissions = S.commissions.filter(x => x.id !== c.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } };
  f.onsubmit = async (e) => {
    e.preventDefault(); const d = formData(f); d.application_id = d.application_id || null;
    const a = byId(S.applications, d.application_id); d.student_id = a ? a.student_id : null;
    if (d.status === 'received' && !(d.amount_bdt > 0)) return toast('হাতে কত টাকা (৳) পেয়েছেন লিখুন', true);
    if (d.status === 'received' && !d.received_on) d.received_on = todayISO();
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try { putLocal('commissions', c ? await API.update('commissions', c.id, d) : await API.insert('commissions', d)); closeModal(); toast('সংরক্ষণ হয়েছে'); render(); }
    catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}

function viewJapanIncome(q, tabs, bindTabs) {
  const y = q.get('y') || todayISO().slice(0, 4);
  const inYear = (d) => (d || '').startsWith(y);
  const procStudents = S.students.filter(s => num(s.processing_fee) > 0 || S.payments.some(p => p.student_id === s.id && p.purpose === 'processing'));
  const procAgreed = procStudents.reduce((a, s) => a + num(s.processing_fee), 0);
  const procGot = S.payments.filter(p => p.purpose === 'processing').reduce((a, p) => a + num(p.amount), 0);
  const procYear = S.payments.filter(p => p.purpose === 'processing' && inYear(p.paid_on)).reduce((a, p) => a + num(p.amount), 0);
  const commGot = S.commissions.filter(c => c.status === 'received' && inYear(c.received_on)).reduce((a, c) => a + num(c.amount_bdt), 0);
  const commWait = S.commissions.filter(c => c.status === 'expected');
  const jpExp = S.expenses.filter(x => x.category === 'japan' && inYear(x.spent_on)).reduce((a, x) => a + num(x.amount), 0);
  const done = S.applications.filter(a => ['coe_granted', 'visa', 'departed'].includes(a.status));
  const noComm = done.filter(a => !S.commissions.some(c => c.application_id === a.id));
  const years = [...new Set([todayISO().slice(0, 4), ...S.payments.filter(p => p.purpose === 'processing').map(p => (p.paid_on || '').slice(0, 4)), ...S.commissions.map(c => (c.received_on || c.expected_on || '').slice(0, 4))].filter(Boolean))].sort().reverse();
  const comms = [...S.commissions].sort((a, b) => (b.received_on || b.expected_on || '').localeCompare(a.received_on || a.expected_on || ''));
  mount('#/japan', `
  <div class="top"><div><h1>জাপান আবেদন</h1><p>জাপান প্রসেসিং থেকে আয়: ছাত্রের প্রসেসিং ফি আর স্কুলের কমিশন</p></div><div class="row"><select id="yr">${years.map(x => `<option ${x === y ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="btn" id="ncm">+ কমিশন</button></div></div>
  ${tabs}
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat green"><div class="l">${y}-এ প্রসেসিং ফি পেয়েছি</div><div class="v">${tk(procYear)}</div><div class="s">মোট বাকি ${tk(Math.max(0, procAgreed - procGot))}</div></div>
    <div class="card stat green"><div class="l">${y}-এ কমিশন পেয়েছি</div><div class="v">${tk(commGot)}</div><div class="s">${commWait.length ? commWait.length + 'টি পাওয়ার কথা' : ''}</div></div>
    <div class="card stat red"><div class="l">${y}-এ জাপান প্রসেসিং খরচ</div><div class="v">${tk(jpExp)}</div><div class="s">খরচের খাত "জাপান প্রসেসিং খরচ"</div></div>
    <div class="card stat ${procYear + commGot - jpExp < 0 ? 'red' : 'green'}"><div class="l">জাপান প্রসেসিং-এর লাভ</div><div class="v">${tk(procYear + commGot - jpExp)}</div><div class="s">ফি + কমিশন − খরচ</div></div>
  </div>
  ${noComm.length ? `<div class="alertbar" style="margin-bottom:14px"><b>${noComm.length} জন COE/ভিসা পেয়েছে, কিন্তু কমিশন লেখা হয়নি</b><span>${noComm.slice(0, 4).map(a => esc(studentName(byId(S.students, a.student_id))) + ' · ' + esc(schoolName(byId(S.jp_schools, a.school_id)))).join(' · ')}</span></div>` : ''}
  <div class="card" style="margin-bottom:16px"><div class="row" style="margin-bottom:8px"><h2 style="margin:0">স্কুল থেকে কমিশন</h2></div>${comms.length ? `<div class="tw"><table class="stack"><tr><th>স্কুল</th><th>ছাত্র</th><th>অবস্থা</th><th class="num">¥</th><th class="num">৳ পেয়েছি</th><th>তারিখ</th></tr>${comms.map(c => `<tr class="click" data-cm="${c.id}"><td class="mt" data-l=""><span><b>${esc(schoolName(byId(S.jp_schools, c.school_id)))}</b></span></td><td class="dm"><b>${esc(schoolName(byId(S.jp_schools, c.school_id)))}</b></td><td data-l="ছাত্র">${c.student_id ? esc(studentName(byId(S.students, c.student_id))) : '<span class="muted">—</span>'}</td><td data-l="অবস্থা">${badge(COMM_CLS[c.status], COMM_ST[c.status] || c.status)}</td><td class="num" data-l="¥">${c.amount_yen ? yen(c.amount_yen) : '—'}</td><td class="num" data-l="৳ পেয়েছি">${c.amount_bdt ? tk(c.amount_bdt) : '—'}</td><td data-l="তারিখ">${c.status === 'received' ? fmtD(c.received_on) : c.expected_on ? (c.expected_on < todayISO() ? badge('due', fmtD(c.expected_on)) : fmtD(c.expected_on)) : '—'}</td></tr>`).join('')}</table></div>` : '<div class="empty">এখনো কোনো কমিশনের রেকর্ড নেই। কোনো ছাত্র COE পেলে বা জাপানে গেলে স্কুল যে কমিশন দেয়, এখানে লিখে রাখুন।</div>'}
    ${noComm.length ? `<div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><span class="small muted">দ্রুত যোগ:</span>${noComm.slice(0, 6).map(a => `<button class="btn sm ghost" data-qc="${a.id}">${esc(studentName(byId(S.students, a.student_id)))}</button>`).join('')}</div>` : ''}</div>
  <div class="card"><h2>ছাত্রদের প্রসেসিং ফি</h2>${procStudents.length ? `<div class="tw"><table class="stack"><tr><th>ছাত্র</th><th class="num">চুক্তি</th><th class="num">পেয়েছি</th><th class="num">বাকি</th></tr>${procStudents.map(s => { const pd = procPaidOf(s.id); const due = procDueOf(s); return `<tr class="click" data-go="#/student/${s.id}?t=fees"><td class="mt" data-l=""><span><b>${esc(studentName(s))}</b></span></td><td class="dm"><b>${esc(studentName(s))}</b><div class="small muted">${esc(s.admission_no)}</div></td><td class="num" data-l="চুক্তি">${tk(s.processing_fee)}</td><td class="num" data-l="পেয়েছি">${tk(pd)}</td><td class="num" data-l="বাকি">${due ? `<b style="color:var(--red)">${tk(due)}</b>` : badge('paid', 'পরিশোধিত')}</td></tr>`; }).join('')}</table></div>` : '<div class="empty">কোনো ছাত্রের প্রসেসিং ফি ঠিক করা হয়নি। ছাত্রের তথ্য সম্পাদনায় "জাপান প্রসেসিং ফি" লিখুন, আর টাকা জমার সময় "বাবদ: জাপান প্রসেসিং ফি" বেছে নিন।</div>'}</div>`, () => {
    bindTabs(); bindGo();
    $('#yr').onchange = (e) => { location.hash = '#/japan?v=income&y=' + e.target.value; };
    $('#ncm').onclick = () => commissionModal(null);
    $$('[data-cm]').forEach(tr => tr.onclick = () => commissionModal(byId(S.commissions, tr.dataset.cm)));
    $$('[data-qc]').forEach(b => b.onclick = () => { const a = byId(S.applications, b.dataset.qc); commissionModal(null, { application_id: a.id, school_id: a.school_id }); });
  });
}

// ------------------------------------------------------------------ class calendar, holidays & weekly routine
const WDAY = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
const HOL_TYPE = { govt: 'সরকারি ছুটি', institute: 'প্রতিষ্ঠানের ছুটি', exam: 'পরীক্ষা / বিশেষ দিন' };
// Fixed-date national holidays only (Eid, Puja etc. change every year — add those yourself)
const BD_FIXED = [['02-21', 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস'], ['03-26', 'স্বাধীনতা ও জাতীয় দিবস'], ['04-14', 'পহেলা বৈশাখ'], ['05-01', 'মে দিবস'], ['12-16', 'বিজয় দিবস'], ['12-25', 'বড়দিন']];
const classDays = () => Array.isArray(S.settings.class_days) && S.settings.class_days.length ? S.settings.class_days.map(Number) : [0, 1, 2, 3, 4, 6];
const dow = (iso) => new Date(iso + 'T00:00:00').getDay();
function dayInfo(iso, batch) {
  const hol = (S.holidays || []).find(h => h.on_date === iso && (h.batch === 'all' || !batch || h.batch === batch));
  if (hol) return { off: true, why: hol.title, hol };
  if (!classDays().includes(dow(iso))) return { off: true, why: `সাপ্তাহিক ছুটি (${WDAY[dow(iso)]}বার)` };
  return { off: false };
}
function activeGroups() { // level+batch combinations that currently have students
  const g = new Map(); for (const s of S.students) if (s.status === 'active' || s.status === 'trial') { const k = s.current_level + '|' + s.batch; g.set(k, (g.get(k) || 0) + 1); }
  return [...g.entries()].map(([k, n]) => { const [level, batch] = k.split('|'); return { level, batch, n }; }).sort((a, b) => (a.batch + a.level).localeCompare(b.batch + b.level));
}
const groupStarted = (g, d) => S.students.some(s => s.current_level === g.level && s.batch === g.batch && (s.status === 'active' || s.status === 'trial') && (s.start_date || s.admission_date || '9999') <= d);
function missingAttendance(days = 14) { // past class days where a group with students has no attendance yet
  const out = []; const groups = activeGroups(); if (!groups.length) return out;
  for (let i = 1; i <= days; i++) {
    const d = isoAdd(todayISO(), -i);
    for (const g of groups) {
      if (dayInfo(d, g.batch).off) continue;
      if (!groupStarted(g, d)) continue;
      if (!S.sessions.some(x => x.class_date === d && x.level === g.level && x.batch === g.batch)) out.push({ date: d, ...g });
    }
  }
  return out;
}

function holidayModal(h, preset = {}) {
  if (isTeacher()) return toast('ছুটি ঠিক করে অফিস', true);
  const v = h || { on_date: todayISO(), type: 'institute', batch: 'all', ...preset };
  openModal(`<h2>${h ? 'ছুটির তথ্য' : 'ছুটি যোগ করুন'}</h2><form class="form" id="hf">
    <label class="f">তারিখ<input name="on_date" type="date" required value="${esc(v.on_date)}"></label>
    ${h ? '' : '<label class="f">কত দিন (একটানা)<input name="days" type="number" min="1" max="30" value="1"></label>'}
    <label class="f full">কিসের ছুটি<input name="title" required value="${esc(v.title || '')}" placeholder="যেমন: ঈদুল ফিতর, শিক্ষকের অসুস্থতা"></label>
    <label class="f">ধরন<select name="type">${Object.entries(HOL_TYPE).map(([k, l]) => `<option value="${k}" ${v.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">কোন ব্যাচ<select name="batch"><option value="all" ${v.batch === 'all' ? 'selected' : ''}>দুই ব্যাচ</option>${Object.entries(BATCH).map(([k, l]) => `<option value="${k}" ${v.batch === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="full row" style="justify-content:flex-end">${h ? '<button type="button" class="btn ghost" id="hd" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="hc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  $('#hc').onclick = closeModal;
  const del = $('#hd'); if (del) del.onclick = async () => { try { await API.remove('holidays', h.id); S.holidays = S.holidays.filter(x => x.id !== h.id); closeModal(); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } };
  $('#hf').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target); const n = Math.min(30, Math.max(1, num(d.days) || 1)); delete d.days;
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      if (h) putLocal('holidays', await API.update('holidays', h.id, d));
      else for (let i = 0; i < n; i++) { const on = isoAdd(d.on_date, i); if (S.holidays.some(x => x.on_date === on && x.batch === d.batch)) continue; putLocal('holidays', await API.insert('holidays', { ...d, on_date: on })); }
      closeModal(); toast('সংরক্ষণ হয়েছে'); render();
    } catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}

function planModal(p, preset = {}) {
  const v = p || { level: (activeGroups()[0] || {}).level || 'N5', batch: 'all', topic: '', note: '', online_link: '', ...preset };
  openModal(`<h2>${p ? 'ক্লাসের পরিকল্পনা' : 'ক্লাসের পরিকল্পনা যোগ'}</h2><form class="form" id="cpf">
    <label class="f">তারিখ<input name="class_date" type="date" required value="${esc(v.class_date)}"></label>
    <label class="f">লেভেল<select name="level">${LEVELS.map(l => `<option ${v.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">কোন ব্যাচ<select name="batch"><option value="all" ${v.batch === 'all' ? 'selected' : ''}>দুই ব্যাচ</option>${Object.entries(BATCH).map(([k, l]) => `<option value="${k}" ${v.batch === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f full">কী পড়ানো হবে<input name="topic" required value="${esc(v.topic)}" placeholder="যেমন: অধ্যায় ৫ — ~ています, নতুন কাঞ্জি ১০টি"></label>
    <label class="f full">ছাত্রদের জন্য নোট (ঐচ্ছিক)<textarea name="note" placeholder="যেমন: আগের অধ্যায়ের শব্দ মুখস্থ করে আসবে">${esc(v.note)}</textarea></label>
    <label class="f full">অনলাইন ক্লাসের লিংক (শুধু অনলাইন ক্লাস হলে)<input name="online_link" type="url" value="${esc(v.online_link)}" placeholder="https://meet.google.com/..."></label>
    <div class="full row" style="justify-content:flex-end">${p ? '<button type="button" class="btn ghost" id="cpd" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="cpc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  $('#cpc').onclick = closeModal;
  const del = $('#cpd'); if (del) del.onclick = async () => { try { await API.remove('class_plans', p.id); S.class_plans = S.class_plans.filter(x => x.id !== p.id); closeModal(); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } };
  $('#cpf').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target); d.topic = (d.topic || '').trim(); d.note = (d.note || '').trim(); d.online_link = (d.online_link || '').trim();
    if (d.online_link && !/^https:\/\//.test(d.online_link)) return toast('লিংক https:// দিয়ে শুরু হতে হবে', true);
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try { putLocal('class_plans', p ? await API.update('class_plans', p.id, d) : await API.insert('class_plans', d)); closeModal(); toast('সংরক্ষণ হয়েছে'); render(); }
    catch (err) { toast(errMsg(err), true); btn.disabled = false; }
  };
}

function viewCalendar(q) {
  const m = q.get('m') || monthISO(); const [Y, M] = m.split('-').map(Number);
  const first = new Date(Y, M - 1, 1); const days = new Date(Y, M, 0).getDate(); const lead = first.getDay();
  const today = todayISO(); const groups = activeGroups();
  const prevM = monthISO(isoAdd(m + '-01', -1)); const nextM = monthISO(isoAdd(m + '-' + pad(days, 2), 1));
  const cell = (d) => {
    const iso = `${m}-${pad(d, 2)}`; const info = dayInfo(iso); const ss = S.sessions.filter(x => x.class_date === iso);
    const exs = S.exams.filter(x => x.exam_date === iso); const ev = S.applications.filter(a => appOpen(a) && [a.deadline_on, a.interview_on].includes(iso));
    const bHol = (S.holidays || []).filter(h => h.on_date === iso && h.batch !== 'all');
    const need = !info.off && iso < today ? groups.filter(g => !dayInfo(iso, g.batch).off && groupStarted(g, iso) && !ss.some(x => x.level === g.level && x.batch === g.batch)).length : 0;
    return `<div class="cd ${info.off ? 'off' : ''} ${iso === today ? 'today' : ''}" data-day="${iso}"><div class="dn">${d}</div>
      ${info.off ? `<div class="hl">${esc(info.why)}</div>` : ''}${bHol.map(h => `<div class="hl sm">${esc(BATCH[h.batch] || '')}: ${esc(h.title)}</div>`).join('')}
      ${ss.length ? `<div class="ok">✓ ${ss.length}টি ক্লাস</div>` : ''}${(S.class_plans || []).filter(p => p.class_date === iso).map(p => `<div class="ev">📘 ${esc(p.level)}${p.online_link ? ' · অনলাইন' : ''}</div>`).join('')}${need ? `<div class="miss">হাজিরা বাকি ${need}</div>` : ''}
      ${exs.map(x => `<div class="ev">✎ ${esc(x.title)}</div>`).join('')}${ev.map(a => `<div class="ev jp">✈ ${esc(studentName(byId(S.students, a.student_id)))}</div>`).join('')}</div>`;
  };
  const monthHol = (S.holidays || []).filter(h => (h.on_date || '').startsWith(m)).sort((a, b) => a.on_date.localeCompare(b.on_date));
  const classCount = Array.from({ length: days }, (_, i) => `${m}-${pad(i + 1, 2)}`).filter(d => !dayInfo(d).off).length;
  const lastTeacher = (lv, b) => { const x = [...S.sessions].filter(s => s.level === lv && s.batch === b && (s.teacher_id || s.teacher)).sort((p, r) => r.class_date.localeCompare(p.class_date))[0]; return x ? (byId(S.teachers, x.teacher_id) || {}).name || x.teacher : ''; };
  mount('#/calendar', `
  <div class="top"><div><h1>ক্লাসের ক্যালেন্ডার</h1><p>ক্লাসের দিন, ছুটি, পরীক্ষা আর জাপান আবেদনের তারিখ এক জায়গায়</p></div><div class="row"><a class="btn ghost" href="#/calendar?m=${prevM}">‹</a><input type="month" id="mon" value="${esc(m)}"><a class="btn ghost" href="#/calendar?m=${nextM}">›</a>${isTeacher() ? '' : '<button class="btn" id="nh">+ ছুটি</button>'}</div></div>
  <div class="grid g3" style="margin-bottom:14px">
    <div class="card stat"><div class="l">${monthLabel(m)}-এ ক্লাসের দিন</div><div class="v">${classCount}</div><div class="s">সাপ্তাহিক ছুটি: ${[0, 1, 2, 3, 4, 5, 6].filter(x => !classDays().includes(x)).map(x => WDAY[x] + 'বার').join(', ') || 'নেই'}</div></div>
    <div class="card stat"><div class="l">এ মাসের ছুটি</div><div class="v">${monthHol.length}</div></div>
    <div class="card stat ${missingAttendance().length ? 'red' : 'green'}"><div class="l">হাজিরা বাকি (গত ১৪ দিন)</div><div class="v">${missingAttendance().length}</div><div class="s">ক্লাস হয়েছে কিন্তু হাজিরা নেওয়া হয়নি</div></div>
  </div>
  <div class="cal"><div class="cw">${WDAY.map((w, i) => `<div class="${classDays().includes(i) ? '' : 'offh'}">${w}</div>`).join('')}</div><div class="cg">${'<div class="cd blank"></div>'.repeat(lead)}${Array.from({ length: days }, (_, i) => cell(i + 1)).join('')}</div></div>
  <p class="small muted" style="margin-top:8px">কোনো দিনে চাপ দিলে সেদিনের হাজিরা খুলবে বা ছুটি যোগ করা যাবে। সাপ্তাহিক ছুটির দিন সেটিংসে বদলানো যায়।</p>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><div class="row" style="margin-bottom:8px"><h2 style="margin:0">সাপ্তাহিক রুটিন</h2><span class="spacer"></span><button class="btn sm ghost" id="prt">নোটিশ বোর্ডের জন্য প্রিন্ট</button></div>
      ${groups.length ? `<div class="tw"><table><tr><th>ব্যাচ</th><th>লেভেল</th><th>ছাত্র</th><th>শিক্ষক</th></tr>${groups.map(g => `<tr><td>${esc(BATCH[g.batch] || g.batch)}</td><td><b>${esc(g.level)}</b></td><td>${g.n} জন</td><td>${esc(lastTeacher(g.level, g.batch) || '—')}</td></tr>`).join('')}</table></div><p class="small muted" style="margin:8px 0 0">ক্লাস হয়: ${classDays().map(x => WDAY[x]).join(', ')}বার</p>` : '<div class="empty">এখনো কোনো চলমান ব্যাচ নেই</div>'}</div>
    <div class="card"><div class="row" style="margin-bottom:8px"><h2 style="margin:0">${monthLabel(m)}-এর ছুটি</h2><span class="spacer"></span>${isAdmin() ? `<button class="btn sm ghost" id="bdh">${Y} সালের জাতীয় ছুটি যোগ</button>` : ''}</div>
      ${monthHol.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>কিসের</th><th>ব্যাচ</th></tr>${monthHol.map(h => `<tr class="click" data-h="${h.id}"><td>${fmtD(h.on_date)} <span class="small muted">${WDAY[dow(h.on_date)]}</span></td><td>${esc(h.title)}<div class="small muted">${esc(HOL_TYPE[h.type] || '')}</div></td><td>${h.batch === 'all' ? 'দুই ব্যাচ' : esc(BATCH[h.batch] || '')}</td></tr>`).join('')}</table></div>` : '<div class="empty">এ মাসে কোনো ছুটি লেখা নেই</div>'}
      <p class="small muted" style="margin:8px 0 0">ঈদ, পূজা আর অন্য যেসব ছুটির তারিখ প্রতি বছর বদলায়, সেগুলো সরকারি ঘোষণা দেখে নিজে যোগ করুন।</p></div>
  </div>`, () => {
    $('#mon').onchange = (e) => { location.hash = '#/calendar?m=' + e.target.value; };
    if ($('#nh')) $('#nh').onclick = () => holidayModal(null);
    $$('[data-h]').forEach(tr => tr.onclick = () => holidayModal(byId(S.holidays, tr.dataset.h)));
    $$('[data-day]').forEach(c => c.onclick = () => {
      const iso = c.dataset.day; const info = dayInfo(iso);
      openModal(`<h2>${fmtD(iso)} · ${WDAY[dow(iso)]}বার</h2><p>${info.off ? `ছুটি: <b>${esc(info.why)}</b>` : 'ক্লাসের দিন'}</p>
        <div class="row" style="gap:8px;flex-wrap:wrap">${groups.map(g => `<a class="btn sm ghost" href="#/attendance?d=${iso}&l=${g.level}&b=${g.batch}">${esc(g.level)} · ${esc(BATCH[g.batch])} হাজিরা</a>`).join('')}</div>
        ${(() => { const pl = (S.class_plans || []).filter(p => p.class_date === iso); return `<h3 style="margin:16px 0 6px">ক্লাসের পরিকল্পনা <span class="small muted">(ছাত্রদের সাইটে দেখাবে)</span></h3>${pl.length ? pl.map(p => `<div class="card click" data-cp="${p.id}" style="padding:8px 12px;margin-bottom:6px"><b>${esc(p.level)}</b> · ${p.batch === 'all' ? 'দুই ব্যাচ' : esc(BATCH[p.batch] || '')} — ${esc(p.topic || '—')}${p.online_link ? ' <span class="small muted">· অনলাইন লিংক আছে</span>' : ''}</div>`).join('') : '<p class="small muted" style="margin:0">কিছু লেখা নেই</p>'}<button class="btn sm ghost" id="acp" style="margin-top:6px">+ পরিকল্পনা / অনলাইন লিংক</button>`; })()}
        <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px">${isTeacher() ? '' : info.hol ? '<button class="btn ghost" id="eh">ছুটি বদলান</button>' : '<button class="btn ghost" id="ah">এই দিন ছুটি</button>'}<button class="btn" id="dc">বন্ধ</button></div>`);
      $('#acp').onclick = () => planModal(null, { class_date: iso });
      $$('[data-cp]').forEach(x => x.onclick = () => planModal(byId(S.class_plans, x.dataset.cp)));
      $('#dc').onclick = closeModal; $$('#modal-body a').forEach(a => a.addEventListener('click', closeModal));
      const ah = $('#ah'); if (ah) ah.onclick = () => holidayModal(null, { on_date: iso });
      const eh = $('#eh'); if (eh) eh.onclick = () => holidayModal(info.hol);
    });
    const bdh = $('#bdh'); if (bdh) bdh.onclick = async () => {
      const add = BD_FIXED.map(([md, t]) => [`${Y}-${md}`, t]).filter(([d]) => !S.holidays.some(h => h.on_date === d && h.batch === 'all'));
      if (!add.length) return toast(`${Y} সালের নির্দিষ্ট তারিখের ছুটিগুলো আগেই যোগ করা আছে`);
      if (!(await confirmBox(`${add.map(([d, t]) => `${fmtD(d)} ${t}`).join(' · ')} — এই ${add.length}টি ছুটি যোগ হবে। ঈদ, পূজা ইত্যাদি নিজে যোগ করবেন।`, 'হ্যাঁ, যোগ করুন'))) return;
      try { for (const [d, t] of add) putLocal('holidays', await API.insert('holidays', { on_date: d, title: t, type: 'govt', batch: 'all' })); toast(`${add.length}টি ছুটি যোগ হয়েছে`); render(); } catch (e) { toast(errMsg(e), true); }
    };
    $('#prt').onclick = () => printWindow('Class routine', `${headHtml()}<div style="padding:24px 30px"><div style="text-align:center;font:800 24px 'Noto Serif Bengali';margin-bottom:4px">ক্লাসের রুটিন</div><div style="text-align:center;font:700 13px 'Shippori Mincho B1';letter-spacing:4px;color:#A3843A;margin-bottom:16px">時間割 · CLASS ROUTINE</div>
      <table><tr><th style="width:auto">ব্যাচ / সময়</th><th style="width:auto">লেভেল</th><th style="width:auto">শিক্ষক</th></tr>${groups.map(g => `<tr><td>${esc(BATCH[g.batch])}</td><td><b>${esc(g.level)}</b></td><td>${esc(lastTeacher(g.level, g.batch) || '')}</td></tr>`).join('')}</table>
      <p style="margin-top:14px;font-size:15px">ক্লাসের দিন: <b>${classDays().map(x => WDAY[x]).join(', ')}বার</b> · সাপ্তাহিক ছুটি: <b>${[0, 1, 2, 3, 4, 5, 6].filter(x => !classDays().includes(x)).map(x => WDAY[x] + 'বার').join(', ')}</b></p>
      ${(() => { const up = (S.holidays || []).filter(h => h.on_date >= todayISO()).sort((a, b) => a.on_date.localeCompare(b.on_date)).slice(0, 12); return up.length ? `<div style="margin-top:16px;font-weight:700">সামনের ছুটি</div><table style="margin-top:6px">${up.map(h => `<tr><td style="width:30%">${fmtD(h.on_date)} (${WDAY[dow(h.on_date)]})</td><td>${esc(h.title)}${h.batch !== 'all' ? ' — ' + esc(BATCH[h.batch]) : ''}</td></tr>`).join('')}</table>` : ''; })()}
      <p style="margin-top:18px;font-size:13px">ক্লাসে নিয়মিত আসুন — জাপানের আবেদনের জন্য অন্তত ৮০% উপস্থিতি দরকার।</p></div>`);
  });
}

// ------------------------------------------------------------------ weekly summary (for watching the office from Japan)
function weekStats(from, to) {
  const inR = (d) => d && d >= from && d <= to;
  const pays = S.payments.filter(p => inR(p.paid_on));
  const course = pays.filter(p => p.purpose !== 'processing').reduce((a, p) => a + num(p.amount), 0);
  const proc = pays.filter(p => p.purpose === 'processing').reduce((a, p) => a + num(p.amount), 0);
  const comm = (S.commissions || []).filter(c => c.status === 'received' && inR(c.received_on)).reduce((a, c) => a + num(c.amount_bdt), 0);
  const exp = S.expenses.filter(x => inR(x.spent_on)).reduce((a, x) => a + num(x.amount), 0);
  const sess = S.sessions.filter(x => inR(x.class_date)); const sids = new Set(sess.map(x => x.id));
  const att = S.attendance.filter(a => sids.has(a.session_id)); const came = att.filter(a => a.status === 'present' || a.status === 'late').length;
  const newStu = S.students.filter(s => inR(s.admission_date));
  const leads = S.inquiries.filter(l => inR(l.created_on));
  const exams = S.exams.filter(e => inR(e.exam_date));
  const apps = S.applications.filter(a => inR((a.updated_at || a.created_at || '').slice(0, 10)));
  return { pays, course, proc, comm, income: course + proc + comm, exp, profit: course + proc + comm - exp, sess, attPct: att.length ? Math.round(came * 100 / att.length) : null, attN: att.length, newStu, leads, web: leads.filter(l => (l.notes || '').startsWith('ওয়েবসাইট')), exams, apps };
}
function viewWeekly(q) {
  if (!isAdmin()) return mount('#/weekly', '<div class="empty">সাপ্তাহিক সারাংশ শুধু অ্যাডমিন দেখতে পারেন।</div>');
  const to = q.get('to') || todayISO(); const from = isoAdd(to, -6); const pTo = isoAdd(from, -1); const pFrom = isoAdd(pTo, -6);
  const w = weekStats(from, to), pw = weekStats(pFrom, pTo);
  const missing = missingAttendance(Math.max(7, daysBetween(from, todayISO()))).filter(x => x.date >= from && x.date <= to);
  const dues = S.students.filter(s => s.status !== 'dropped').map(s => ({ s, due: dueOf(s) })).filter(x => x.due > 0);
  const overdue = dues.filter(x => x.s.next_due_date && x.s.next_due_date < todayISO());
  const al = computeAlerts(); const red = al.filter(a => a.level === 'red');
  const nTo = isoAdd(todayISO(), 7); const upcoming = [
    ...(S.holidays || []).filter(h => h.on_date >= todayISO() && h.on_date <= nTo).map(h => [h.on_date, `ছুটি: ${h.title}`]),
    ...S.exams.filter(e => e.exam_date >= todayISO() && e.exam_date <= nTo).map(e => [e.exam_date, `পরীক্ষা: ${e.title}`]),
    ...S.applications.filter(a => appOpen(a)).flatMap(a => { const s = studentName(byId(S.students, a.student_id)), sc = schoolName(byId(S.jp_schools, a.school_id)); return [a.interview_on && a.interview_on >= todayISO() && a.interview_on <= nTo && [a.interview_on, `ইন্টারভিউ: ${s} · ${sc}`], a.status === 'preparing' && a.deadline_on && a.deadline_on >= todayISO() && a.deadline_on <= nTo && [a.deadline_on, `আবেদনের শেষ তারিখ: ${s} · ${sc}`]].filter(Boolean); })
  ].sort((a, b) => a[0].localeCompare(b[0]));
  const cmp = (a, b, money = true) => { if (b === a) return '<span class="small muted">আগের সপ্তাহের মতো</span>'; const up = a > b; const d = Math.abs(a - b); return `<span class="small" style="color:${up ? 'var(--green)' : 'var(--red)'}">${up ? '▲' : '▼'} ${money ? tk(d) : d} আগের সপ্তাহের চেয়ে</span>`; };
  const range = `${fmtD(from)} – ${fmtD(to)}`;
  const text = [`📊 ${S.settings.institute_bn} — সাপ্তাহিক সারাংশ`, range, '',
    `💰 আয় ${tk(w.income)} (কোর্স ${tk(w.course)}${w.proc ? `, প্রসেসিং ${tk(w.proc)}` : ''}${w.comm ? `, কমিশন ${tk(w.comm)}` : ''})`, `💸 খরচ ${tk(w.exp)} · ${w.profit < 0 ? 'ক্ষতি' : 'লাভ'} ${tk(Math.abs(w.profit))}`,
    `🎓 নতুন ভর্তি ${w.newStu.length} জন · নতুন আগ্রহী ${w.leads.length} জন${w.web.length ? ` (ওয়েবসাইট থেকে ${w.web.length})` : ''}`,
    `📅 ক্লাস ${w.sess.length}টি · উপস্থিতি ${w.attPct == null ? '—' : w.attPct + '%'}${missing.length ? ` · হাজিরা বাকি ${missing.length}টি ক্লাস` : ''}`,
    `🧾 মোট বকেয়া ${tk(dues.reduce((a, x) => a + x.due, 0))} (${dues.length} জন${overdue.length ? `, তারিখ পার ${overdue.length} জন` : ''})`,
    red.length ? `⚠️ জরুরি সতর্কতা ${red.length}টি` : '✅ কোনো জরুরি সতর্কতা নেই',
    upcoming.length ? '\n🗓 সামনের ৭ দিন:\n' + upcoming.slice(0, 8).map(([d, t]) => `• ${fmtD(d)} ${t}`).join('\n') : ''].filter(x => x !== '').join('\n');
  mount('#/weekly', `
  <div class="top"><div><h1>সাপ্তাহিক সারাংশ</h1><p>${range} · জাপান থেকে এক নজরে অফিসের অবস্থা</p></div><div class="row"><a class="btn ghost" href="#/weekly?to=${pTo}">‹ আগের সপ্তাহ</a>${to < todayISO() ? `<a class="btn ghost" href="#/weekly?to=${isoAdd(to, 7) > todayISO() ? todayISO() : isoAdd(to, 7)}">পরের সপ্তাহ ›</a>` : ''}<a class="btn wa" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${WA_SVG} WhatsApp-এ পাঠান</a></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat green"><div class="l">আয়</div><div class="v">${tk(w.income)}</div><div class="s">${cmp(w.income, pw.income)}</div></div>
    <div class="card stat red"><div class="l">খরচ</div><div class="v">${tk(w.exp)}</div><div class="s">${cmp(w.exp, pw.exp)}</div></div>
    <div class="card stat ${w.profit < 0 ? 'red' : 'green'}"><div class="l">${w.profit < 0 ? 'ক্ষতি' : 'লাভ'}</div><div class="v">${tk(Math.abs(w.profit))}</div><div class="s">${cmp(w.profit, pw.profit)}</div></div>
    <div class="card stat"><div class="l">নতুন ভর্তি</div><div class="v">${w.newStu.length}</div><div class="s">${cmp(w.newStu.length, pw.newStu.length, false)}</div></div>
    <div class="card stat"><div class="l">নতুন আগ্রহী</div><div class="v">${w.leads.length}</div><div class="s">${w.web.length ? `ওয়েবসাইট থেকে ${w.web.length} · ` : ''}${cmp(w.leads.length, pw.leads.length, false)}</div></div>
    <div class="card stat ${w.attPct != null && w.attPct < 80 ? 'red' : 'green'}"><div class="l">উপস্থিতি</div><div class="v">${w.attPct == null ? '—' : w.attPct + '%'}</div><div class="s">${w.sess.length}টি ক্লাস${pw.attPct != null ? ` · আগের সপ্তাহে ${pw.attPct}%` : ''}</div></div>
    <div class="card stat ${missing.length ? 'red' : ''}"><div class="l">হাজিরা নেওয়া হয়নি</div><div class="v">${missing.length}</div><div class="s">ক্লাসের দিন কিন্তু রেকর্ড নেই</div></div>
    <div class="card stat ${overdue.length ? 'red' : ''}"><div class="l">মোট বকেয়া</div><div class="v">${tk(dues.reduce((a, x) => a + x.due, 0))}</div><div class="s">${dues.length} জন · তারিখ পার ${overdue.length} জন</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><h2>এই সপ্তাহের টাকা জমা</h2>${w.pays.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>ছাত্র</th><th class="num">টাকা</th></tr>${[...w.pays].sort((a, b) => b.paid_on.localeCompare(a.paid_on)).map(p => `<tr class="click" data-go="#/student/${p.student_id}?t=fees"><td>${fmtD(p.paid_on)}</td><td>${esc(studentName(byId(S.students, p.student_id)))}<div class="small muted">${esc(PURPOSE[p.purpose] || '')} · ${esc(p.receipt_no)}</div></td><td class="num">${tk(p.amount)}</td></tr>`).join('')}</table></div>` : '<div class="empty">এই সপ্তাহে কোনো টাকা জমা হয়নি</div>'}</div>
    <div class="card"><h2>সামনের ৭ দিন</h2>${upcoming.length ? `<div class="tw"><table>${upcoming.map(([d, t]) => `<tr><td style="white-space:nowrap">${fmtD(d)} <span class="small muted">${WDAY[dow(d)]}</span></td><td>${esc(t)}</td></tr>`).join('')}</table></div>` : '<div class="empty">সামনের ৭ দিনে বিশেষ কিছু নেই</div>'}</div>
    <div class="card"><h2>জরুরি সতর্কতা</h2>${red.length ? `<div class="tw"><table>${red.slice(0, 8).map(a => `<tr class="click" data-go="${a.go}"><td>${esc(studentName(byId(S.students, a.sid)))}</td><td>${esc(a.what)}<div class="small muted">${esc(a.issue)}</div></td></tr>`).join('')}</table></div>` : '<div class="empty">কোনো জরুরি সতর্কতা নেই</div>'}</div>
    <div class="card"><h2>নতুন ভর্তি ও আগ্রহী</h2>${w.newStu.length || w.leads.length ? `<div class="tw"><table>${w.newStu.map(s => `<tr class="click" data-go="#/student/${s.id}"><td>${badge('active', 'ভর্তি')}</td><td>${esc(studentName(s))} <span class="small muted">${esc(s.package)}</span></td></tr>`).join('')}${w.leads.map(l => `<tr class="click" data-go="#/leads"><td>${badge(LEAD_ST_CLS[l.status], LEAD_ST[l.status])}</td><td>${esc(l.name)} <span class="small muted">${esc(LEAD_SRC[l.source] || '')}</span></td></tr>`).join('')}</table></div>` : '<div class="empty">এই সপ্তাহে নতুন কেউ নেই</div>'}</div>
  </div>
  <p class="small muted" style="margin-top:12px">"WhatsApp-এ পাঠান" চাপলে উপরের সংখ্যাগুলোর ছোট একটা সারাংশ তৈরি হয় — নিজের নম্বরে বা অফিসের কাউকে পাঠাতে পারেন। প্রতি সোমবার সকালে ফোনের "সাকুরা" অ্যাপ থেকে এই পাতা খুললেই আগের সপ্তাহের হিসাব পাবেন।</p>`, () => bindGo());
}

// ------------------------------------------------------------------ reports
function viewReports() {
  const smap = sessionMap();
  const months = []; const d = new Date(); d.setDate(1);
  for (let i = 11; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); months.push(`${x.getFullYear()}-${pad(x.getMonth() + 1, 2)}`); }
  const inc = months.map(m => incomeOf(m));
  const exp = months.map(m => monthSum(S.expenses, 'spent_on', m));
  const max = Math.max(1, ...inc, ...exp);
  const W = 760, H = 220, L = 46, bw = (W - L) / months.length, bar = Math.max(6, (bw - 14) / 2);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));
  const kfmt = (v) => v >= 100000 ? (v / 100000).toFixed(1).replace('.0', '') + 'L' : Math.round(v / 1000) + 'k';
  const chart = `<svg viewBox="0 -12 ${W} ${H + 58}" width="100%" role="img" aria-label="মাসিক আয় ও খরচ">
    ${ticks.map(t => { const y = H - t / max * H; return `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#E3D8C3" stroke-dasharray="${t ? '3 4' : ''}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="#6E665A">${t ? kfmt(t) : '0'}</text>`; }).join('')}
    ${months.map((m, i) => { const x = L + i * bw + 7; const hi = inc[i] / max * H, he = exp[i] / max * H; return `<rect x="${x}" y="${H - hi}" width="${bar}" height="${hi}" rx="2" fill="#1B2945"><title>${m} আয়: ${tk(inc[i])}</title></rect><rect x="${x + bar + 2}" y="${H - he}" width="${bar}" height="${he}" rx="2" fill="#C8372B"><title>${m} খরচ: ${tk(exp[i])}</title></rect><text x="${L + i * bw + bw / 2}" y="${H + 16}" text-anchor="middle" font-size="10.5" fill="${i === months.length - 1 ? '#C8372B' : '#6E665A'}" font-weight="${i === months.length - 1 ? 700 : 400}">${m.slice(5)}/${m.slice(2, 4)}</text>`; }).join('')}
    <g transform="translate(${L},${H + 36})" font-size="11.5" fill="#26231E"><rect width="11" height="11" fill="#1B2945" rx="2" y="-9"/><text x="16">আয়</text><rect x="62" width="11" height="11" fill="#C8372B" rx="2" y="-9"/><text x="78">খরচ</text></g></svg>`;
  const pl = months.map((m, i) => ({ m, inc: inc[i], exp: exp[i], pr: inc[i] - exp[i] })).reverse();
  const tInc = inc.reduce((a, b) => a + b, 0), tExp = exp.reduce((a, b) => a + b, 0);
  const studs = S.students.filter(s => s.status !== 'dropped');
  const reportMoney = `<div class="card"><h2>গত ১২ মাসের আয় ও খরচ (৳)</h2>${chart}<p class="small muted">১২ মাসে আয় ${tk(tInc)} · খরচ ${tk(tExp)} · ${tInc - tExp < 0 ? 'ক্ষতি' : 'লাভ'} <b>${tk(Math.abs(tInc - tExp))}</b></p></div>
  <div class="card" style="margin-top:16px"><div class="row" style="margin-bottom:10px"><h2 style="margin:0">মাসিক লাভ-ক্ষতি</h2><span class="spacer"></span><button class="btn ghost sm" id="r5">CSV ডাউনলোড</button></div>
  <div class="tw"><table class="stack"><tr><th>মাস</th><th class="num">আয়</th><th class="num">খরচ</th><th class="num">লাভ / ক্ষতি</th></tr>${pl.map(r => `<tr class="click" data-go="#/expenses?m=${r.m}"><td data-l="মাস"><b>${r.m.slice(5)}/${r.m.slice(0, 4)}</b></td><td class="num" data-l="আয়">${tk(r.inc)}</td><td class="num" data-l="খরচ">${tk(r.exp)}</td><td class="num" data-l="লাভ / ক্ষতি"><b style="color:${r.pr < 0 ? 'var(--red)' : r.pr > 0 ? 'var(--green)' : 'inherit'}">${r.pr < 0 ? '−' : ''}${tk(Math.abs(r.pr))}</b></td></tr>`).join('')}</table></div></div>`;
  mount('#/reports', `
  <div class="top"><div><h1>রিপোর্ট</h1><p>হিসাব, বকেয়া আর হাজিরার সারসংক্ষেপ</p></div></div>
  ${isAdmin() ? reportMoney : ''}
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>বকেয়ার তালিকা</h2><p class="muted small">যাদের কাছে টাকা বাকি, অভিভাবকের ফোন নম্বরসহ।</p><button class="btn ghost" id="r1">CSV ডাউনলোড</button></div>
    <div class="card"><h2>হাজিরা ও শিক্ষার ঘণ্টা</h2><p class="muted small">প্রত্যেক ছাত্রের মোট ঘণ্টা, উপস্থিতি % আর লেভেল অনুযায়ী ভাগ।</p><button class="btn ghost" id="r2">CSV ডাউনলোড</button></div>
    ${isAdmin() ? `<div class="card"><h2>ছাত্রদের পূর্ণ তালিকা</h2><p class="muted small">সব তথ্যসহ, জাপানের স্কুলে পাঠানোর প্রস্তুতির জন্য।</p><button class="btn ghost" id="r3">CSV ডাউনলোড</button></div>
    <div class="card"><h2>পুরো ব্যাকআপ (ZIP)</h2><p class="muted small">সব তথ্য, Excel-এ খোলার মতো ফাইল, আর আপলোড করা সব কাগজ ও ছবি — একটা ZIP ফাইলে। ${S.settings.last_backup_at ? 'শেষ ব্যাকআপ: ' + fmtDT(S.settings.last_backup_at) : 'এখনো ব্যাকআপ নেওয়া হয়নি'}</p><button class="btn gold" id="r6" ${isAdmin() ? '' : 'disabled'}>পুরো ব্যাকআপ নিন</button></div>
    <div class="card"><h2>শুধু তথ্য (JSON)</h2><p class="muted small">সব তথ্য একটা JSON ফাইলে। মাসে একবার নামিয়ে রাখুন।</p><button class="btn ghost" id="r4" ${isAdmin() ? '' : 'disabled'}>ব্যাকআপ ডাউনলোড</button></div>` : `<div class="card"><h2>🔒 হিসাব ও ব্যাকআপ</h2><p class="muted small">আয়-খরচ, লাভ-ক্ষতি, ছাত্রদের পূর্ণ তালিকা আর ব্যাকআপ শুধু পরিচালক দেখতে ও নামাতে পারেন।</p></div>`}
  </div>`, () => {
    bindGo();
    if ($('#r5')) $('#r5').onclick = () => csvDownload(`sakura-profit-loss-${todayISO()}.csv`, [['Month', 'Income', 'Expenses', 'Profit'], ...pl.map(r => [r.m, r.inc, r.exp, r.pr])]);
    $('#r1').onclick = () => csvDownload(`sakura-dues-${todayISO()}.csv`, [['Admission no', 'Name', 'Level', 'Batch', 'Total fee', 'Discount', 'Paid', 'Due', 'Next due date', 'Phone', 'Guardian phone'], ...studs.map(s => [s.admission_no, s.name_en || s.name_bn, s.current_level, s.batch, s.total_fee, s.discount, paidOf(s.id), dueOf(s), s.next_due_date, s.phone, s.guardian_phone]).filter(r => r[7] > 0)]);
    $('#r2').onclick = () => csvDownload(`sakura-attendance-${todayISO()}.csv`, [['Admission no', 'Name', 'Level', 'Classes marked', 'Attended', 'Attendance %', 'Total hours', 'N5 hours', 'N4 hours', 'N3 hours', 'First class', 'Last class'], ...studs.map(s => { const a = attOf(s.id, smap); return [s.admission_no, s.name_en || s.name_bn, s.current_level, a.total, a.came, a.pct ?? '', a.hours, a.byLevel.N5 || 0, a.byLevel.N4 || 0, a.byLevel.N3 || 0, a.first || '', a.last || '']; })]);
    if ($('#r3')) $('#r3').onclick = () => { const cols = ['admission_no', 'admission_date', 'name_bn', 'name_en', 'dob', 'gender', 'nid', 'passport_no', 'phone', 'email', 'address_present', 'address_permanent', 'education', 'guardian_name', 'guardian_relation', 'guardian_phone', 'package', 'current_level', 'batch', 'start_date', 'total_fee', 'discount', 'status', 'japan_stage', 'target_school', 'intake', 'notes']; csvDownload(`sakura-students-${todayISO()}.csv`, [cols, ...S.students.map(s => cols.map(c => s[c]))]); };
    if ($('#r6')) $('#r6').onclick = fullBackup;
    if ($('#r4')) $('#r4').onclick = () => { const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), settings: S.settings, ...Object.fromEntries(TABLES.map(t => [t, S[t]])) }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sakura-backup-${todayISO()}.json`; a.click(); };
  });
}

// ------------------------------------------------------------------ settings
function viewSettings() {
  const st = S.settings; const ro = isAdmin() ? '' : 'disabled';
  mount('#/settings', `
  <div class="top"><div><h1>সেটিংস</h1><p>${isAdmin() ? 'রশিদ আর সার্টিফিকেটে এই তথ্য ব্যবহার হবে' : 'শুধু অ্যাডমিন বদলাতে পারবেন'}</p></div></div>
  <form class="card form" id="stf">
    <h3>প্রতিষ্ঠান</h3>
    <label class="f full">ঠিকানা (রশিদ ও সার্টিফিকেটে যাবে)<input name="address" value="${esc(st.address)}" ${ro}></label>
    <label class="f">ফোন<input name="phone" value="${esc(st.phone)}" ${ro}></label><label class="f">WhatsApp<input name="whatsapp" value="${esc(st.whatsapp)}" ${ro}></label>
    <label class="f">ইমেইল<input name="email" value="${esc(st.email)}" ${ro}></label><label class="f">প্রতি ক্লাসের ঘণ্টা<input name="hours_per_class" type="number" step="0.5" min="0.5" value="${esc(st.hours_per_class)}" ${ro}></label>
    <label class="f">ডিরেক্টরের নাম (ইংরেজি)<input name="director_en" value="${esc(st.director_en)}" ${ro}></label><label class="f">ডিরেক্টরের নাম (জাপানি)<input name="director_ja" value="${esc(st.director_ja)}" ${ro}></label>
    <h3>ক্লাসের দিন</h3>
    <div class="f full"><div class="row" style="gap:12px;flex-wrap:wrap">${WDAY.map((w, i) => `<label style="display:flex;gap:5px;align-items:center;font-weight:500"><input type="checkbox" data-cd="${i}" ${classDays().includes(i) ? 'checked' : ''} ${ro}> ${w}বার</label>`).join('')}</div><span class="small muted">টিক না দেওয়া দিনগুলো সাপ্তাহিক ছুটি ধরা হবে।</span></div>
    <h3>সতর্কতার নিয়ম</h3>
    <label class="f">পাসপোর্টের মেয়াদ কত মাসের কম হলে সতর্কতা<input name="alert_passport_months" type="number" min="1" max="24" value="${esc(st.alert_passport_months)}" ${ro}></label>
    <label class="f">ব্যাংক / আয়ের কাগজ কত দিন পর পুরোনো<input name="alert_fresh_days" type="number" min="30" max="365" value="${esc(st.alert_fresh_days)}" ${ro}></label>
    <label class="f">আবেদনের শেষ তারিখের কত দিন আগে সতর্কতা<input name="alert_deadline_days" type="number" min="1" max="90" value="${esc(st.alert_deadline_days)}" ${ro}></label>
    <label class="f">আইডি কার্ডের মেয়াদ (ক্লাস শুরু থেকে কত মাস)<input name="id_valid_months" type="number" min="1" max="60" value="${esc(st.id_valid_months)}" ${ro}></label>
    <h3>কোর্স ফি (৳)</h3>
    ${PACKAGES.map(p => `<label class="f">${p}<input name="fee_${p}" type="number" min="0" value="${esc(st.fees[p])}" ${ro}></label>`).join('')}
    <h3>WhatsApp মেসেজের লেখা</h3>
    <p class="full small muted" style="margin:0">{name} = ছাত্র বা আগ্রহীর নাম, {due} = বকেয়া টাকা, {date} = তারিখ, {pct} = উপস্থিতি %, {institute} = প্রতিষ্ঠানের নাম, {phone} = অফিসের ফোন। এগুলো নিজে থেকে বসে যাবে।</p>
    <label class="f full">বকেয়ার রিমাইন্ডার<textarea name="wa_due" ${ro}>${esc(st.wa_due)}</textarea></label>
    <label class="f full">অনুপস্থিতির খবর<textarea name="wa_absent" ${ro}>${esc(st.wa_absent)}</textarea></label>
    <label class="f full">পরীক্ষার রেজাল্ট ({exam} = পরীক্ষার নাম, {marks} = নম্বর, {result} = পাস/ফেল)<textarea name="wa_result" ${ro}>${esc(st.wa_result)}</textarea></label>
    <label class="f full">জাপানের আবেদনের খবর ({school} = স্কুল, {intake} = সেশন, {status} = অবস্থা)<textarea name="wa_japan" ${ro}>${esc(st.wa_japan)}</textarea></label>
    <label class="f full">কাগজের সতর্কতা ({doc} = কোন কাগজ, {issue} = সমস্যা)<textarea name="wa_doc" ${ro}>${esc(st.wa_doc)}</textarea></label>
    <label class="f full">অভিভাবকের লিংক পাঠানো ({link} = লিংক)<textarea name="wa_parent" ${ro}>${esc(st.wa_parent)}</textarea></label>
    <label class="f full">আগ্রহী ছাত্রকে প্রথম মেসেজ<textarea name="wa_lead" ${ro}>${esc(st.wa_lead)}</textarea></label>
    <h3>পরীক্ষার তারিখ (ছাত্রদের সাইটে কাউন্টডাউন)</h3>
    <label class="f">পরের JLPT-র তারিখ<input name="jlpt_date" type="date" value="${esc(st.jlpt_date || '')}" ${ro}></label>
    <label class="f">পরের NAT-TEST-এর তারিখ (ঐচ্ছিক)<input name="nat_date" type="date" value="${esc(st.nat_date || '')}" ${ro}></label>
    <p class="full small muted" style="margin:0">খালি রাখলে ছাত্ররা জুলাই/ডিসেম্বরের প্রথম রবিবার (JLPT-র সাধারণ দিন) "আনুমানিক" হিসেবে দেখবে। বাংলাদেশে পরীক্ষার আসল তারিখ ঘোষণা হলে এখানে বসিয়ে দিন।</p>
    <h3>বন্ধুকে আনুন (রেফারেল)</h3>
    <label class="f full">রেফার করলে ছাত্র কী পাবে (ঐচ্ছিক — খালি রাখলে কিছু লেখা থাকবে না)<input name="ref_reward" maxlength="150" placeholder="যেমন: বন্ধু ভর্তি হলে আপনার পরের কিস্তিতে ৫০০ টাকা ছাড়" value="${esc(st.ref_reward || '')}" ${ro}></label>
    <h3>অনলাইনে টাকা নেওয়ার নম্বর (ছাত্রদের সাইটে দেখাবে)</h3>
    <label class="f">বিকাশ নম্বর<input name="pay_bkash" placeholder="01XXXXXXXXX (Personal/Merchant)" value="${esc(st.pay_bkash || '')}" ${ro}></label>
    <label class="f">নগদ নম্বর<input name="pay_nagad" value="${esc(st.pay_nagad || '')}" ${ro}></label>
    <label class="f full">ব্যাংক অ্যাকাউন্ট (ঐচ্ছিক)<input name="pay_bank" placeholder="ব্যাংক, শাখা, অ্যাকাউন্টের নাম ও নম্বর" value="${esc(st.pay_bank || '')}" ${ro}></label>
    <h3>ক্লাসের সময় ও অনলাইন ক্লাস (ছাত্রদের সাইটে রুটিন)</h3>
    <label class="f">সকালের ব্যাচের সময়<input name="time_morning" placeholder="যেমন ১০:০০ – ১২:০০" value="${esc(st.time_morning || '')}" ${ro}></label>
    <label class="f">বিকেলের ব্যাচের সময়<input name="time_evening" placeholder="যেমন ৪:০০ – ৬:০০" value="${esc(st.time_evening || '')}" ${ro}></label>
    <label class="f full">অনলাইন ক্লাসের লিংক (Zoom / Google Meet, ঐচ্ছিক)<input name="online_link" type="url" placeholder="https://meet.google.com/..." value="${esc(st.online_link || '')}" ${ro}></label>
    <p class="full small muted" style="margin:0">কোনো একদিনের জন্য আলাদা বিষয় বা লিংক দিতে চাইলে ক্যালেন্ডারে সেই দিনে ক্লিক করে "ক্লাসের পরিকল্পনা" যোগ করুন।</p>
    <h3>সার্টিফিকেটে বইয়ের নাম</h3>
    ${LEVELS.map(l => `<label class="f">${l}<input name="tb_${l}" value="${esc(st.textbooks[l])}" ${ro}></label>`).join('')}
    ${isAdmin() ? '<div class="full row" style="justify-content:flex-end"><button class="btn">সংরক্ষণ</button></div>' : ''}
  </form>
  <div class="card" style="margin-top:16px"><div class="row" style="margin-bottom:8px"><h2 style="margin:0">স্টাফ ও শিক্ষক</h2><span class="spacer"></span><a class="btn sm ghost" href="#/people">যোগ করুন / বদলান</a></div><div class="tw"><table><tr><th>নাম</th><th>ভূমিকা</th></tr>${S.profiles.map(p => `<tr><td>${esc(p.name || '—')}</td><td>${ROLE_NAME[p.role] || p.role}</td></tr>`).join('')}</table></div>
  <p class="small muted">নতুন স্টাফ যোগ করতে README-এর "স্টাফ যোগ করা" অংশ দেখুন। স্টাফরা ছাত্র ভর্তি, টাকা জমা আর হাজিরা নিতে পারবেন; মোছা আর টাকার রেকর্ড বদলানো শুধু অ্যাডমিনের কাজ।</p></div>
  ${DEMO ? `<div class="card" style="margin-top:16px"><h2>ডেমো</h2><p class="small muted">পরীক্ষা করার জন্য কয়েকজন কাল্পনিক ছাত্র আর হাজিরা যোগ করুন, অথবা সব ডেমো তথ্য মুছে দিন।</p><div class="row"><button class="btn ghost" id="seed">ডেমো তথ্য যোগ করুন</button><button class="btn ghost" id="wipe" style="color:var(--red)">সব ডেমো তথ্য মুছুন</button></div></div>` : ''}`, () => {
    $('#stf').onsubmit = async (e) => {
      e.preventDefault(); const d = formData(e.target);
      const data = { ...S.settings, address: d.address, phone: d.phone, whatsapp: d.whatsapp, email: d.email, director_en: d.director_en, director_ja: d.director_ja, jlpt_date: d.jlpt_date || '', nat_date: d.nat_date || '', ref_reward: (d.ref_reward || '').trim(), pay_bkash: (d.pay_bkash || '').trim(), pay_nagad: (d.pay_nagad || '').trim(), pay_bank: (d.pay_bank || '').trim(), time_morning: (d.time_morning || '').trim(), time_evening: (d.time_evening || '').trim(), online_link: /^https:\/\//.test((d.online_link || '').trim()) ? d.online_link.trim() : '', hours_per_class: d.hours_per_class || 2, fees: Object.fromEntries(PACKAGES.map(p => [p, d['fee_' + p] || 0])), textbooks: Object.fromEntries(LEVELS.map(l => [l, d['tb_' + l]])), wa_due: d.wa_due || DEFAULT_SETTINGS.wa_due, wa_absent: d.wa_absent || DEFAULT_SETTINGS.wa_absent, wa_lead: d.wa_lead || DEFAULT_SETTINGS.wa_lead, wa_result: d.wa_result || DEFAULT_SETTINGS.wa_result, wa_japan: d.wa_japan || DEFAULT_SETTINGS.wa_japan, wa_doc: d.wa_doc || DEFAULT_SETTINGS.wa_doc, wa_parent: d.wa_parent && d.wa_parent.includes('{link}') ? d.wa_parent : DEFAULT_SETTINGS.wa_parent, alert_passport_months: d.alert_passport_months || 6, alert_fresh_days: d.alert_fresh_days || 90, alert_deadline_days: d.alert_deadline_days || 14, id_valid_months: d.id_valid_months || 12, class_days: $$('[data-cd]').filter(x => x.checked).map(x => num(x.dataset.cd)) };
      if (!data.class_days.length) return toast('অন্তত একটা ক্লাসের দিন বাছুন', true);
      try { await API.saveSettings(data); S.settings = data;
        const nm = (data.director_en || '').trim();
        if (isDirector() && nm && nm !== S.profile.name && !DEMO) { const { error } = await sb.from('profiles').update({ name: nm }).eq('id', S.profile.id); if (!error) { S.profile.name = nm; S.profiles = (S.profiles || []).map(x => x.id === S.profile.id ? { ...x, name: nm } : x); } }
        else if (isDirector() && nm && DEMO) S.profile.name = nm;
        toast('সংরক্ষণ হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); }
    };
    if (DEMO) {
      $('#seed').onclick = async () => { await seedDemo(); await loadAll(); toast('ডেমো তথ্য যোগ হয়েছে'); location.hash = '#/'; };
      $('#wipe').onclick = async () => { if (!(await confirmBox('এই ব্রাউজারের সব ডেমো তথ্য মুছে যাবে।'))) return; [...TABLES, 'files', 'settings', 'audit_log'].forEach(t => localStorage.removeItem('sakura_demo_' + t)); await loadAll(); toast('মুছে ফেলা হয়েছে'); render(); };
    }
  });
}
async function seedDemo() {
  const names = [['ডেমো ছাত্র এক', 'DEMO STUDENT ONE'], ['ডেমো ছাত্রী দুই', 'DEMO STUDENT TWO'], ['ডেমো ছাত্র তিন', 'DEMO STUDENT THREE'], ['ডেমো ছাত্রী চার', 'DEMO STUDENT FOUR'], ['ডেমো ছাত্র পাঁচ', 'DEMO STUDENT FIVE'], ['ডেমো ছাত্রী ছয়', 'DEMO STUDENT SIX']];
  const base = new Date(); base.setDate(base.getDate() - 30);
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1, 2)}-${pad(dt.getDate(), 2)}`;
  let n = S.students.reduce((m, x) => Math.max(m, num((x.admission_no || '').replace(/\D/g, ''))), 0);
  const made = [];
  for (const [i, [bn, en]] of names.entries()) {
    n++; const pkg = ['N5', 'N5+N4', 'N5+N4+N3'][i % 3];
    made.push(await Local.insert('students', { admission_no: 'SJI-' + pad(n, 4), admission_date: iso(base), name_bn: bn, name_en: en, phone: '01700-00000' + i, guardian_name: 'ডেমো অভিভাবক', guardian_phone: '01800-00000' + i, package: pkg, current_level: 'N5', batch: i < 4 ? 'morning' : 'evening', start_date: iso(base), total_fee: DEFAULT_SETTINGS.fees[pkg], discount: 0, status: 'active', japan_stage: i === 0 ? 'docs' : 'none' }));
  }
  let r = S.payments.reduce((m, p) => Math.max(m, num((p.receipt_no || '').replace(/\D/g, ''))), 0);
  for (const [i, s] of made.entries()) await Local.insert('payments', { student_id: s.id, receipt_no: 'SJI-R-' + pad(++r, 5), paid_on: iso(base), amount: i % 2 ? s.total_fee : 10000, method: ['cash', 'bkash', 'nagad'][i % 3], purpose: 'course_fee' });
  const iso2 = (off) => { const x = new Date(); x.setDate(x.getDate() + off); return iso(x); };
  const mm = monthISO();
  for (const [cat, amt, to, note] of [['rent', 25000, 'ডেমো বাড়িওয়ালা', 'অফিস ভাড়া'], ['salary', 18000, 'ডেমো শিক্ষক', 'মাসিক বেতন'], ['utilities', 3200, 'বিদ্যুৎ অফিস', 'বিদ্যুৎ বিল'], ['internet', 1500, 'ডেমো ISP', 'ইন্টারনেট'], ['marketing', 5000, 'Facebook', 'বিজ্ঞাপন'], ['books', 7200, 'ডেমো বইয়ের দোকান', '৬টি みんなの日本語']]) await Local.insert('expenses', { spent_on: mm + '-05', category: cat, amount: amt, paid_to: to, note, method: 'cash' });
  for (const [nm, src, it, st, off] of [['ডেমো আগ্রহী এক', 'facebook', 'N5', 'new', 0], ['ডেমো আগ্রহী দুই', 'walkin', 'N5', 'trial', -2], ['ডেমো আগ্রহী তিন', 'referral', 'japan', 'contacted', 3], ['ডেমো আগ্রহী চার', 'facebook', 'N4', 'lost', null], ['ডেমো আগ্রহী পাঁচ', 'phone', 'N5', 'contacted', -1]]) await Local.insert('inquiries', { created_on: iso2(-6), name: nm, phone: '01900-00000' + nm.length % 10, source: src, interest: it, status: st, next_follow_up: off == null ? null : iso2(off), notes: 'ডেমো তথ্য' });
  for (const [ti, ty, off, mx] of [['কুইজ ১ — হিরাগানা', 'quiz', -24, 20], ['টেস্ট ১ (পাঠ ১–৫)', 'test', -14, 100], ['কুইজ ৩ — পাঠ ৬–৭', 'quiz', -6, 20]]) {
    const ex = await Local.insert('exams', { exam_date: iso2(off), title: 'ডেমো ' + ti, type: ty, level: 'N5', batch: 'all', max_marks: mx, pass_marks: null });
    await Local.upsertResults(made.map((st, j) => ({ exam_id: ex.id, student_id: st.id, marks: j === 5 && off === -14 ? null : Math.round(mx * (0.45 + ((j * 7 + off * -3) % 50) / 100)), absent: j === 5 && off === -14, note: '' })));
  }
  const scs = []; for (const [name_ja, city, address, capacity, tuition_yen, website, notes] of KOBE_SCHOOLS.slice(0, 3)) scs.push(await Local.insert('jp_schools', { name_ja: name_ja + '（ডেমো）', prefecture: '兵庫県', city, address, capacity, tuition_yen, website, notes, intakes: '1, 4, 7, 10', active: true }));
  const nx = intakeOptions()[1] || intakeOptions()[0];
  for (const [j, sc, st, dl, iv] of [[0, 0, 'interview', null, 5], [0, 1, 'submitted', null, 12], [1, 0, 'preparing', 4, null], [2, 2, 'coe_applied', null, null], [3, 1, 'coe_granted', null, null]]) await Local.insert('applications', { student_id: made[j].id, school_id: scs[sc].id, intake: nx, status: st, deadline_on: dl == null ? null : iso2(dl), submitted_on: st === 'preparing' ? null : iso2(-20), interview_on: iv == null ? null : iso2(iv), result_on: st === 'coe_applied' ? iso2(30) : st === 'coe_granted' ? iso2(-2) : null, school_fee: st === 'coe_granted' ? 'partial' : 'none', note: 'ডেমো তথ্য' });
  await Local.insert('documents', { student_id: made[0].id, doc_type: 'passport', status: 'verified', expires_on: iso2(70), note: '' });
  await Local.insert('documents', { student_id: made[0].id, doc_type: 'bank', status: 'received', issued_on: iso2(-95), note: '' });
  await Local.insert('documents', { student_id: made[2].id, doc_type: 'passport', status: 'received', expires_on: iso2(1500), note: '' });
  await Local.insert('documents', { student_id: made[2].id, doc_type: 'sponsor', status: 'received', issued_on: iso2(-80), note: '' });
  await Local.update('students', made[0].id, { processing_fee: 50000 });
  await Local.insert('payments', { student_id: made[0].id, receipt_no: 'SJI-R-' + pad(++r, 5), paid_on: iso2(-3), amount: 20000, method: 'bank', purpose: 'processing' });
  await Local.insert('holidays', { on_date: iso2(5), title: 'ডেমো ছুটি — প্রতিষ্ঠানের অনুষ্ঠান', type: 'institute', batch: 'all' });
  await Local.insert('holidays', { on_date: iso2(-9), title: 'ডেমো সরকারি ছুটি', type: 'govt', batch: 'all' });
  const t1 = await Local.insert('teachers', { name: 'ডেমো শিক্ষক এক', phone: '01600-000001', levels: 'N5', qualification: 'JLPT N2', pay_type: 'hourly', rate: 500, joined_on: iso(base), active: true });
  const t2 = await Local.insert('teachers', { name: 'ডেমো শিক্ষিকা দুই', phone: '01600-000002', levels: 'N5, N4', qualification: 'জাপানে ৫ বছর', pay_type: 'monthly', rate: 15000, joined_on: iso(base), active: true });
  await Local.insert('expenses', { spent_on: iso2(-1), category: 'salary', amount: 5000, method: 'bkash', paid_to: t1.name, teacher_id: t1.id, period: monthISO(iso2(-1)), note: 'অগ্রিম বেতন' });
  const ga = (await Promise.resolve(Local.read('applications'))).find(a => a.status === 'coe_granted');
  if (ga) await Local.insert('commissions', { school_id: ga.school_id, application_id: ga.id, student_id: ga.student_id, status: 'received', amount_yen: 50000, amount_bdt: 40000, received_on: iso2(-1), note: 'ডেমো তথ্য' });
  for (let k = 0; k < 12; k++) {
    const dt = new Date(base); dt.setDate(base.getDate() + k * 2); if (dt > new Date()) break;
    for (const batch of ['morning', 'evening']) {
      const tt = batch === 'morning' ? t1 : t2;
      let ss; try { ss = await Local.insert('sessions', { class_date: iso(dt), level: 'N5', batch, class_no: k + 1, hours: 2, topic: 'ডেমো পাঠ ' + (k + 1), teacher: tt.name, teacher_id: tt.id }); } catch { continue; }
      await Local.upsertAttendance(made.filter(s => s.batch === batch).map((s, j) => ({ session_id: ss.id, student_id: s.id, status: (k + j) % 5 === 0 ? 'absent' : (k + j) % 7 === 0 ? 'late' : 'present' })));
    }
  }
}

// ------------------------------------------------------------------ printing
function printWindow(title, bodyHtml, win) {
  const w = win || window.open('', '_blank');
  if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
  if (win) { try { w.document.open(); } catch { /* fresh window */ } }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@700;800&family=Shippori+Mincho+B1:wght@500;700;800&display=swap">
  <style>@page{size:A4;margin:12mm}body{font-family:'Hind Siliguri',sans-serif;color:#26231E;margin:0}
  .hd{display:flex;align-items:center;gap:12px;background:#1B2945;color:#fff;padding:14px 18px;border-bottom:4px solid #A3843A}
  .km{width:52px;height:52px;border-radius:50%;background:#FBF8F1;border:2px solid #C9A95C;display:grid;place-items:center;flex:none}
  .t1{font:800 19px 'Shippori Mincho B1'}.t2{font-size:12px;color:#E2C987;letter-spacing:3px}.ct{margin-left:auto;text-align:right;font-size:11.5px;line-height:1.5}
  table{width:100%;border-collapse:collapse;font-size:13.5px}td,th{border:1px solid #D8CDB9;padding:7px 10px;text-align:left}th{background:#F6F0E4;width:34%;font-weight:600}
  .print{position:fixed;bottom:14px;right:14px;background:#1B2945;color:#fff;border:none;padding:8px 14px;border-radius:6px;font:inherit;cursor:pointer}@media print{.print{display:none}}</style></head>
  <body><button class="print" onclick="window.print()">প্রিন্ট / Print</button>${bodyHtml}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* user can press the button */ } }, 700);
}
function headHtml() {
  const st = S.settings;
  return `<div class="hd"><span class="km">${KAMON}</span><div><div class="t1">${esc(st.institute_en)}</div><div style="font:700 14px 'Noto Serif Bengali'">${esc(st.institute_bn)}</div><div class="t2">${esc(st.institute_ja)}</div></div>
  <div class="ct">${esc(st.phone)} · WhatsApp ${esc(st.whatsapp)}<br>${esc(st.email)}<br>${esc(st.address || '')}</div></div>`;
}
function printReceipt(p) {
  if (!p) return; const s = byId(S.students, p.student_id) || {};
  const proc = p.purpose === 'processing';
  const paidTotal = proc ? procPaidOf(s.id) : paidOf(s.id); const due = s.id ? (proc ? procDueOf(s) : dueOf(s)) : 0; const feeTotal = proc ? num(s.processing_fee) : netFee(s);
  const copy = (label) => `<div style="border:1.5px solid #A3843A;margin-bottom:14px;page-break-inside:avoid">${headHtml()}
  <div style="padding:14px 18px"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px"><div><div style="font:700 11px 'Shippori Mincho B1';letter-spacing:3px;color:#A3843A">MONEY RECEIPT</div><div style="font:800 20px 'Noto Serif Bengali'">ফি-র রশিদ</div></div>
  <div style="text-align:right;font-size:13px"><span style="background:#C8372B;color:#fff;padding:2px 10px;border-radius:4px;font-weight:700">${label}</span><br>রশিদ নং: <b>${esc(p.receipt_no)}</b> · তারিখ: <b>${fmtD(p.paid_on)}</b></div></div>
  <table><tr><th>ছাত্র/ছাত্রীর নাম</th><td>${esc(s.name_bn || '')} ${s.name_en ? '(' + esc(s.name_en) + ')' : ''}</td></tr><tr><th>ভর্তি নম্বর</th><td>${esc(s.admission_no || '')}</td></tr>
  <tr><th>কোর্স / ব্যাচ</th><td>${esc(s.package || '')} · ${esc(BATCH[s.batch] || '')}</td></tr><tr><th>বাবদ</th><td>${esc(PURPOSE[p.purpose] || p.purpose)}</td></tr>
  <tr><th>মাধ্যম</th><td>${esc(METHOD[p.method] || p.method)}${p.trx_id ? ' · TrxID: ' + esc(p.trx_id) : ''}</td></tr>
  <tr><th>টাকার পরিমাণ</th><td><b style="font-size:17px;color:#C8372B">${tk(p.amount)}</b><br><span style="font-size:12px">In words: Taka ${words(p.amount)} only</span></td></tr>
  <tr><th>${proc ? 'প্রসেসিং ফি' : 'মোট ফি'} · মোট পরিশোধিত · বকেয়া</th><td>${tk(feeTotal)} · ${tk(paidTotal)} · <b>${tk(due)}</b>${s.next_due_date && due && !proc ? ' · পরের কিস্তি ' + fmtD(s.next_due_date) : ''}</td></tr></table>
  <div style="display:flex;justify-content:space-between;margin-top:34px;font-size:12.5px"><div style="border-top:1px dotted #8A7F6C;width:40%;padding-top:4px">প্রদানকারীর স্বাক্ষর</div><div style="border-top:1px dotted #8A7F6C;width:40%;padding-top:4px;text-align:right">গ্রহণকারীর স্বাক্ষর ও সিল</div></div>
  <div style="font-size:11px;color:#6E665A;margin-top:8px">ফেরত নীতি: ক্লাস শুরুর অন্তত ৩ দিন আগে বাতিল করলে ৮০% ফেরত। রশিদটি যত্নে রাখুন।</div></div></div>`;
  printWindow('Receipt ' + p.receipt_no, copy('অফিস কপি') + '<div style="border-top:1.5px dashed #8A7F6C;margin:4px 0 14px"></div>' + copy('ছাত্র কপি'));
}
// ------------------------------------------------------------------ certificates that can be checked online (v44)
// each print saves a number + secret code; the QR opens sakura.institute/verify where anyone with both sees it is genuine
const VERIFY_BASE = 'https://sakura.institute/verify/';
const CERT_KIND = { hours: 'স্টাডি-আওয়ার সার্টিফিকেট', transcript: 'রেজাল্ট সার্টিফিকেট', mock: 'মক টেস্ট পাসের সার্টিফিকেট' };
const verifyUrl = (c) => `${VERIFY_BASE}?n=${encodeURIComponent(c.cert_no)}&k=${encodeURIComponent(c.code)}`;
async function issueCert(kind, s, details) {
  const name = s.name_en || s.name_bn || '';
  if (DEMO) {
    const n = (S.certificates || []).length + 1;
    const c = { id: uuid(), cert_no: `SJI-${todayISO().slice(0, 4)}-${String(n).padStart(5, '0')}`, code: uuid().replace(/-/g, '').slice(0, 10).toUpperCase(), kind, student_id: s.id, name_en: name, student_no: s.admission_no || '', details, issued_on: todayISO(), revoked_at: null, revoked_reason: '' };
    S.certificates = [...(S.certificates || []), c]; return c;
  }
  const { data, error } = await sb.rpc('issue_certificate', { p_kind: kind, p_student: s.id, p_name: name, p_student_no: s.admission_no || '', p_details: details });
  if (error) throw error; return data;
}
// the window opens first (so pop-up blockers allow it), then the number is made and the page drawn into it
function certWindow() { const w = window.open('', '_blank'); if (w) w.document.write('<p style="font:16px sans-serif;padding:24px">সার্টিফিকেট তৈরি হচ্ছে…</p>'); return w; }
async function certVerifyHtml(kind, s, details) {
  try {
    const [c, q] = await Promise.all([issueCert(kind, s, details), loadQR().then(() => true).catch(() => false)]);   // no QR library (offline)? the number and code still print
    return `<div style="display:flex;gap:14px;align-items:center;margin-top:20px;padding:10px 12px;border:1px solid #D8CDB9;border-radius:8px;font-family:'Hind Siliguri',sans-serif">
    ${q ? `<div style="width:88px;height:88px;flex:none">${qrSvg(verifyUrl(c))}</div>` : ''}
    <div style="font-size:12px;line-height:1.65">証明書番号 / Certificate No.: <b style="font:700 14px ui-monospace,monospace">${esc(c.cert_no)}</b><br>確認コード / Verification code: <b style="font:700 14px ui-monospace,monospace;letter-spacing:1px">${esc(c.code)}</b><br>
    真偽の確認 / Verify online: <b>sakura.institute/verify</b> — QRコードを読み取るか、番号とコードを入力してください。<br><span style="color:#6E665A">Scan the QR code, or enter the number and code, to confirm this certificate is genuine.</span></div></div>`;
  } catch (e) {
    toast(/issue_certificate|schema cache|does not exist/i.test(e.message || '') ? 'অনলাইন যাচাইয়ের নম্বর তৈরি হয়নি — ডাটাবেসে v44 আপডেট চালানো বাকি। সার্টিফিকেট QR ছাড়া প্রিন্ট হচ্ছে।' : 'যাচাই নম্বর তৈরি হয়নি: ' + errMsg(e), true);
    return '';
  }
}
function certListModal(s) {
  const load = DEMO ? Promise.resolve((S.certificates || []).filter(c => c.student_id === s.id).reverse()) : sb.from('certificates').select('*').eq('student_id', s.id).order('created_at', { ascending: false }).then(({ data, error }) => { if (error) throw error; return data; });
  openModal(`<h2>🎓 জারি করা সার্টিফিকেট</h2><p class="small muted" style="margin-top:-4px">প্রতিটা প্রিন্ট করা সার্টিফিকেটের নম্বর এখানে থাকে। QR বা sakura.institute/verify দিয়ে যে কেউ যাচাই করতে পারে।</p><div id="cl"><div class="empty">লোড হচ্ছে…</div></div>`);
  const draw = (rows) => {
    const box = $('#cl'); if (!box) return;
    box.innerHTML = rows.length ? `<div class="tw"><table class="stack"><tr><th>নম্বর</th><th>ধরন</th><th>তারিখ</th><th>অবস্থা</th><th></th></tr>${rows.map(c => `<tr><td data-l="নম্বর"><b style="font-family:ui-monospace,monospace">${esc(c.cert_no)}</b><div class="small muted">কোড ${esc(c.code)}</div></td><td data-l="ধরন">${esc(CERT_KIND[c.kind] || c.kind)}</td><td data-l="তারিখ">${fmtD(c.issued_on)}</td>
      <td data-l="অবস্থা">${c.revoked_at ? badge('dropped', 'বাতিল') + (c.revoked_reason ? `<div class="small muted">${esc(c.revoked_reason)}</div>` : '') : badge('active', 'বৈধ')}</td>
      <td><div class="row" style="gap:6px"><a class="btn sm ghost" target="_blank" rel="noopener" href="${esc(verifyUrl(c))}">যাচাই পাতা</a>${isAdmin() && !c.revoked_at ? `<button class="btn sm ghost" data-rv="${esc(c.id)}" style="color:var(--red)">বাতিল</button>` : ''}</div></td></tr>`).join('')}</table></div>` : '<div class="empty">এখনো কোনো সার্টিফিকেট প্রিন্ট হয়নি</div>';
    $$('[data-rv]').forEach(b => b.onclick = async () => {
      const why = prompt('কেন বাতিল করছেন? (যাচাই পাতায় দেখাবে, যেমন "ভুল তথ্য — নতুন সার্টিফিকেট দেওয়া হয়েছে")', ''); if (why === null) return;
      try {
        const patch = { revoked_at: new Date().toISOString(), revoked_reason: why.trim() };
        if (DEMO) S.certificates = S.certificates.map(x => x.id === b.dataset.rv ? { ...x, ...patch } : x);
        else { const { error } = await sb.from('certificates').update(patch).eq('id', b.dataset.rv); if (error) throw error; }
        toast('সার্টিফিকেট বাতিল হয়েছে'); certListModal(s);
      } catch (e) { toast(errMsg(e), true); }
    });
  };
  load.then(draw).catch(e => { const box = $('#cl'); if (box) box.innerHTML = `<div class="empty">${/certificates|schema cache|does not exist/i.test(e.message || '') ? 'ডাটাবেসে v44 আপডেট চালানো বাকি।' : esc(errMsg(e))}</div>`; });
}
async function printCertificate(s) {
  const a = attOf(s.id); const st = S.settings;
  if (!a.hours) return toast('এখনো কোনো উপস্থিতির ঘণ্টা নেই', true);
  const jd = (iso) => iso ? `${iso.slice(0, 4)}年${num(iso.slice(5, 7))}月${num(iso.slice(8, 10))}日` : '';
  const today = todayISO();
  const rows = LEVELS.filter(l => a.byLevel[l]).map(l => `<tr><td>${l}</td><td>${esc(st.textbooks[l] || '')}</td><td style="text-align:right">${a.byLevel[l]} 時間</td></tr>`).join('');
  const w = certWindow(); if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
  const vb = await certVerifyHtml('hours', s, { hours: a.hours, pct: a.pct, from: a.first, to: a.last, levels: Object.fromEntries(LEVELS.filter(l => a.byLevel[l]).map(l => [l, a.byLevel[l]])) });
  printWindow('Certificate ' + s.admission_no, `${headHtml()}
  <div style="padding:26px 30px;font-family:'Shippori Mincho B1',serif">
  <div style="text-align:center;margin-bottom:22px"><div style="font-size:26px;font-weight:800;letter-spacing:6px">日本語学習時間証明書</div><div style="font-size:13px;letter-spacing:2px;color:#6E665A">CERTIFICATE OF JAPANESE LANGUAGE STUDY HOURS</div></div>
  <table style="font-family:'Shippori Mincho B1','Hind Siliguri',serif"><tr><th>氏名 / Name</th><td>${esc(s.name_en || '')}</td></tr><tr><th>生年月日 / Date of Birth</th><td>${s.dob ? jd(s.dob) + ' (' + fmtD(s.dob) + ')' : ''}</td></tr>
  <tr><th>国籍 / Nationality</th><td>バングラデシュ / Bangladesh</td></tr><tr><th>学籍番号 / Student No.</th><td>${esc(s.admission_no)}</td></tr>
  <tr><th>学習期間 / Period of Study</th><td>${jd(a.first)} 〜 ${jd(a.last)}<br><span style="font-size:12px">(${fmtD(a.first)} to ${fmtD(a.last)})</span></td></tr>
  <tr><th>総学習時間 / Total Study Hours</th><td><b style="font-size:18px">${a.hours} 時間 (hours)</b></td></tr><tr><th>出席率 / Attendance Rate</th><td>${a.pct}% (${a.came} / ${a.total})</td></tr></table>
  <div style="margin-top:14px;font-size:13px;font-weight:700">内訳 / Breakdown</div>
  <table style="margin-top:6px"><tr><th style="width:auto">レベル / Level</th><th style="width:auto">使用教材 / Textbook</th><th style="width:auto;text-align:right">時間 / Hours</th></tr>${rows}</table>
  <p style="margin-top:22px;font-size:14px">上記の者は、当学院において上記の通り日本語を学習したことを証明します。<br><span style="font-size:12px;color:#6E665A">This is to certify that the above-named student has studied Japanese at our institute as stated above.</span></p>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;font-size:13.5px;line-height:1.8">
  <div>発行日 / Date of Issue: ${jd(today)} (${fmtD(today)})<br>${esc(st.institute_ja)} / ${esc(st.institute_en)}<br>所在地 / Address: ${esc(st.address || '')}</div>
  <div style="text-align:center"><div style="width:74px;height:74px;border:1.5px dashed #C8372B;border-radius:50%;margin:0 auto 6px;color:#C8372B;display:grid;place-items:center;font-size:12px">印</div>学院長 ${esc(st.director_ja)}<br>Director ${esc(st.director_en)}</div></div>
  ${vb}<p style="font-size:11px;color:#6E665A;margin-top:14px">学習時間は出席記録（出席・遅刻）に基づいて算出しています。 / Hours are calculated from signed attendance records (present and late).</p></div>`, w);
}

async function printTranscript(s) {
  const res = studentResults(s.id); const a = attOf(s.id); const st = S.settings; const today = todayISO();
  const w = certWindow(); if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
  const tk2 = res.filter(x => pctOf(x.r, x.ex) != null);
  const vb = await certVerifyHtml('transcript', s, { hours: a.hours, pct: a.pct, exams: res.length, passed: res.filter(x => !x.r.absent && passed(x.r, x.ex)).length, avg: tk2.length ? Math.round(tk2.reduce((m, x) => m + pctOf(x.r, x.ex), 0) / tk2.length) : null });
  const jd = (iso) => iso ? `${iso.slice(0, 4)}年${num(iso.slice(5, 7))}月${num(iso.slice(8, 10))}日` : '';
  const typeJa = { quiz: '小テスト', test: '定期試験', mock: '模擬試験', jlpt: '日本語能力試験 (JLPT)', nat: 'NAT-TEST', speaking: '会話・面接', other: 'その他' };
  printWindow('Transcript ' + s.admission_no, `${headHtml()}
  <div style="padding:26px 30px;font-family:'Shippori Mincho B1',serif">
  <div style="text-align:center;margin-bottom:20px"><div style="font-size:26px;font-weight:800;letter-spacing:8px">成績証明書</div><div style="font-size:13px;letter-spacing:2px;color:#6E665A">ACADEMIC TRANSCRIPT</div></div>
  <table><tr><th>氏名 / Name</th><td>${esc(s.name_en || '')}</td></tr><tr><th>生年月日 / Date of Birth</th><td>${s.dob ? jd(s.dob) : ''}</td></tr><tr><th>国籍 / Nationality</th><td>バングラデシュ / Bangladesh</td></tr><tr><th>学籍番号 / Student No.</th><td>${esc(s.admission_no)}</td></tr>
  <tr><th>総学習時間 / Study Hours</th><td>${a.hours} 時間 · 出席率 / Attendance ${a.pct == null ? '—' : a.pct + '%'}</td></tr></table>
  <table style="margin-top:14px"><tr><th style="width:auto">日付 / Date</th><th style="width:auto">試験 / Examination</th><th style="width:auto">レベル</th><th style="width:auto;text-align:right">得点 / Score</th><th style="width:auto;text-align:right">%</th><th style="width:auto">合否 / Result</th></tr>
  ${res.map(({ r, ex }) => `<tr><td>${fmtD(ex.exam_date)}</td><td>${esc(typeJa[ex.type] || '')}<br><span style="font-size:12px">${esc(ex.title)}</span></td><td>${esc(ex.level)}</td><td style="text-align:right">${r.absent ? '欠席' : num(r.marks) + ' / ' + num(ex.max_marks)}</td><td style="text-align:right">${pctOf(r, ex) == null ? '—' : pctOf(r, ex) + '%'}</td><td>${r.absent ? '欠席 / Absent' : passed(r, ex) ? '合格 / Pass' : '不合格 / Fail'}</td></tr>`).join('')}</table>
  <p style="margin-top:20px;font-size:14px">上記の通り相違ないことを証明します。<br><span style="font-size:12px;color:#6E665A">We hereby certify that the above is a true record of the student's results at our institute.</span></p>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:28px;font-size:13.5px;line-height:1.8">
  <div>発行日 / Date of Issue: ${jd(today)} (${fmtD(today)})<br>${esc(st.institute_ja)} / ${esc(st.institute_en)}<br>所在地 / Address: ${esc(st.address || '')}</div>
  <div style="text-align:center"><div style="width:74px;height:74px;border:1.5px dashed #C8372B;border-radius:50%;margin:0 auto 6px;color:#C8372B;display:grid;place-items:center;font-size:12px">印</div>学院長 ${esc(st.director_ja)}<br>Director ${esc(st.director_en)}</div></div>${vb}</div>`, w);
}

// ------------------------------------------------------------------ student ID cards (85.6 × 54 mm, front + back side by side)
let _qrLib = null;
function loadQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (_qrLib) return _qrLib;
  _qrLib = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; sc.onload = () => res(window.qrcode); sc.onerror = () => { _qrLib = null; rej(new Error('QR কোড তৈরির ফাইল লোড হয়নি — ইন্টারনেট দেখে আবার চেষ্টা করুন')); }; document.head.appendChild(sc); });
  return _qrLib;
}
const profileLink = (s) => `${location.origin}${location.pathname}#/student/${s.id}`;
function qrSvg(text) { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
function cardValidTill(s) { const from = s.start_date || s.admission_date || todayISO(); return addMonthsISO(from, num(S.settings.id_valid_months) || 12); }

// ------------------------------------------------------------------ staff and teacher ID cards (v39): the director sees all, everyone else only their own
const ROLE_EN = { admin: 'DIRECTOR', deputy: 'DEPUTY DIRECTOR', staff: 'OFFICE STAFF', head_teacher: 'HEAD TEACHER', teacher: 'TEACHER' };
const BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
function cardOf(p) {   // the person's card; in the demo it is made on the spot, like the database trigger does
  if (!p) return null; let c = (S.staff_cards || []).find(x => x.profile_id === p.id); if (c || !DEMO) return c || null;
  const pre = 'SJI-' + ({ admin: 'D', deputy: 'D', head_teacher: 'T', teacher: 'T' }[p.role] || 'S') + '-'; const n = (S.staff_cards || []).filter(x => (x.staff_no || '').startsWith(pre)).length + 1;
  c = { id: p.id, profile_id: p.id, staff_no: pre + String(n).padStart(3, '0'), designation: ROLE_NAME[p.role] || 'অফিস স্টাফ', phone: '', blood_group: '', photo_path: '', joined_on: todayISO(), valid_until: addMonthsISO(todayISO(), 24) };
  S.staff_cards = [...(S.staff_cards || []), c]; return c;
}
async function saveCard(pid, patch) {
  if (DEMO) { S.staff_cards = S.staff_cards.map(x => x.profile_id === pid ? { ...x, ...patch } : x); return; }
  if (isDirector()) { const { data, error } = await sb.from('staff_cards').update({ ...patch, updated_at: new Date().toISOString() }).eq('profile_id', pid).select().single(); if (error) throw error; S.staff_cards = S.staff_cards.map(x => x.profile_id === pid ? data : x); }
  else { const { error } = await sb.rpc('my_staff_card_update', { p_phone: patch.phone ?? null, p_blood: patch.blood_group ?? null, p_photo: patch.photo_path || '' }); if (error) throw error; S.staff_cards = S.staff_cards.map(x => x.profile_id === pid ? { ...x, ...patch } : x); }
}
function staffCardModal(p, own) {
  if (!p) return; const c = cardOf(p); if (!c) return toast('কার্ড এখনো তৈরি হয়নি — পরিচালককে v39 আপডেট চালাতে বলুন', true);
  const adm = isDirector(); const ro = (k) => adm ? '' : 'readonly';
  openModal(`<h2>🪪 ${own ? 'আমার আইডি কার্ড' : esc(p.name || '') + '-এর আইডি কার্ড'}</h2>
    <div class="row" style="gap:14px;align-items:flex-start;margin-bottom:10px"><div id="scph" style="width:84px;height:104px;border:2px solid #A3843A;border-radius:8px;background:#EFE6D3;display:grid;place-items:center;overflow:hidden;flex:none"><span style="font:800 26px 'Shippori Mincho B1';color:#A3843A">${esc(((p.name || '?').trim()[0] || '?').toUpperCase())}</span></div>
      <div><div style="font-size:12px;color:var(--muted)">আইডি নম্বর</div><div style="font:800 22px ui-monospace,monospace;letter-spacing:1px;color:var(--red)">${esc(c.staff_no || '—')}</div><div class="small muted">নিজে থেকে তৈরি · ${esc(ROLE_NAME[p.role] || '')}</div>
      <label class="btn sm ghost" style="margin-top:8px;cursor:pointer">📷 ছবি ${c.photo_path ? 'বদলান' : 'দিন'}<input type="file" id="scfile" accept="image/*" hidden></label></div></div>
    <div class="small muted" style="margin:0 0 4px">কার্ড দেখতে এমন হবে (ওপরে সামনের দিক, নিচে পেছনের দিক):</div><div id="scprev" class="cardprev"><div class="small muted" style="padding:20px">কার্ড তৈরি হচ্ছে…</div></div>
    <form id="scf" class="form">
      <label class="f full">নাম (কার্ডে যেমন দেখাবে)<input name="pname" value="${esc(p.name || '')}" maxlength="60" ${adm ? '' : 'readonly'} required></label>
      <label class="f">পদবি<input name="designation" value="${esc(c.designation)}" ${ro()} placeholder="যেমন: সিনিয়র শিক্ষক"></label>
      <label class="f">মোবাইল<input name="phone" value="${esc(c.phone)}" inputmode="tel"></label>
      <label class="f">রক্তের গ্রুপ<select name="blood_group">${BLOOD.map(b => `<option ${c.blood_group === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
      <label class="f">যোগদান<input name="joined_on" type="date" value="${esc(c.joined_on || '')}" ${ro()}></label>
      <label class="f">কার্ডের মেয়াদ<input name="valid_until" type="date" value="${esc(c.valid_until || '')}" ${ro()}></label>
      ${adm ? '' : '<p class="full small muted" style="margin:0">পদবি, যোগদান আর মেয়াদ শুধু পরিচালক বদলাতে পারেন। আপনার কার্ড শুধু আপনি আর পরিচালক দেখতে পান।</p>'}
      <div class="full row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="scc">বন্ধ</button><button type="button" class="btn ghost" id="scp">🖨 প্রিন্ট</button><button class="btn">সংরক্ষণ</button></div></form>`);
  if (c.photo_path) API.fileUrlFrom('staffphoto', c.photo_path).then(u => { const b = $('#scph'); if (b) b.innerHTML = `<img src="${esc(u)}" style="width:100%;height:100%;object-fit:cover">`; }).catch(() => {});
  $('#scc').onclick = closeModal; $('#scp').onclick = () => printStaffCards([p]);
  (async () => { try { await loadQR(); const ph = c.photo_path ? await API.fileUrlFrom('staffphoto', c.photo_path).catch(() => '') : ''; const box = $('#scprev'); if (!box) return;
    const fr = document.createElement('iframe'); fr.title = 'কার্ডের নমুনা'; fr.style.cssText = 'width:100%;height:440px;border:0;display:block';
    fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Serif+Bengali:wght@700;800&family=Shippori+Mincho+B1:wght@700;800&display=swap"><style>${ID_CSS} body{background:transparent} .pair{flex-direction:column;gap:3mm;align-items:center} .card{border-style:solid;border-color:#D8CDB9;border-radius:2mm;box-shadow:0 4px 14px rgba(27,41,69,.18)} .print,.help{display:none}</style></head><body><div class="sheet" style="padding:6px 0">${staffCardHtml(p, ph)}</div></body></html>`;
    box.innerHTML = ''; box.appendChild(fr); } catch (e) { const box = $('#scprev'); if (box) box.innerHTML = `<div class="small" style="color:var(--red)">${esc(errMsg(e))}</div>`; } })();
  $('#scfile').onchange = async (e) => { let f = e.target.files[0]; if (!f) return; if (f.size > 3 * 1048576) return toast('ছবি ৩ MB-এর ছোট দিন', true);
    try { const path = `${p.id}/${Date.now()}.${(f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`; await API.uploadTo('staffphoto', path, f); await saveCard(p.id, { photo_path: path }); toast('ছবি যোগ হয়েছে'); const u = await API.fileUrlFrom('staffphoto', path).catch(() => ''); const f2 = $('#scf'); const keep = f2 ? formData(f2) : null; staffCardModal(p, own); if (keep) { const g = $('#scf'); Object.entries(keep).forEach(([k, v]) => { if (g[k] && !g[k].readOnly) g[k].value = v; }); } } catch (err) { toast(errMsg(err), true); } };
  $('#scf').onsubmit = async (e) => { e.preventDefault(); const d = formData(e.target); const patch = adm ? { designation: d.designation.trim(), phone: d.phone.trim(), blood_group: d.blood_group, joined_on: d.joined_on || null, valid_until: d.valid_until || null } : { phone: d.phone.trim(), blood_group: d.blood_group };
    try { await saveCard(p.id, patch);
      const nm = (d.pname || '').trim();
      if (adm && nm && nm !== p.name) { if (!DEMO) { const { error } = await sb.from('profiles').update({ name: nm }).eq('id', p.id); if (error) throw error; }
        p.name = nm; S.profiles = (S.profiles || []).map(x => x.id === p.id ? { ...x, name: nm } : x); if (S.profile.id === p.id) S.profile.name = nm; }
      toast('সংরক্ষণ হয়েছে — কার্ডে দেখুন'); staffCardModal(p, own); } catch (err) { toast(errMsg(err), true); } };
}
function staffCardHtml(p, photo) { const st = S.settings; const c = cardOf(p) || {}; const tag = /ব্যবস্থাপনা|managing|\bMD\b/i.test(c.designation || '') ? 'MANAGING DIRECTOR' : (ROLE_EN[p.role] || 'STAFF');
    return `<div class="pair"><div class="card front"><div class="band" style="${p.role === 'teacher' || p.role === 'head_teacher' ? 'background:#2E5D3C' : p.role === 'admin' || p.role === 'deputy' ? 'background:#5B1F1A' : ''}"><span class="km">${KAMON}</span><div class="nm"><b>${esc(st.institute_en)}</b><span>${esc(st.institute_ja)}</span></div><span class="tag">${tag} ID</span></div>
      <div class="body"><div class="ph">${photo ? `<img src="${esc(photo)}" alt="">` : `<span>${esc(((p.name || '?').trim()[0] || '?').toUpperCase())}</span>`}</div>
      <div class="info"><div class="en">${esc(p.name || '')}</div><div class="bn">${esc(c.designation || '')}</div>
      <dl><dt>ID No.</dt><dd><b>${esc(c.staff_no || '')}</b></dd><dt>Role</dt><dd>${esc(tag.charAt(0) + tag.slice(1).toLowerCase())}</dd>${c.phone ? `<dt>Phone</dt><dd>${esc(c.phone)}</dd>` : ''}${c.blood_group ? `<dt>Blood</dt><dd>${esc(c.blood_group)}</dd>` : ''}<dt>Valid till</dt><dd>${fmtD(c.valid_until)}</dd></dl></div></div><div class="strip"></div></div>
      <div class="card back"><div class="bbody"><div class="qr">${qrSvg(`${location.origin}${location.pathname}#/people`)}<small>${esc(c.staff_no || '')}</small></div>
      <div class="btxt"><b style="font-family:'Noto Serif Bengali'">${esc(st.institute_bn)}</b><p>এই কার্ড প্রতিষ্ঠানের সম্পত্তি। কাজ ছেড়ে দিলে অফিসে ফেরত দিন। কার্ডটি পেলে নিচের নম্বরে জানান।</p>
      <p>অফিস: <b>${esc(st.phone)}</b><br>WhatsApp: ${esc(st.whatsapp)}${st.address ? `<br>${esc(st.address)}` : ''}</p><div class="sig"><span></span>Director · ${esc(st.director_en)}</div></div></div>
      <div class="bfoot">${esc(st.institute_ja)} · Japanese language · Study in Japan</div></div></div>`; }
async function printStaffCards(people) {
  people = people.filter(Boolean).filter(p => isDirector() || p.id === S.profile.id); if (!people.length) return toast('প্রিন্ট করার মতো কার্ড নেই', true);
  const w = window.open('', '_blank'); if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
  w.document.write('<p style="font-family:sans-serif;padding:20px">কার্ড তৈরি হচ্ছে…</p>');
  try { await loadQR(); } catch (e) { w.close(); return toast(errMsg(e), true); }
  const st = S.settings; const photos = {};
  await Promise.all(people.map(async p => { const c = cardOf(p); if (c && c.photo_path) try { photos[p.id] = await API.fileUrlFrom('staffphoto', c.photo_path); } catch { /* no photo */ } }));
  const card = (p) => staffCardHtml(p, photos[p.id]);
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Staff ID cards (${people.length})</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@700;800&family=Shippori+Mincho+B1:wght@500;700;800&display=swap">
  <style>${ID_CSS}</style></head><body><button class="print" onclick="window.print()">প্রিন্ট / Print</button>
  <p class="help">প্রতি সারিতে বাঁ দিকে সামনের অংশ, ডান দিকে পেছনের অংশ। দাগ বরাবর কেটে মাঝখানে ভাঁজ করে ল্যামিনেট করুন।</p><div class="sheet">${people.map(card).join('')}</div></body></html>`);
  w.document.close(); setTimeout(() => { try { w.focus(); } catch { /* fine */ } }, 300);
}

const ID_CSS = `@page{size:A4;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:'Hind Siliguri',sans-serif;color:#26231E;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{display:flex;flex-direction:column;gap:2.5mm;align-items:center}
  .pair{display:flex;gap:0;page-break-inside:avoid;break-inside:avoid}
  .card{width:85.6mm;height:54mm;border:.2mm dashed #9B907C;position:relative;overflow:hidden;background:#FBF8F1}
  .band{height:13mm;background:#1B2945;color:#fff;display:flex;align-items:center;gap:2mm;padding:0 2.5mm;border-bottom:.8mm solid #A3843A}
  .km{width:9mm;height:9mm;border-radius:50%;background:#FBF8F1;border:.4mm solid #C9A95C;display:grid;place-items:center;flex:none}
  .nm{display:flex;flex-direction:column;line-height:1.15}.nm b{font:800 8.6pt 'Shippori Mincho B1',serif}.nm span{font:700 6.6pt 'Shippori Mincho B1';color:#E2C987;letter-spacing:.6mm}
  .tag{margin-left:auto;background:#C8372B;font:700 5.8pt sans-serif;letter-spacing:.3mm;padding:.8mm 1.6mm;border-radius:.8mm}
  .body{display:flex;gap:2.8mm;padding:2.6mm 3mm 0}
  .ph{width:20mm;height:25mm;border:.5mm solid #A3843A;background:#EFE6D3;display:grid;place-items:center;flex:none;overflow:hidden}
  .ph img{width:100%;height:100%;object-fit:cover}.ph span{font:800 18pt 'Shippori Mincho B1';color:#A3843A}
  .info{min-width:0;flex:1}.en{font:800 9.4pt 'Shippori Mincho B1',serif;color:#1B2945;line-height:1.15;text-transform:uppercase}.bn{font:700 8pt 'Noto Serif Bengali';margin-bottom:1mm}
  dl{display:grid;grid-template-columns:auto 1fr;gap:.3mm 2mm;margin:0;font-size:6.6pt;line-height:1.35}dt{color:#6E665A}dd{margin:0}
  .strip{position:absolute;left:0;right:0;bottom:0;height:2.2mm;background:#C8372B}
  .bbody{display:flex;gap:3mm;padding:3.5mm 3.2mm 0}
  .qr{width:25mm;flex:none;text-align:center}.qr svg{width:25mm;height:25mm;display:block}.qr small{font-size:6pt;color:#6E665A}
  .btxt{font-size:6.4pt;line-height:1.4;min-width:0}.btxt b{font-size:7.8pt;color:#1B2945}.btxt p{margin:.8mm 0}
  .sig{margin-top:2.2mm;font-size:5.8pt;color:#6E665A}.sig span{display:block;width:24mm;border-top:.2mm solid #8A7F6C;margin-bottom:.4mm}
  .bfoot{position:absolute;left:0;right:0;bottom:0;height:5mm;background:#1B2945;color:#E2C987;font:700 5.8pt 'Shippori Mincho B1';letter-spacing:.3mm;display:grid;place-items:center}
  .help{font-size:12px;color:#6E665A;text-align:center;margin:6mm 0 3mm}
  .print{position:fixed;bottom:14px;right:14px;background:#1B2945;color:#fff;border:none;padding:8px 14px;border-radius:6px;font:inherit;cursor:pointer}@media print{.print,.help{display:none}}`;
async function printIdCards(list) {
  list = list.filter(Boolean);
  if (!list.length) return toast('কার্ড প্রিন্ট করার মতো কোনো ছাত্র নেই', true);
  const w = window.open('', '_blank'); // open first so the pop-up blocker allows it
  if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
  w.document.write('<p style="font-family:sans-serif;padding:20px">কার্ড তৈরি হচ্ছে…</p>');
  try { await loadQR(); } catch (e) { w.close(); return toast(errMsg(e), true); }
  const photos = {};
  await Promise.all(list.map(async s => { const d = S.documents.find(x => x.student_id === s.id && x.doc_type === 'photo' && x.file_path); if (d) try { photos[s.id] = await API.fileUrl(d.file_path); } catch { /* no photo */ } }));
  const st = S.settings;
  const card = (s) => `<div class="pair">
    <div class="card front"><div class="band"><span class="km">${KAMON}</span><div class="nm"><b>${esc(st.institute_en)}</b><span>${esc(st.institute_ja)}</span></div><span class="tag">STUDENT ID</span></div>
      <div class="body"><div class="ph">${photos[s.id] ? `<img src="${esc(photos[s.id])}" alt="">` : `<span>${esc(initials(s))}</span>`}</div>
      <div class="info"><div class="en">${esc(s.name_en || s.name_bn)}</div><div class="bn">${esc(s.name_bn || '')}</div>
      <dl><dt>ID No.</dt><dd><b>${esc(s.admission_no)}</b></dd><dt>Course</dt><dd>JLPT ${esc(s.package)} · ${esc(s.current_level)}</dd><dt>Batch</dt><dd>${s.batch === 'evening' ? 'Evening 6–8 PM' : 'Morning 10–12 AM'}</dd><dt>Valid till</dt><dd>${fmtD(cardValidTill(s))}</dd></dl></div></div>
      <div class="strip"></div></div>
    <div class="card back"><div class="bbody"><div class="qr">${qrSvg(profileLink(s))}<small>${esc(s.admission_no)}</small></div>
      <div class="btxt"><b style="font-family:'Noto Serif Bengali'">${esc(st.institute_bn)}</b>
      <p>এই কার্ড প্রতিষ্ঠানের সম্পত্তি। কার্ডটি পেলে নিচের নম্বরে জানান। ক্লাসে কার্ড সাথে রাখুন।</p>
      <p>অফিস: <b>${esc(st.phone)}</b><br>WhatsApp: ${esc(st.whatsapp)}${s.guardian_phone ? `<br>অভিভাবক: ${esc(s.guardian_phone)}` : ''}${st.address ? `<br>${esc(st.address)}` : ''}</p>
      <div class="sig"><span></span>Director · ${esc(st.director_en)}</div></div></div>
      <div class="bfoot">${esc(st.institute_ja)} · Japanese language · Study in Japan</div></div></div>`;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ID cards (${list.length})</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@700;800&family=Shippori+Mincho+B1:wght@500;700;800&display=swap">
  <style>${ID_CSS}</style></head>
  <body><button class="print" onclick="window.print()">প্রিন্ট / Print</button>
  <p class="help">প্রতি সারিতে বাঁ দিকে সামনের অংশ, ডান দিকে পেছনের অংশ। দাগ বরাবর কেটে মাঝখানে ভাঁজ করে ল্যামিনেট করুন। প্রিন্টের সময় Scale "100%" / "Actual size" রাখুন।</p>
  <div class="sheet">${list.map(card).join('')}</div></body></html>`);
  w.document.close();
  const imgs = [...w.document.images]; await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* user can press the button */ } }, 900);
}
// ------------------------------------------------------------------ parent page (secret link, no login)
const newParentToken = () => { const b = new Uint8Array(24); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const parentLink = (tok) => `${location.origin}${location.pathname}#/p/${tok}`;
function parentMsg(s, link) { return fillTpl(S.settings.wa_parent, { ...tplBase(), name: s.name_bn || s.name_en, link }); }




// ------------------------------------------------------------------ find a student by ID number or by scanning the QR code on the ID card
function findByCode(raw) {   // a scanned QR (portal profile link) or a typed admission number → the student
  const t = String(raw || '').trim(); if (!t) return null;
  const m = t.match(/#\/student\/([0-9a-z-]{8,})/i); if (m) return byId(S.students, m[1]) || null;
  const k = t.toUpperCase().replace(/\s+/g, ''); return S.students.find(x => (x.admission_no || '').toUpperCase() === k) || null;
}
let _scanStop = null;
function stopScan() { if (_scanStop) { try { _scanStop(); } catch { /* stopped */ } _scanStop = null; } }
let _jsqr = null;
function loadJsQr() { if (window.jsQR) return Promise.resolve(window.jsQR); if (_jsqr) return _jsqr;
  _jsqr = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; sc.onload = () => res(window.jsQR); sc.onerror = () => { _jsqr = null; rej(new Error('QR পড়ার ফাইল লোড হয়নি')); }; document.head.appendChild(sc); }); return _jsqr; }
function viewScan(q) {
  stopScan(); const term = (q.get('q') || '').trim();
  const hits = term ? S.students.filter(x => [x.admission_no, x.name_bn, x.name_en, x.phone, x.guardian_phone, x.passport_no, x.nid].some(v => String(v || '').toLowerCase().includes(term.toLowerCase()))).slice(0, 20) : [];
  mount('#/scan', `
  <div class="top"><div><h1>আইডি / QR দিয়ে খুঁজুন</h1><p>ছাত্রের আইডি কার্ড বা ছাত্রদের সাইটের "ডিজিটাল আইডি"-র QR কোড ক্যামেরায় ধরুন, অথবা আইডি নম্বর লিখুন — সাথে সাথে ছাত্রের পুরো তথ্য খুলবে। ফোনের সাধারণ ক্যামেরা দিয়ে QR স্ক্যান করলেও (লগইন থাকলে) সরাসরি এই পোর্টালে ছাত্রের পাতা খোলে।</p></div></div>
  <div class="grid g2">
    <div class="card"><h2>📷 QR স্ক্যান</h2><div id="scanbox" class="scanbox"><div class="empty" style="padding:30px 10px">ক্যামেরা বন্ধ</div></div>
      <div class="row" style="margin-top:10px;gap:8px"><button class="btn" id="scango">📷 ক্যামেরা চালু করুন</button><button class="btn ghost" id="scanoff" hidden>বন্ধ</button></div><div class="small muted" id="scanmsg" style="margin-top:6px"></div></div>
    <div class="card"><h2>⌨ আইডি নম্বর / নাম / ফোন</h2><form id="sf" class="row" style="gap:8px"><input name="q" value="${esc(term)}" placeholder="যেমন SJI-0012" autocomplete="off" style="flex:1;font-size:17px;letter-spacing:1px" autofocus><button class="btn">খুঁজুন</button></form>
      ${term ? (hits.length ? `<div class="tw" style="margin-top:12px"><table class="stack"><tr><th>আইডি</th><th>নাম</th><th>লেভেল</th><th>অবস্থা</th></tr>${hits.map(x => `<tr class="click" data-go="${x.id}"><td data-l="আইডি"><b>${esc(x.admission_no)}</b></td><td data-l="নাম">${esc(studentName(x))}</td><td data-l="লেভেল">${esc(x.current_level)} · ${esc(BATCH[x.batch] || '')}</td><td data-l="অবস্থা">${badge(x.status, STATUS[x.status])}</td></tr>`).join('')}</table></div>` : '<div class="empty">কাউকে পাওয়া যায়নি</div>') : '<p class="small muted" style="margin:10px 0 0">আইডি হুবহু মিললে সরাসরি ছাত্রের পাতা খুলবে।</p>'}</div></div>`, () => {
    $('#sf').onsubmit = (e) => { e.preventDefault(); const v = e.target.q.value.trim(); const one = findByCode(v); if (one) { location.hash = `#/student/${one.id}`; return; } location.hash = '#/scan?q=' + encodeURIComponent(v); };
    $$('[data-go]').forEach(r => r.onclick = () => { location.hash = '#/student/' + r.dataset.go; });
    const msg = (t) => { const m = $('#scanmsg'); if (m) m.textContent = t; };
    $('#scanoff').onclick = () => { stopScan(); $('#scanbox').innerHTML = '<div class="empty" style="padding:30px 10px">ক্যামেরা বন্ধ</div>'; $('#scanoff').hidden = true; $('#scango').hidden = false; msg(''); };
    $('#scango').onclick = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('এই ব্রাউজারে ক্যামেরা চালু করা যায় না — আইডি নম্বর লিখে খুঁজুন', true);
      let stream; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); } catch { return toast('ক্যামেরার অনুমতি পাওয়া যায়নি', true); }
      const box = $('#scanbox'); box.innerHTML = '<video playsinline muted autoplay></video><i class="scanframe"></i>'; const v = box.querySelector('video'); v.srcObject = stream;
      $('#scango').hidden = true; $('#scanoff').hidden = false; msg('QR কোডটা ফ্রেমের ভেতরে ধরুন…');
      let alive = true; _scanStop = () => { alive = false; stream.getTracks().forEach(t => t.stop()); };
      const det = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null; const jsQR = det ? null : await loadJsQr().catch(() => null);
      const c = document.createElement('canvas'); const g = c.getContext('2d', { willReadFrequently: true });
      const tick = async () => { if (!alive || !document.body.contains(v)) { stopScan(); return; }
        try { let text = null;
          if (v.readyState >= 2) {
            if (det) { const r = await det.detect(v); if (r.length) text = r[0].rawValue; }
            else if (jsQR) { c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0); const r = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'dontInvert' }); if (r) text = r.data; } }
          if (text) { const one = findByCode(text); if (one) { stopScan(); toast('পাওয়া গেছে: ' + studentName(one)); location.hash = `#/student/${one.id}`; return; } msg('এই QR কোনো ছাত্রের নয়: ' + text.slice(0, 60)); }
        } catch (e) { console.warn(e); }
        setTimeout(tick, 250); };
      tick();
    };
  });
}
addEventListener('hashchange', () => { if (!location.hash.startsWith('#/scan')) stopScan(); });

// ------------------------------------------------------------------ the student's complete file, to print or save as PDF
async function printDossier(s) {
  const st = S.settings; const a = attOf(s.id); const res = studentResults(s.id); const docs = new Map(S.documents.filter(d => d.student_id === s.id).map(d => [d.doc_type, d]));
  const apps = S.applications.filter(x => x.student_id === s.id); const pays = S.payments.filter(p => p.student_id === s.id).sort((x, y) => String(x.paid_on).localeCompare(String(y.paid_on)));
  const win = window.open('', '_blank'); if (!win) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
  win.document.write('<p style="font-family:sans-serif;padding:20px">ফাইল তৈরি হচ্ছে…</p>'); toast('ফাইল তৈরি হচ্ছে…');
  let photo = ''; const ph = docs.get('photo'); if (ph && ph.file_path && !/\.pdf$/i.test(ph.file_path)) { try { photo = await API.fileUrl(ph.file_path); } catch { /* no photo */ } }
  let qr = ''; try { await loadQR(); qr = qrSvg(profileLink(s)); } catch { /* printed without the QR */ }
  const row = (k, v) => `<tr><th>${k}</th><td>${v == null || v === '' ? '—' : v}</td></tr>`;
  const sec = (t) => `<h3 style="font:700 15px 'Noto Serif Bengali';color:#1B2945;margin:18px 0 6px;border-bottom:2px solid #A3843A;padding-bottom:3px">${t}</h3>`;
  const sch = (id) => byId(S.jp_schools, id) || {};
  printWindow('Student file ' + s.admission_no, `${headHtml()}
  <div style="padding:18px 22px">
  <div style="display:flex;gap:16px;align-items:flex-start">
    <div style="width:30mm;height:38mm;border:1px solid #D8CDB9;display:grid;place-items:center;overflow:hidden;flex:none;background:#F6F0E4">${photo ? `<img src="${esc(photo)}" style="width:100%;height:100%;object-fit:cover">` : '<span style="font-size:11px;color:#8A8170">ছবি নেই</span>'}</div>
    <div style="flex:1"><div style="font:800 22px 'Noto Serif Bengali'">${esc(s.name_bn || '')}</div><div style="font-size:16px;font-weight:600">${esc(s.name_en || '')}</div>
      <div style="margin-top:6px;font-size:13.5px">আইডি: <b style="font-size:16px;letter-spacing:1px">${esc(s.admission_no)}</b> · ${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')} · ${esc(STATUS[s.status] || '')}</div>
      <div style="font-size:12px;color:#6E665A;margin-top:4px">ছাত্রের সম্পূর্ণ ফাইল · তৈরি ${fmtD(todayISO())}</div></div>
    ${qr ? `<div style="width:26mm;text-align:center;flex:none"><div style="width:26mm;height:26mm">${qr}</div><div style="font-size:9px;color:#6E665A;margin-top:2px">স্ক্যান করলে পোর্টালে<br>সর্বশেষ তথ্য</div></div>` : ''}
  </div>
  ${sec('ব্যক্তিগত তথ্য')}<table>${row('জন্ম তারিখ', fmtD(s.dob))}${row('লিঙ্গ', { male: 'ছেলে', female: 'মেয়ে' }[s.gender])}${row('NID / জন্ম নিবন্ধন', esc(s.nid))}${row('পাসপোর্ট নম্বর', esc(s.passport_no))}${row('শিক্ষাগত যোগ্যতা', esc(s.education))}</table>
  ${sec('যোগাযোগ ও অভিভাবক')}<table>${row('মোবাইল', esc(s.phone))}${row('ইমেইল', esc(s.email))}${row('বর্তমান ঠিকানা', esc(s.address_present))}${row('স্থায়ী ঠিকানা', esc(s.address_permanent))}${row('অভিভাবক', esc([s.guardian_name, s.guardian_relation && `(${s.guardian_relation})`].filter(Boolean).join(' ')))}${row('অভিভাবকের মোবাইল', esc(s.guardian_phone))}</table>
  ${sec('কোর্স')}<table>${row('ভর্তির তারিখ', fmtD(s.admission_date))}${row('প্যাকেজ', esc(s.package))}${row('ক্লাস শুরু', fmtD(s.start_date))}${row('উপস্থিতি', a.total ? `${a.came}/${a.total} ক্লাস (${a.pct}%) · মোট ${a.hours} ঘণ্টা` : '—')}</table>
  ${isTeacher() ? '' : `${sec('ফি')}<table>${row('কোর্স ফি (ছাড়ের পর)', tk(netFee(s)))}${row('পরিশোধ', tk(paidOf(s.id)))}${row('বাকি', `<b>${tk(dueOf(s))}</b>`)}${num(s.processing_fee) ? row('জাপান প্রসেসিং ফি', `${tk(s.processing_fee)} · বাকি ${tk(procDueOf(s))}`) : ''}</table>
  ${pays.length ? `<table style="margin-top:6px;font-size:12px"><tr><th style="width:auto">তারিখ</th><th style="width:auto">রশিদ</th><th style="width:auto">খাত</th><th style="width:auto;text-align:right">টাকা</th></tr>${pays.map(p => `<tr><td>${fmtD(p.paid_on)}</td><td>${esc(p.receipt_no)}</td><td>${esc(PURPOSE[p.purpose] || p.purpose || '')}</td><td style="text-align:right">${tk(p.amount)}</td></tr>`).join('')}</table>` : ''}`}
  ${res.length ? `${sec('পরীক্ষার ফলাফল')}<table style="font-size:12.5px"><tr><th style="width:auto">তারিখ</th><th style="width:auto">পরীক্ষা</th><th style="width:auto;text-align:right">নম্বর</th></tr>${res.map(({ r, ex }) => `<tr><td>${fmtD(ex.exam_date)}</td><td>${esc(ex.title)} (${esc(ex.level)})</td><td style="text-align:right">${r.absent ? 'অনুপস্থিত' : `${num(r.marks)}/${num(ex.max_marks)}`}</td></tr>`).join('')}</table>` : ''}
  ${sec('জাপান')}<table>${row('ধাপ', esc((JSTAGES.find(x => x[0] === (s.japan_stage || 'none')) || [])[1]))}${row('লক্ষ্য স্কুল', esc(s.target_school))}${row('সেশন', esc(s.intake))}</table>
  ${apps.length ? `<table style="margin-top:6px;font-size:12.5px"><tr><th style="width:auto">স্কুল</th><th style="width:auto">সেশন</th><th style="width:auto">অবস্থা</th></tr>${apps.map(x => `<tr><td>${esc(sch(x.school_id).name_ja || sch(x.school_id).name_en || '')}</td><td>${esc(x.intake || '')}</td><td>${esc(APP_ST[x.status] || x.status || '')}</td></tr>`).join('')}</table>` : ''}
  ${isTeacher() ? '' : `${sec('কাগজপত্র')}<table style="font-size:12.5px"><tr><th style="width:auto">কাগজ</th><th style="width:auto">অবস্থা</th><th style="width:auto">তারিখ</th></tr>${DOC_TYPES.map(([k, l]) => { const d = docs.get(k) || {}; return `<tr><td>${esc(l)}</td><td>${d.status === 'verified' ? '✓ যাচাই হয়েছে' : d.status === 'received' ? 'জমা হয়েছে' : '— জমা হয়নি'}${d.file_path ? ' · ফাইল আছে' : ''}</td><td>${d.expires_on ? 'মেয়াদ ' + fmtD(d.expires_on) : d.issued_on ? fmtD(d.issued_on) : ''}</td></tr>`; }).join('')}</table>`}
  ${s.notes && !isTeacher() ? `${sec('নোট')}<p style="font-size:13px;white-space:pre-line">${esc(s.notes)}</p>` : ''}
  <p style="font-size:10.5px;color:#8A8170;margin-top:18px;border-top:1px solid #D8CDB9;padding-top:6px">এই ফাইলের সব তথ্য ${esc(st.institute_bn || '')}-এর পোর্টালে সুরক্ষিত আছে। কাগজ হারিয়ে গেলে পোর্টাল থেকে আবার প্রিন্ট করা যাবে। এটা গোপনীয় — অনুমতি ছাড়া কাউকে দেবেন না।</p>
  </div>`, win);
}

// ------------------------------------------------------------------ papers students scanned on the student site (v38)
function viewDocInbox(q) {
  const tab = q.get('t') === 'all' ? 'all' : 'new';
  const all = S.documents.filter(d => d.student_upload_at).sort((a, b) => String(b.student_upload_at).localeCompare(String(a.student_upload_at)));
  const fresh = all.filter(d => d.status === 'received'); const list = tab === 'new' ? fresh : all;
  const per = new Map(); for (const d of list) { if (!per.has(d.student_id)) per.set(d.student_id, []); per.get(d.student_id).push(d); }
  mount('#/docinbox', `
  <div class="top"><div><h1>ছাত্রদের পাঠানো কাগজ</h1><p>ছাত্ররা ছাত্রদের সাইটের "জাপান → আমার কাগজপত্র" থেকে ফোনে স্ক্যান করে কাগজ দেয়। দেখে ঠিক থাকলে ✓ যাচাই করুন, ঝাপসা বা ভুল হলে ↩ কারণ লিখে ফেরত দিন — ছাত্র সাইটে দেখে আবার দেবে। সব কাগজ ছাত্রের প্রোফাইলের "কাগজপত্র" ট্যাবেও থাকে।</p></div></div>
  <div class="tabs"><button data-dt2="new" class="${tab === 'new' ? 'on' : ''}">দেখা বাকি (${fresh.length})</button><button data-dt2="all" class="${tab === 'all' ? 'on' : ''}">ছাত্রদের দেওয়া সব (${all.length})</button></div>
  ${per.size ? [...per.entries()].map(([sid, ds]) => { const st = byId(S.students, sid) || {}; const tot = S.documents.filter(x => x.student_id === sid && x.status !== 'missing').length;
    return `<div class="card" style="margin-bottom:12px"><div class="row" style="margin-bottom:8px"><div><a href="#/student/${sid}?t=docs"><b>${esc(studentName(st))}</b></a> <span class="small muted">${esc(st.admission_no || '')} · ${tot}/${DOC_TYPES.length}টি কাগজ জমা</span></div><span class="spacer"></span><button class="btn sm ghost" data-zip="${sid}">⬇ সব কাগজ ZIP</button></div>
      <div class="tw"><table><tr><th>কাগজ</th><th>ছাত্র দিয়েছে</th><th>অবস্থা</th><th></th></tr>${ds.map(d => `<tr><td><b>${esc(docLabel(d.doc_type))}</b>${d.expires_on && d.doc_type === 'passport' ? `<div class="small muted">মেয়াদ ${fmtD(d.expires_on)}</div>` : ''}${d.issued_on ? `<div class="small muted">তারিখ ${fmtD(d.issued_on)}</div>` : ''}</td><td>${fmtDT(d.student_upload_at)}</td>
        <td>${badge(d.status === 'verified' ? 'active' : d.status === 'received' ? 'trial' : 'dropped', d.status === 'missing' && d.feedback ? 'ফেরত পাঠানো' : DOC_STATUS[d.status])}</td>
        <td><div class="row" style="gap:6px;justify-content:flex-end">${d.file_path ? `<button class="btn sm ghost" data-v2="${esc(d.file_path)}">👁 দেখুন</button>` : ''}${d.status === 'received' ? `<button class="btn sm" data-ok2="${d.id}">✓ যাচাই</button><button class="btn sm ghost" data-ret="${d.id}" style="color:var(--red)">↩ ফেরত</button>` : ''}</div></td></tr>`).join('')}</table></div></div>`; }).join('')
    : `<div class="card"><div class="empty">${tab === 'new' ? 'দেখার মতো নতুন কাগজ নেই 🎉' : 'এখনো কোনো ছাত্র নিজে কাগজ দেয়নি'}</div></div>`}`, () => {
    $$('[data-dt2]').forEach(b => b.onclick = () => { location.hash = '#/docinbox' + (b.dataset.dt2 === 'all' ? '?t=all' : ''); });
    $$('[data-v2]').forEach(b => b.onclick = async () => { const w = window.open('', '_blank'); try { const u = await API.fileUrl(b.dataset.v2); if (w) { w.opener = null; w.location = u; } } catch (e) { if (w) w.close(); toast(errMsg(e), true); } });
    $$('[data-ok2]').forEach(b => b.onclick = async () => { b.disabled = true; try { putLocal('documents', await API.update('documents', b.dataset.ok2, { status: 'verified', feedback: '', updated_at: new Date().toISOString() })); toast('যাচাই হয়েছে ✓'); render(); } catch (e) { b.disabled = false; toast(errMsg(e), true); } });
    $$('[data-ret]').forEach(b => b.onclick = () => docReturnModal(byId(S.documents, b.dataset.ret)));
    $$('[data-zip]').forEach(b => b.onclick = () => downloadDocsZip(byId(S.students, b.dataset.zip)));
  });
}
function docReturnModal(d) {
  if (!d) return; const st = byId(S.students, d.student_id) || {};
  openModal(`<h2>↩ ${esc(docLabel(d.doc_type))} ফেরত পাঠান</h2><p class="small muted" style="margin:0 0 8px">${esc(studentName(st))} ছাত্রদের সাইটে কারণটা দেখবে আর নতুন করে দেবে।</p>
    <div class="mchips" style="margin:0 0 8px;display:flex;flex-wrap:wrap;gap:6px">${['ছবি ঝাপসা — পরিষ্কার করে আবার তুলুন', 'সব পাতা নেই — বাকি পাতাগুলোও দিন', 'কাগজের কোণা কাটা পড়েছে', 'ভুল কাগজ দিয়েছেন', 'মেয়াদ শেষ / পুরোনো কাগজ — নতুনটা দিন'].map(t => `<button type="button" class="btn sm ghost" data-rs="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <form id="drf" class="form"><label class="f full">কারণ<textarea name="r" rows="3" maxlength="300" required></textarea></label><div class="full row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="drc">বাতিল</button><button class="btn">ফেরত পাঠান</button></div></form>`);
  $('#drc').onclick = closeModal; $$('[data-rs]').forEach(b => b.onclick = () => { $('#drf').r.value = b.dataset.rs; });
  $('#drf').onsubmit = async (e) => { e.preventDefault(); const r = e.target.r.value.trim(); if (!r) return;
    try { putLocal('documents', await API.update('documents', d.id, { status: 'missing', feedback: r, updated_at: new Date().toISOString() })); closeModal(); toast('ছাত্রকে জানানো হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); } };
}
let _jszip = null;
function loadJsZip() { if (window.JSZip) return Promise.resolve(window.JSZip); if (_jszip) return _jszip;
  _jszip = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; sc.onload = () => res(window.JSZip); sc.onerror = () => { _jszip = null; rej(new Error('ZIP বানানোর ফাইল লোড হয়নি')); }; document.head.appendChild(sc); }); return _jszip; }
async function downloadDocsZip(st) {
  if (!st) return; const ds = S.documents.filter(d => d.student_id === st.id && d.file_path); if (!ds.length) return toast('কোনো ফাইল নেই', true);
  toast(`${ds.length}টি ফাইল নামানো হচ্ছে…`);
  try {
    const JSZip = await loadJsZip(); const zip = new JSZip(); const order = DOC_TYPES.map(x => x[0]);
    for (const d of ds) { const u = await API.fileUrl(d.file_path); const r = await fetch(u); if (!r.ok) throw new Error(docLabel(d.doc_type) + ' নামানো যায়নি');
      const ext = (d.file_path.split('.').pop() || 'bin').toLowerCase(); const i = order.indexOf(d.doc_type) + 1;
      zip.file(`${String(i).padStart(2, '0')}-${docLabel(d.doc_type).replace(/[\\/:*?"<>|]/g, '-')}.${ext}`, await r.blob()); }
    const blob = await zip.generateAsync({ type: 'blob' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${st.admission_no || 'student'}-${(st.name_en || '').replace(/[^A-Za-z0-9]+/g, '-')}-documents.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('ZIP নামানো হয়েছে');
  } catch (e) { toast(errMsg(e), true); }
}

// ------------------------------------------------------------------ monthly class survey (v36) — shown without names
function viewFeedback(q) {
  const all = S.class_feedback || []; const months = [...new Set(all.map(f => f.period))].sort().reverse();
  const m = q.get('m') || months[0] || monthISO(); const list = all.filter(f => f.period === m).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const avg = (xs, k) => xs.length ? (xs.reduce((a, x) => a + num(x[k]), 0) / xs.length) : 0;
  const stars = (v) => v ? `${'★'.repeat(Math.round(v))}${'☆'.repeat(5 - Math.round(v))} <b>${v.toFixed(1)}</b>` : '—';
  const active = S.students.filter(s => s.status === 'active' || s.status === 'trial').length;
  const dist = (k, keys, labels) => keys.map((x, i) => { const n = list.filter(f => f[k] === x).length; return `<div class="row" style="gap:8px;margin:4px 0"><span style="width:110px" class="small">${labels[i]}</span><div class="bar" style="flex:1;height:10px"><span style="width:${list.length ? Math.round(100 * n / list.length) : 0}%;background:var(--navy)"></span></div><span class="small" style="width:40px;text-align:right">${n}</span></div>`; }).join('');
  const groups = [...new Set(list.map(f => f.level + '|' + f.batch))].sort().map(k => { const [lv, b] = k.split('|'); const xs = list.filter(f => f.level === lv && f.batch === b); return { lv, b, n: xs.length, o: avg(xs, 'overall'), e: avg(xs, 'explain'), fast: xs.filter(f => f.pace === 'fast').length, slow: xs.filter(f => f.pace === 'slow').length }; });
  const texts = list.filter(f => f.liked || f.improve);
  mount('#/feedback', `
  <div class="top"><div><h1>ছাত্রদের মতামত</h1><p>প্রতি মাসে ছাত্ররা ছাত্রদের সাইট থেকে ক্লাস নিয়ে ছোট একটা জরিপ দেয়। নাম দেখানো হয় না, আর শিক্ষকরা এই পাতা দেখতে পান না — তাই ছাত্ররা খোলাখুলি লিখতে পারে।</p></div>
    <div class="row"><select id="fbm">${(months.includes(m) ? months : [m, ...months]).map(x => `<option value="${x}" ${x === m ? 'selected' : ''}>${monthLabel(x)}</option>`).join('')}</select></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">মতামত দিয়েছে</div><div class="v">${list.length}</div><div class="s">চলমান ${active} জনের মধ্যে</div></div>
    <div class="card stat ${avg(list, 'overall') && avg(list, 'overall') < 3.5 ? 'red' : 'green'}"><div class="l">ক্লাস কেমন (গড়)</div><div class="v" style="font-size:20px;color:#C9962B">${stars(avg(list, 'overall'))}</div></div>
    <div class="card stat"><div class="l">বোঝানো কেমন (গড়)</div><div class="v" style="font-size:20px;color:#C9962B">${stars(avg(list, 'explain'))}</div></div>
    <div class="card stat"><div class="l">খুব দ্রুত মনে করে</div><div class="v">${list.filter(f => f.pace === 'fast').length}</div><div class="s">ধীর মনে করে ${list.filter(f => f.pace === 'slow').length} জন</div></div>
  </div>
  ${list.length ? `<div class="grid g2">
    <div class="card"><h2>পড়ানোর গতি</h2>${dist('pace', ['slow', 'ok', 'fast'], ['খুব ধীর', 'ঠিক আছে', 'খুব দ্রুত'])}<h2 style="margin-top:14px">বাড়ির কাজ</h2>${dist('homework', ['less', 'ok', 'more'], ['আরও দরকার', 'ঠিক আছে', 'বেশি হয়ে যায়'])}</div>
    <div class="card"><h2>ব্যাচ অনুযায়ী</h2><div class="tw"><table><tr><th>ব্যাচ</th><th>জন</th><th>ক্লাস</th><th>বোঝানো</th><th>গতি</th></tr>${groups.map(g => `<tr><td><b>${esc(g.lv)}</b> · ${esc(BATCH[g.b] || g.b)}</td><td>${g.n}</td><td>${g.o.toFixed(1)}★</td><td>${g.e.toFixed(1)}★</td><td class="small">${g.fast ? g.fast + ' দ্রুত ' : ''}${g.slow ? g.slow + ' ধীর' : ''}${!g.fast && !g.slow ? 'ঠিক আছে' : ''}</td></tr>`).join('')}</table></div>${groups.some(g => g.n < 3) ? '<p class="small muted" style="margin:6px 0 0">৩ জনের কম হলে গড় দেখে সিদ্ধান্ত নেবেন না।</p>' : ''}</div></div>
  <h2 style="margin-top:18px">ছাত্রদের কথা (${texts.length})</h2>${texts.length ? texts.map(f => `<div class="card" style="margin-bottom:8px"><div class="small muted">${esc(f.level)} · ${esc(BATCH[f.batch] || f.batch)} · ${'★'.repeat(f.overall)}</div>${f.liked ? `<div style="margin-top:4px">👍 ${esc(f.liked)}</div>` : ''}${f.improve ? `<div style="margin-top:4px">💡 ${esc(f.improve)}</div>` : ''}</div>`).join('') : '<div class="card"><div class="empty">কেউ কিছু লেখেনি</div></div>'}`
    : `<div class="card"><div class="empty">${monthLabel(m)}-এ এখনো কেউ মতামত দেয়নি। মাসের ১৫ তারিখ থেকে ছাত্রদের সাইটে জরিপটা দেখায়।</div></div>`}`, () => {
    $('#fbm').onchange = (e) => { location.hash = '#/feedback?m=' + e.target.value; };
  });
}

// ------------------------------------------------------------------ payment proofs from the student site (v35)
const PROOF_ST = { pending: ['due', 'যাচাই বাকি'], approved: ['active', 'রশিদ হয়েছে'], rejected: ['dropped', 'মেলেনি'] };
function viewProofs(q) {
  const tab = q.get('t') === 'done' ? 'done' : 'open';
  const all = (S.pay_proofs || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const open = all.filter(x => x.status === 'pending'), done = all.filter(x => x.status !== 'pending');
  const list = tab === 'open' ? open.slice().reverse() : done;
  const st = S.settings;
  mount('#/proofs', `
  <div class="top"><div><h1>অনলাইন পেমেন্ট যাচাই</h1><p>ছাত্ররা বিকাশ/নগদ/ব্যাংকে টাকা পাঠিয়ে ছাত্রদের সাইট থেকে TrxID আর স্ক্রিনশট দেয়। নিজের বিকাশ/নগদ স্টেটমেন্টে মিলিয়ে তারপর রশিদ করুন — রশিদ না করা পর্যন্ত ছাত্রের বকেয়া কমে না।</p></div></div>
  ${!st.pay_bkash && !st.pay_nagad && !st.pay_bank ? `<div class="card" style="border-left:4px solid var(--red);margin-bottom:12px">ছাত্ররা কোন নম্বরে টাকা পাঠাবে, সেটা এখনো দেওয়া নেই। <a href="#/settings">সেটিংসে</a> বিকাশ/নগদ নম্বর বসান।</div>` : ''}
  <div class="tabs"><button data-pt="open" class="${tab === 'open' ? 'on' : ''}">যাচাই বাকি (${open.length})</button><button data-pt="done" class="${tab === 'done' ? 'on' : ''}">শেষ (${done.length})</button></div>
  ${list.length ? `<div class="tw"><table class="stack"><tr><th>পাঠিয়েছে</th><th>ছাত্র</th><th>মাধ্যম</th><th class="num">টাকা</th><th>TrxID</th><th>অবস্থা</th></tr>${list.map(x => { const s = byId(S.students, x.student_id) || {};
    return `<tr class="click" data-pp="${x.id}"><td data-l="পাঠিয়েছে">${fmtD(x.paid_on)}<div class="small muted">জানিয়েছে ${fmtDT(x.created_at)}</div></td><td data-l="ছাত্র"><b>${esc(studentName(s))}</b><div class="small muted">${esc(s.admission_no || '')} · বকেয়া ${tk(s.id ? dueOf(s) : 0)}</div></td>
      <td data-l="মাধ্যম">${esc(METHOD[x.method] || x.method)}${x.sender ? `<div class="small muted">${esc(x.sender)} থেকে</div>` : ''}</td><td data-l="টাকা" class="num"><b>${tk(x.amount)}</b></td><td data-l="TrxID"><code>${esc(x.trx_id || '—')}</code>${x.file_path ? ' 📎' : ''}</td><td data-l="অবস্থা">${badge(...PROOF_ST[x.status])}</td></tr>`; }).join('')}</table></div>`
    : `<div class="card"><div class="empty">${tab === 'open' ? 'যাচাই করার মতো কিছু নেই 🎉' : 'এখনো কিছু নেই'}</div></div>`}`, () => {
    $$('[data-pt]').forEach(b => b.onclick = () => { location.hash = '#/proofs' + (b.dataset.pt === 'done' ? '?t=done' : ''); });
    $$('[data-pp]').forEach(c => c.onclick = () => proofModal(byId(S.pay_proofs, c.dataset.pp)));
  });
}
function proofModal(x) {
  const s = byId(S.students, x.student_id) || {}; const pay = x.payment_id ? byId(S.payments, x.payment_id) : null;
  const sameTrx = x.trx_id ? S.payments.filter(p => (p.trx_id || '').trim().toUpperCase() === x.trx_id.toUpperCase()) : [];
  openModal(`<h2>${esc(METHOD[x.method] || x.method)}-এ ${tk(x.amount)}</h2>
    <p style="margin:0 0 8px"><b>${esc(studentName(s))}</b> <span class="small muted">${esc(s.admission_no || '')} · এখন বকেয়া ${tk(s.id ? dueOf(s) : 0)}</span></p>
    <div class="tw"><table><tr><td>TrxID</td><td><code style="font-size:15px">${esc(x.trx_id || '—')}</code></td></tr><tr><td>যে নম্বর থেকে</td><td>${esc(x.sender || '—')}</td></tr><tr><td>পাঠানোর তারিখ</td><td>${fmtD(x.paid_on)}</td></tr>${x.note ? `<tr><td>ছাত্রের নোট</td><td>${esc(x.note)}</td></tr>` : ''}</table></div>
    ${sameTrx.length ? `<p class="small" style="color:var(--red)">⚠ এই TrxID দিয়ে আগেই রশিদ আছে: ${sameTrx.map(p => esc(p.receipt_no)).join(', ')}</p>` : ''}
    <div id="ppimg" style="margin:10px 0">${x.file_path ? '<div class="small muted">স্ক্রিনশট লোড হচ্ছে…</div>' : '<div class="small muted">স্ক্রিনশট দেয়নি</div>'}</div>
    ${x.status === 'pending' ? `<p class="small muted" style="margin:0 0 8px">আগে নিজের ${esc(METHOD[x.method] || '')} অ্যাপে/স্টেটমেন্টে TrxID আর টাকা মিলিয়ে দেখুন।</p>
      <label class="f full">ছাত্রকে বার্তা (মেলেনি হলে কারণ লিখুন)<textarea id="pprep" rows="2" maxlength="500" placeholder="যেমন: এই TrxID পাওয়া যায়নি, অফিসে যোগাযোগ করুন">${esc(x.reply || '')}</textarea></label>
      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn ghost" id="ppno" style="color:var(--red);margin-right:auto">✕ মেলেনি</button><button class="btn ghost" id="ppc">পরে</button><button class="btn gold" id="ppok">✓ মিলেছে — রশিদ করুন</button></div>`
    : `<p>${badge(...PROOF_ST[x.status])} ${x.checked_by ? `<span class="small muted">${esc(x.checked_by)} · ${fmtDT(x.checked_at)}</span>` : ''}</p>${pay ? `<p>রশিদ: <b>${esc(pay.receipt_no)}</b> <button class="btn sm ghost" id="pprc">রশিদ দেখুন</button></p>` : ''}${x.reply ? `<p class="small">বার্তা: ${esc(x.reply)}</p>` : ''}
      <div class="row" style="justify-content:flex-end;gap:8px">${isAdmin() ? '<button class="btn ghost" id="ppdel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button class="btn" id="ppc">বন্ধ</button></div>`}`);
  $('#ppc').onclick = closeModal;
  if (x.file_path) API.fileUrlFrom('payproof', x.file_path).then(u => { const b = $('#ppimg'); if (!b) return; b.innerHTML = /\.pdf$/i.test(x.file_path) ? `<a class="btn sm ghost" href="${esc(u)}" target="_blank" rel="noopener">📎 PDF খুলুন</a>` : `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="স্ক্রিনশট" style="max-width:100%;max-height:420px;border-radius:8px;border:1px solid var(--line)"></a>`; }).catch(e => { const b = $('#ppimg'); if (b) b.innerHTML = `<div class="small" style="color:var(--red)">${esc(errMsg(e))}</div>`; });
  const rc = $('#pprc'); if (rc) rc.onclick = () => printReceipt(pay);
  const ok = $('#ppok'); if (ok) ok.onclick = () => { const reply = ($('#pprep') || {}).value || ''; closeModal();
    paymentModal(x.student_id, { amount: x.amount, paid_on: x.paid_on, method: x.method, trx_id: x.trx_id, note: 'ছাত্রদের সাইট থেকে পাঠানো প্রমাণ' + (x.sender ? ' · ' + x.sender : '') },
      async (row) => putLocal('pay_proofs', await API.update('pay_proofs', x.id, { status: 'approved', payment_id: row.id, reply: reply.trim(), checked_by: S.profile.name || '', checked_at: new Date().toISOString() }))); };
  const no = $('#ppno'); if (no) no.onclick = async () => { const reply = $('#pprep').value.trim(); if (!reply) return toast('ছাত্রকে কারণটা লিখুন', true);
    try { putLocal('pay_proofs', await API.update('pay_proofs', x.id, { status: 'rejected', reply, checked_by: S.profile.name || '', checked_at: new Date().toISOString() })); closeModal(); toast('ছাত্রকে জানানো হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } };
  const del = $('#ppdel'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('এই প্রমাণটা মুছে যাবে (রশিদ থাকবে)।'))) return; try { await API.remove('pay_proofs', x.id); if (x.file_path) API.removeFile('payproof', x.file_path).catch(() => {}); S.pay_proofs = S.pay_proofs.filter(z => z.id !== x.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); } };
}

// ------------------------------------------------------------------ certificate requests from the student site (v34)
const REQ_KIND = { hours: 'স্টাডি-আওয়ার সার্টিফিকেট', transcript: 'পরীক্ষার ফলাফল (ট্রান্সক্রিপ্ট)', idcard: 'আইডি কার্ড', other: 'অন্য কাগজ / চিঠি' };
const REQ_ST = { pending: ['due', 'অপেক্ষায়'], ready: ['active', 'তৈরি — নিতে আসবে'], delivered: ['completed', 'দেওয়া হয়েছে'], rejected: ['dropped', 'দেওয়া যাবে না'] };
function viewRequests(q) {
  const tab = q.get('t') === 'done' ? 'done' : 'open';
  const all = (S.doc_requests || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const open = all.filter(x => x.status === 'pending' || x.status === 'ready'), done = all.filter(x => x.status === 'delivered' || x.status === 'rejected');
  const list = tab === 'open' ? open.slice().reverse() : done;
  mount('#/requests', `
  <div class="top"><div><h1>সার্টিফিকেটের আবেদন</h1><p>ছাত্ররা ছাত্রদের সাইট থেকে সার্টিফিকেট, ফলাফল বা আইডি কার্ড চায়। প্রিন্ট করে "তৈরি" করলে ছাত্র সাইটে দেখে, নিয়ে গেলে "দেওয়া হয়েছে" করুন।</p></div></div>
  <div class="tabs"><button data-rt="open" class="${tab === 'open' ? 'on' : ''}">চলমান (${open.length})</button><button data-rt="done" class="${tab === 'done' ? 'on' : ''}">শেষ (${done.length})</button></div>
  ${list.length ? `<div class="tw"><table class="stack"><tr><th>তারিখ</th><th>ছাত্র</th><th>কী চায়</th><th>কেন</th><th>অবস্থা</th></tr>${list.map(x => { const s = byId(S.students, x.student_id) || {};
    return `<tr class="click" data-rq="${x.id}"><td data-l="তারিখ">${fmtDT(x.created_at)}</td><td data-l="ছাত্র"><b>${esc(studentName(s))}</b><div class="small muted">${esc(s.admission_no || '')}</div></td>
      <td data-l="কী চায়">${esc(REQ_KIND[x.kind] || x.kind)}${x.note ? `<div class="small muted" style="white-space:pre-line">${esc(x.note)}</div>` : ''}</td><td data-l="কেন">${esc(x.purpose || '—')}</td><td data-l="অবস্থা">${badge(...REQ_ST[x.status])}</td></tr>`; }).join('')}</table></div>`
    : `<div class="card"><div class="empty">${tab === 'open' ? 'এখন কোনো আবেদন অপেক্ষায় নেই 🎉' : 'এখনো কিছু নেই'}</div></div>`}`, () => {
    $$('[data-rt]').forEach(b => b.onclick = () => { location.hash = '#/requests' + (b.dataset.rt === 'done' ? '?t=done' : ''); });
    $$('[data-rq]').forEach(c => c.onclick = () => requestModal(byId(S.doc_requests, c.dataset.rq)));
  });
}
function requestModal(x) {
  const s = byId(S.students, x.student_id) || {}; const due = s.id ? dueOf(s) : 0;
  const printBtn = { hours: ['স্টাডি-আওয়ার সার্টিফিকেট প্রিন্ট', () => printCertificate(s)], transcript: ['ট্রান্সক্রিপ্ট প্রিন্ট', () => printTranscript(s)], idcard: isAdmin() ? ['আইডি কার্ড প্রিন্ট', () => printIdCards([s])] : null }[x.kind];
  openModal(`<h2>${esc(REQ_KIND[x.kind] || x.kind)}</h2>
    <p style="margin:0 0 6px"><a href="#/student/${esc(s.id || '')}" id="rqst"><b>${esc(studentName(s))}</b></a> <span class="small muted">${esc(s.admission_no || '')} · আবেদন ${fmtDT(x.created_at)}</span></p>
    ${x.purpose ? `<p class="small" style="margin:0 0 4px">কেন দরকার: <b>${esc(x.purpose)}</b></p>` : ''}${x.note ? `<div class="card" style="white-space:pre-line;background:var(--soft);margin-bottom:8px">${esc(x.note)}</div>` : ''}
    ${due > 0 ? `<p class="small" style="color:var(--red);margin:0 0 8px">⚠ এই ছাত্রের ফি বাকি ${tk(due)}</p>` : ''}
    ${printBtn ? `<button class="btn gold" id="rqp" style="margin-bottom:10px">🖨 ${printBtn[0]}</button>` : ''}
    <form id="rqf" class="form"><label class="f">অবস্থা<select name="status">${Object.entries(REQ_ST).map(([k, v]) => `<option value="${k}" ${x.status === k ? 'selected' : ''}>${v[1]}</option>`).join('')}</select></label>
    <label class="f full">ছাত্রকে বার্তা (সাইটে দেখবে)<textarea name="reply" rows="3" maxlength="600" placeholder="যেমন: কাল বিকেলে অফিস থেকে নিয়ে যান / আগে বাকি ফি পরিশোধ করুন">${esc(x.reply || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end">${isAdmin() ? '<button type="button" class="btn ghost" id="rqd" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="rqc">বাতিল</button><button class="btn" type="submit">সংরক্ষণ</button></div></form>`);
  $('#rqc').onclick = closeModal; const st = $('#rqst'); if (st) st.onclick = closeModal;
  const pb = $('#rqp'); if (pb) pb.onclick = () => { printBtn[1](); const f = $('#rqf'); if (f.status.value === 'pending') f.status.value = 'ready'; };
  $('#rqf').onsubmit = async (e) => { e.preventDefault(); const f = e.target; const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const d = { status: f.status.value, reply: f.reply.value.trim() }; if (d.status !== x.status) Object.assign(d, { done_by: S.profile.name || '', done_at: d.status === 'pending' ? null : new Date().toISOString() });
    try { putLocal('doc_requests', await API.update('doc_requests', x.id, d)); closeModal(); toast('সংরক্ষণ হয়েছে'); render(); } catch (err) { btn.disabled = false; toast(errMsg(err), true); } };
  const del = $('#rqd'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('আবেদনটা মুছে যাবে।'))) return; try { await API.remove('doc_requests', x.id); S.doc_requests = S.doc_requests.filter(z => z.id !== x.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); } };
}

// ------------------------------------------------------------------ students' questions (v31)
function viewQuestions(q) {
  const tab = q.get('t') === 'done' ? 'done' : 'open';
  const all = (S.student_questions || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const open = all.filter(x => x.status === 'open'), done = all.filter(x => x.status === 'answered');
  const list = tab === 'open' ? open.slice().reverse() : done;
  const card = (x) => { const s = byId(S.students, x.student_id) || {};
    return `<div class="card click notice ${x.status === 'open' ? '' : 'off'}" data-qa="${x.id}" style="${x.status === 'open' ? 'border-left-color:var(--red)' : ''}"><div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start">
      <div style="min-width:0"><b>${esc(studentName(s))}</b> <span class="small muted">${esc(s.admission_no || '')} · ${esc(x.level)}${x.topic ? ' · ' + esc(x.topic) : ''} · ${fmtDT(x.created_at)}</span></div>
      ${x.status === 'open' ? badge('due', 'উত্তর বাকি') : x.shared ? badge('active', 'সবাই দেখে') : badge('completed', 'উত্তর দেওয়া হয়েছে')}</div>
      <div style="white-space:pre-line;margin-top:6px;line-height:1.7">${esc(x.body)}</div>
      ${x.answer ? `<div class="small" style="white-space:pre-line;margin-top:8px;background:var(--soft);border-radius:8px;padding:8px 10px"><b>উত্তর${x.answered_by ? ' (' + esc(x.answered_by) + ')' : ''}:</b> ${esc(x.answer)}</div>` : ''}</div>`; };
  mount('#/questions', `
  <div class="top"><div><h1>ছাত্রদের প্রশ্ন</h1><p>ছাত্ররা ছাত্রদের সাইট থেকে যা জিজ্ঞেস করে। উত্তর দিলে ছাত্র সাথে সাথে দেখে; চাইলে উত্তরটা ওই লেভেলের সবাইকে দেখানো যায় (প্রশ্নকারীর নাম ছাড়া)।</p></div></div>
  <div class="tabs"><button data-qt="open" class="${tab === 'open' ? 'on' : ''}">উত্তর বাকি (${open.length})</button><button data-qt="done" class="${tab === 'done' ? 'on' : ''}">উত্তর দেওয়া (${done.length})</button></div>
  ${list.length ? list.map(card).join('') : `<div class="card"><div class="empty">${tab === 'open' ? 'এখন কোনো প্রশ্নের উত্তর বাকি নেই 🎉' : 'এখনো কোনো উত্তর দেওয়া হয়নি'}</div></div>`}`, () => {
    $$('[data-qt]').forEach(b => b.onclick = () => { location.hash = '#/questions' + (b.dataset.qt === 'done' ? '?t=done' : ''); });
    $$('[data-qa]').forEach(c => c.onclick = () => answerModal(byId(S.student_questions, c.dataset.qa)));
  });
}
function answerModal(x) {
  const s = byId(S.students, x.student_id) || {};
  openModal(`<h2>${esc(studentName(s))}-এর প্রশ্ন</h2>
    <p class="small muted" style="margin:0 0 6px">${esc(x.level)}${x.topic ? ' · ' + esc(x.topic) : ''} · ${fmtDT(x.created_at)}</p>
    <div class="card" style="white-space:pre-line;background:var(--soft);margin-bottom:10px">${esc(x.body)}</div>
    <form id="af2" class="form"><label class="f full">উত্তর<textarea name="answer" rows="6" maxlength="3000" required placeholder="সহজ বাংলায় ব্যাখ্যা করুন, দরকার হলে উদাহরণ দিন…">${esc(x.answer || '')}</textarea></label>
    <label class="f full" style="flex-direction:row;align-items:center;gap:8px"><input name="shared" type="checkbox" ${x.shared ? 'checked' : ''} style="width:auto"> এই প্রশ্ন-উত্তর ${esc(x.level)}-এর সব ছাত্রকে দেখান (নাম ছাড়া)</label>
    <div class="full row" style="justify-content:flex-end">${isAdmin() ? '<button type="button" class="btn ghost" id="aqdel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="aqc">বাতিল</button><button class="btn" type="submit">উত্তর পাঠান</button></div></form>`);
  const f = $('#af2'); $('#aqc').onclick = closeModal;
  f.onsubmit = async (e) => { e.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try { putLocal('student_questions', await API.update('student_questions', x.id, { answer: f.answer.value.trim(), shared: f.shared.checked, status: 'answered', answered_by: S.profile.name || '', answered_at: new Date().toISOString() })); closeModal(); toast('উত্তর পাঠানো হয়েছে'); render(); }
    catch (err) { btn.disabled = false; toast(errMsg(err), true); } };
  const del = $('#aqdel'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('প্রশ্নটা মুছে যাবে।'))) return; try { await API.remove('student_questions', x.id); S.student_questions = S.student_questions.filter(z => z.id !== x.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); } };
}

// ------------------------------------------------------------------ homework (v30)
const HW_BUCKET = 'homework';
const HW_ST = { submitted: ['জমা দিয়েছে — দেখা বাকি', 'trial'], checked: ['দেখা হয়েছে', 'active'], redo: ['আবার করতে বলা হয়েছে', 'due'] };
const hwSubs = (id) => (S.homework_submissions || []).filter(x => x.homework_id === id);
const hwExpected = (h) => S.students.filter(s => (s.status === 'active' || s.status === 'trial') && (h.level === 'all' || studentLevels(s).includes(h.level)) && (h.batch === 'all' || s.batch === h.batch));
function viewHomeworkList() {
  const list = (S.homework || []).slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const toCheck = (S.homework_submissions || []).filter(x => x.status === 'submitted').length;
  mount('#/homework', `
  <div class="top"><div><h1>বাড়ির কাজ</h1><p>এখানে কাজ দিলে ছাত্ররা ছাত্রদের সাইটে দেখে, খাতার ছবি তুলে জমা দেয়; আপনি নম্বর আর মন্তব্য দেন।</p></div>
    <div class="row"><button class="btn" id="hwadd">+ নতুন বাড়ির কাজ</button></div></div>
  ${toCheck ? `<div class="alertbar" style="margin-bottom:16px"><b>${toCheck}টি জমা দেখা বাকি</b><span>কাজ খুলে ছাত্রের নামে চাপ দিন।</span></div>` : ''}
  <div class="tw">${list.length ? `<table class="stack"><tr><th>কাজ</th><th>কারা</th><th>শেষ তারিখ</th><th class="num">জমা</th><th class="num">দেখা বাকি</th><th>অবস্থা</th></tr>${list.map(h => { const subs = hwSubs(h.id); const exp = hwExpected(h).length; const due = subs.filter(x => x.status === 'submitted').length;
    return `<tr class="click" data-go="#/homework/${h.id}"><td data-l="কাজ"><b>${esc(h.title)}</b><div class="small muted">${fmtD(String(h.created_at || '').slice(0, 10))}${h.author ? ' · ' + esc(h.author) : ''}</div></td><td data-l="কারা">${esc(NOTICE_LV[h.level] || h.level)} · ${esc(NOTICE_BATCH[h.batch] || h.batch)}</td><td data-l="শেষ তারিখ">${h.due_on ? fmtD(h.due_on) : '—'}${h.due_on && h.due_on < todayISO() ? ' <span class="small muted">(পেরিয়ে গেছে)</span>' : ''}</td>
      <td class="num" data-l="জমা">${subs.length}/${exp}</td><td class="num" data-l="দেখা বাকি">${due ? `<b style="color:var(--red)">${due}</b>` : '0'}</td><td data-l="অবস্থা">${h.published === false ? badge('dropped', 'লুকানো') : badge('active', 'ছাত্ররা দেখে')}</td></tr>`; }).join('')}</table>` : '<div class="empty">এখনো কোনো বাড়ির কাজ দেওয়া হয়নি। "+ নতুন বাড়ির কাজ" দিয়ে শুরু করুন।</div>'}</div>`, () => {
    bindGo(); $('#hwadd').onclick = () => homeworkModal(null);
  });
}
function homeworkModal(h) {
  const v = h || { level: 'all', batch: 'all', published: true };
  openModal(`<h2>${h ? 'বাড়ির কাজ বদলান' : 'নতুন বাড়ির কাজ'}</h2>
  <form id="hwf" class="form">
    <label class="f full">শিরোনাম<input name="title" required maxlength="120" value="${esc(v.title || '')}" placeholder="যেমন: পাঠ ৩ — অনুশীলনের ১–১০ নম্বর লিখে আনো"></label>
    <label class="f full">কী করতে হবে<textarea name="body" rows="5" maxlength="3000" placeholder="বিস্তারিত নির্দেশনা…">${esc(v.body || '')}</textarea></label>
    <label class="f">লেভেল<select name="level">${Object.entries(NOTICE_LV).map(([k, l]) => `<option value="${k}" ${v.level === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="f">ব্যাচ<select name="batch">${Object.entries(NOTICE_BATCH).map(([k, l]) => `<option value="${k}" ${v.batch === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="f">জমার শেষ তারিখ<input name="due_on" type="date" value="${esc(v.due_on || '')}"></label>
    <label class="f">পূর্ণ নম্বর (খালি = নম্বর ছাড়া)<input name="max_marks" type="number" min="1" max="1000" value="${esc(v.max_marks || '')}"></label>
    <label class="f full" style="flex-direction:row;align-items:center;gap:8px"><input name="published" type="checkbox" ${v.published === false ? '' : 'checked'} style="width:auto"> ছাত্ররা দেখতে পাবে</label>
    <div class="full row" style="justify-content:flex-end">${h ? '<button type="button" class="btn ghost" id="hwdel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="hwc">বাতিল</button><button class="btn" type="submit">${h ? 'সংরক্ষণ' : 'কাজ দিন'}</button></div>
  </form>`);
  const f = $('#hwf'); $('#hwc').onclick = closeModal;
  f.onsubmit = async (e) => {
    e.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const d = { title: f.title.value.trim(), body: f.body.value.trim(), level: f.level.value, batch: f.batch.value, due_on: f.due_on.value || null, max_marks: f.max_marks.value ? Math.max(1, Math.round(num(f.max_marks.value))) : null, published: f.published.checked };
    if (!h) d.author = S.profile.name || '';
    try { const row = h ? await API.update('homework', h.id, d) : await API.insert('homework', d); putLocal('homework', row); closeModal(); toast(h ? 'সংরক্ষণ হয়েছে' : 'বাড়ির কাজ দেওয়া হয়েছে'); location.hash = '#/homework/' + row.id; render(); }
    catch (err) { btn.disabled = false; toast(errMsg(err), true); }
  };
  const del = $('#hwdel'); if (del) del.onclick = async () => {
    const n = hwSubs(h.id).length; closeModal();
    if (!(await confirmBox(`"${h.title}" মুছে যাবে${n ? `, সাথে ছাত্রদের ${n}টি জমা দেওয়া কাজও` : ''}।`))) return;
    try { for (const x of hwSubs(h.id)) for (const fl of (x.files || [])) API.removeFile(HW_BUCKET, fl.path).catch(() => {});
      await API.remove('homework', h.id); S.homework = S.homework.filter(x => x.id !== h.id); S.homework_submissions = (S.homework_submissions || []).filter(x => x.homework_id !== h.id); toast('মুছে ফেলা হয়েছে'); location.hash = '#/homework'; }
    catch (err) { toast(errMsg(err), true); }
  };
}
function viewHomework(id) {
  const h = byId(S.homework || [], id); if (!h) return mount('#/homework', '<div class="empty">কাজটি পাওয়া যায়নি</div>');
  const subs = hwSubs(h.id); const exp = hwExpected(h); const ids = new Set(exp.map(s => s.id)); subs.forEach(x => { if (!ids.has(x.student_id)) { const s = byId(S.students, x.student_id); if (s) exp.push(s); } });
  const rows = exp.map(s => ({ s, x: subs.find(z => z.student_id === s.id) })).sort((a, b) => (a.x ? (a.x.status === 'submitted' ? 0 : 1) : 2) - (b.x ? (b.x.status === 'submitted' ? 0 : 1) : 2) || studentName(a.s).localeCompare(studentName(b.s)));
  mount('#/homework', `
  <div class="top"><div><h1>${esc(h.title)}</h1><p>${esc(NOTICE_LV[h.level] || h.level)} · ${esc(NOTICE_BATCH[h.batch] || h.batch)}${h.due_on ? ' · শেষ তারিখ ' + fmtD(h.due_on) : ''}${h.max_marks ? ' · পূর্ণ নম্বর ' + h.max_marks : ''}</p></div>
    <div class="row"><a class="btn ghost" href="#/homework">‹ সব বাড়ির কাজ</a><button class="btn ghost" id="hwedit">বদলান</button></div></div>
  ${h.body ? `<div class="card" style="white-space:pre-line;line-height:1.7;margin-bottom:14px">${esc(h.body)}</div>` : ''}
  <div class="grid g4" style="margin-bottom:14px"><div class="card stat"><div class="l">মোট ছাত্র</div><div class="v">${exp.length}</div></div><div class="card stat"><div class="l">জমা দিয়েছে</div><div class="v">${subs.length}</div></div>
    <div class="card stat ${subs.filter(x => x.status === 'submitted').length ? 'red' : ''}"><div class="l">দেখা বাকি</div><div class="v">${subs.filter(x => x.status === 'submitted').length}</div></div><div class="card stat"><div class="l">জমা দেয়নি</div><div class="v">${exp.length - subs.length}</div></div></div>
  <div class="tw"><table class="stack"><tr><th>ছাত্র</th><th>অবস্থা</th><th>জমার সময়</th><th class="num">নম্বর</th><th></th></tr>${rows.map(({ s, x }) => `<tr ${x ? `class="click" data-hs="${x.id}"` : ''}><td data-l="ছাত্র">${esc(studentName(s))}<div class="small muted">${esc(s.admission_no || '')}</div></td>
    <td data-l="অবস্থা">${x ? badge(HW_ST[x.status][1], HW_ST[x.status][0]) : badge('dropped', 'জমা দেয়নি')}</td><td data-l="জমার সময়">${x ? fmtDT(x.submitted_at) + (h.due_on && String(x.submitted_at).slice(0, 10) > h.due_on ? ' <span class="small" style="color:var(--red)">দেরিতে</span>' : '') : '—'}</td>
    <td class="num" data-l="নম্বর">${x && x.marks != null ? `${x.marks}${h.max_marks ? '/' + h.max_marks : ''}` : '—'}</td><td>${x ? `<button class="btn sm ${x.status === 'submitted' ? '' : 'ghost'}" data-hs="${x.id}" data-stop>${x.status === 'submitted' ? 'দেখুন' : 'খুলুন'}</button>` : ''}</td></tr>`).join('')}</table></div>`, () => {
    $('#hwedit').onclick = () => homeworkModal(h);
    $$('[data-hs]').forEach(el => el.onclick = (e) => { e.stopPropagation(); hwCheckModal(h, byId(S.homework_submissions, el.dataset.hs)); });
  });
}
async function hwCheckModal(h, x) {
  const s = byId(S.students, x.student_id) || {};
  openModal(`<h2>${esc(studentName(s))} — ${esc(h.title)}</h2>
    <p class="small muted" style="margin:0 0 8px">জমা: ${fmtDT(x.submitted_at)}${x.checked_at ? ' · দেখা হয়েছে ' + fmtDT(x.checked_at) : ''}</p>
    ${x.note ? `<div class="card" style="white-space:pre-line;margin-bottom:10px;background:var(--soft)">${esc(x.note)}</div>` : ''}
    <div id="hwfiles" class="hwfiles">${(x.files || []).length ? '<div class="small muted">ছবি লোড হচ্ছে…</div>' : '<div class="small muted">কোনো ফাইল নেই</div>'}</div>
    <form id="hcf" class="form" style="margin-top:12px">
      ${h.max_marks ? `<label class="f">নম্বর (${h.max_marks}-এর মধ্যে)<input name="marks" type="number" min="0" max="${h.max_marks}" value="${esc(x.marks ?? '')}"></label>` : ''}
      <label class="f full">মন্তব্য (ছাত্র দেখবে)<textarea name="feedback" rows="3" maxlength="1000" placeholder="যেমন: খুব ভালো! ৫ নম্বরে は-এর জায়গায় が হবে।">${esc(x.feedback || '')}</textarea></label>
      <div class="full row" style="justify-content:flex-end;gap:8px"><button type="button" class="btn ghost" id="hcc">বন্ধ করুন</button><button type="button" class="btn ghost" id="hcredo" style="color:var(--red)">আবার করতে বলুন</button><button class="btn" type="submit">✓ দেখা শেষ</button></div>
    </form>`);
  const save = async (status) => {
    const f = $('#hcf'); const d = { status, feedback: f.feedback.value.trim(), checked_at: new Date().toISOString(), checked_by: S.user && S.user.id || null };
    if (h.max_marks) { const m = f.marks.value === '' ? null : Math.min(h.max_marks, Math.max(0, Math.round(num(f.marks.value)))); if (status === 'checked' && m == null) return toast('নম্বর দিন', true); d.marks = m; }
    try { putLocal('homework_submissions', await API.update('homework_submissions', x.id, d)); closeModal(); toast(status === 'checked' ? 'দেখা শেষ — ছাত্র নম্বর আর মন্তব্য দেখবে' : 'ছাত্রকে আবার করতে বলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); }
  };
  $('#hcc').onclick = closeModal; $('#hcf').onsubmit = (e) => { e.preventDefault(); save('checked'); }; $('#hcredo').onclick = () => save('redo');
  const box = $('#hwfiles'); const parts = [];
  for (const fl of (x.files || [])) { try { const u = await API.fileUrlFrom(HW_BUCKET, fl.path); parts.push(/\.pdf$/i.test(fl.path) || fl.type === 'application/pdf' ? `<a class="btn sm ghost" href="${esc(u)}" target="_blank" rel="noopener">📄 ${esc(fl.name || 'PDF')}</a>` : `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(fl.name || 'ছবি')}"></a>`); } catch (e) { parts.push(`<div class="small" style="color:var(--red)">${esc(fl.name || '')} খোলা যায়নি</div>`); } }
  if (box && parts.length) box.innerHTML = parts.join('');
}

// ------------------------------------------------------------------ notice board (v27)
const NOTICE_LV = { all: 'সব লেভেল', N5: 'N5', N4: 'N4', N3: 'N3' };
const NOTICE_BATCH = { all: 'সব ব্যাচ', morning: BATCH.morning, evening: BATCH.evening };
const noticeLive = (n) => n.published !== false && (!n.ends_on || n.ends_on >= todayISO());
function viewNotices() {
  const list = (S.notices || []).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const live = list.filter(noticeLive), old = list.filter(n => !noticeLive(n));
  const card = (n) => `<div class="card click notice ${noticeLive(n) ? '' : 'off'}" data-nt="${n.id}"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="min-width:0"><b style="font-size:16px">${n.pinned ? '📌 ' : ''}${esc(n.title)}</b><div class="small muted" style="margin-top:2px">${esc(NOTICE_LV[n.level] || n.level)} · ${esc(NOTICE_BATCH[n.batch] || n.batch)} · ${fmtDT(n.created_at)}${n.author ? ' · ' + esc(n.author) : ''}${n.ends_on ? ' · শেষ ' + fmtD(n.ends_on) : ''}</div></div>
      <div class="row" style="gap:6px;flex:none">${n.published === false ? badge('dropped', 'লুকানো') : !noticeLive(n) ? badge('dropped', 'মেয়াদ শেষ') : badge('active', 'ছাত্ররা দেখে')}<button class="btn sm ghost" data-nwa="${n.id}" data-stop>WhatsApp</button></div></div>
      ${n.body ? `<div style="white-space:pre-line;margin-top:8px;line-height:1.7">${esc(n.body)}</div>` : ''}</div>`;
  mount('#/notices', `
  <div class="top"><div><h1>নোটিশ বোর্ড</h1><p>এখানে লেখা নোটিশ ছাত্রদের সাইটে উপরে দেখায় — সবাইকে, অথবা শুধু একটা লেভেল বা ব্যাচকে।</p></div>
    <div class="row"><button class="btn" id="nadd">+ নতুন নোটিশ</button></div></div>
  ${live.length ? live.map(card).join('') : '<div class="card"><div class="empty">এখন কোনো চালু নোটিশ নেই। "+ নতুন নোটিশ" দিয়ে লিখুন — যেমন ছুটি, পরীক্ষার তারিখ বা ক্লাসের সময় বদল।</div></div>'}
  ${old.length ? `<h2 style="margin:22px 0 8px">পুরনো / লুকানো (${old.length})</h2>${old.map(card).join('')}` : ''}`, () => {
    $('#nadd').onclick = () => noticeModal(null);
    $$('[data-nt]').forEach(c => c.onclick = () => noticeModal(byId(S.notices, c.dataset.nt)));
    $$('[data-nwa]').forEach(b => b.onclick = (e) => { e.stopPropagation(); const n = byId(S.notices, b.dataset.nwa);
      const text = `📢 ${S.settings.institute_bn}\n*${n.title}*\n\n${n.body || ''}\n\nছাত্রদের সাইট: ${studentSiteUrl()}`;
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); });
  });
}
function noticeModal(n) {
  const v = n || { level: 'all', batch: 'all', pinned: false, published: true };
  openModal(`<h2>${n ? 'নোটিশ বদলান' : 'নতুন নোটিশ'}</h2>
  <form id="nf" class="form">
    <label class="f full">শিরোনাম<input name="title" required maxlength="120" value="${esc(v.title || '')}" placeholder="যেমন: আগামী শুক্রবার ক্লাস বন্ধ"></label>
    <label class="f full">বিস্তারিত<textarea name="body" maxlength="2000" rows="5" placeholder="যা জানাতে চান…">${esc(v.body || '')}</textarea></label>
    <label class="f">কারা দেখবে — লেভেল<select name="level">${Object.entries(NOTICE_LV).map(([k, l]) => `<option value="${k}" ${v.level === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="f">ব্যাচ<select name="batch">${Object.entries(NOTICE_BATCH).map(([k, l]) => `<option value="${k}" ${v.batch === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="f">কোন দিন পর্যন্ত দেখাবে (খালি = সবসময়)<input name="ends_on" type="date" value="${esc(v.ends_on || '')}"></label>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-top:22px"><input name="pinned" type="checkbox" ${v.pinned ? 'checked' : ''} style="width:auto"> 📌 সবার উপরে রাখুন</label>
    <label class="f full" style="flex-direction:row;align-items:center;gap:8px"><input name="published" type="checkbox" ${v.published === false ? '' : 'checked'} style="width:auto"> ছাত্ররা দেখতে পাবে</label>
    <div class="full row" style="justify-content:flex-end">${n ? '<button type="button" class="btn ghost" id="ndel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="ncc">বাতিল</button><button class="btn" type="submit">${n ? 'সংরক্ষণ' : 'প্রকাশ করুন'}</button></div>
  </form>`);
  const f = $('#nf'); $('#ncc').onclick = closeModal;
  f.onsubmit = async (e) => {
    e.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const d = { title: f.title.value.trim(), body: f.body.value.trim(), level: f.level.value, batch: f.batch.value, ends_on: f.ends_on.value || null, pinned: f.pinned.checked, published: f.published.checked, updated_at: new Date().toISOString() };
    if (!n) d.author = S.profile.name || '';
    try { const row = n ? await API.update('notices', n.id, d) : await API.insert('notices', d); putLocal('notices', row); closeModal(); toast(n ? 'সংরক্ষণ হয়েছে' : 'নোটিশ প্রকাশ হয়েছে'); render(); }
    catch (err) { btn.disabled = false; toast(errMsg(err), true); }
  };
  const del = $('#ndel'); if (del) del.onclick = async () => {
    closeModal(); if (!(await confirmBox(`"${n.title}" নোটিশটা মুছে যাবে।`))) return;
    try { await API.remove('notices', n.id); S.notices = S.notices.filter(x => x.id !== n.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); }
  };
}

// ------------------------------------------------------------------ study materials & student site (v14 database)
const MAT_BUCKET = 'materials';
const MAT_LEVEL = { all: 'সব লেভেল', N5: 'N5', N4: 'N4', N3: 'N3' };
const MAT_KIND = { book: 'বই', pdf: 'PDF', audio: 'অডিও', video: 'ভিডিও', image: 'ছবি', link: 'লিংক', file: 'ফাইল' };
const MAT_MAX = 50 * 1024 * 1024; // Supabase free plan: 50 MB per file, 1 GB in total
const studentSiteUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'student/';
const fmtSize = (b) => !num(b) ? '' : num(b) >= 1048576 ? (num(b) / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(num(b) / 1024)) + ' KB';
function matKindOf(file) { const t = file.type || ''; if (t === 'text/html' || /\.html?$/i.test(file.name)) return 'book'; if (t === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf'; if (t.startsWith('audio/')) return 'audio'; if (t.startsWith('video/')) return 'video'; if (t.startsWith('image/')) return 'image'; return 'file'; }
function studentAccess(s) { // the same rule the database uses (student_block_reason)
  if (s.portal_blocked) return 'blocked'; if (s.status === 'dropped') return 'dropped'; if (dueOf(s) > 0) return 'due'; return null;
}
const ACCESS_WHY = { blocked: 'অফিস থেকে বন্ধ রাখা হয়েছে', dropped: 'ছাত্রের অবস্থা "বাদ দিয়েছে"', due: 'পুরো কোর্স ফি এখনো পরিশোধ হয়নি' };
const studentLevels = (s) => [...new Set([...(s.package || '').split('+'), s.current_level].filter(x => LEVELS.includes(x)))];
// an HTML book is kept in private storage; storage serves it as plain text, so it is opened from a local copy
async function bookBlobUrl(u) { const r = await fetch(u); if (!r.ok) throw new Error('বইটি খোলা যায়নি (' + r.status + ')'); return URL.createObjectURL(new Blob([await r.text()], { type: 'text/html;charset=utf-8' })); }
async function openMaterial(m) {
  if (!m.file_path) { if (m.url) window.open(m.url, '_blank', 'noopener'); return; }
  const w = window.open('', '_blank');
  try { const u = await API.fileUrlFrom(MAT_BUCKET, m.file_path); if (!u) throw new Error('ফাইল পাওয়া যায়নি');
    const go = m.kind === 'book' ? await bookBlobUrl(u) : u; if (w) w.location = go; else location.href = go; } catch (e) { if (w) w.close(); toast(errMsg(e), true); }
}

function viewMaterials(q) {
  const lv = MAT_LEVEL[q.get('l')] ? q.get('l') : '';
  const all = S.materials || [];
  const order = { all: 0, N5: 1, N4: 2, N3: 3 };
  const list = all.filter(m => !lv || m.level === lv).sort((a, b) => (order[a.level] - order[b.level]) || (num(a.sort_order) - num(b.sort_order)) || (a.chapter || '').localeCompare(b.chapter || '', 'bn', { numeric: true }) || (a.title || '').localeCompare(b.title || ''));
  const used = all.reduce((a, m) => a + num(m.size_bytes), 0);
  const linked = S.students.filter(s => s.auth_user_id).length;
  const open = S.students.filter(s => s.auth_user_id && !studentAccess(s)).length;
  const url = studentSiteUrl();
  mount('#/materials', `
  <div class="top"><div><h1>পড়ার উপকরণ</h1><p>ছাত্ররা নিজের লগইন দিয়ে ছাত্রদের সাইটে এগুলো পড়ে ও শোনে — শুধু নিজের প্যাকেজের লেভেল, আর পুরো কোর্স ফি দেওয়া থাকলে।</p></div>
    <div class="row"><a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">ছাত্রদের সাইট খুলুন</a><button class="btn ghost" id="mcp">সাইটের লিংক কপি</button><button class="btn" id="madd">+ নতুন উপকরণ</button></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">মোট উপকরণ</div><div class="v">${all.length}</div><div class="s">${all.filter(m => m.published === false).length ? all.filter(m => m.published === false).length + 'টি লুকানো' : 'সবগুলো ছাত্ররা দেখতে পারে'}</div></div>
    <div class="card stat"><div class="l">লগইন যুক্ত ছাত্র</div><div class="v">${linked}</div><div class="s">চলমান ${S.students.filter(s => s.status === 'active' || s.status === 'trial').length} জনের মধ্যে</div></div>
    <div class="card stat green"><div class="l">বই খোলা আছে</div><div class="v">${open}</div><div class="s">বাকিদের ফি বাকি বা বন্ধ</div></div>
    <div class="card stat ${used > 0.85 * 1073741824 ? 'red' : ''}"><div class="l">জায়গা ব্যবহার</div><div class="v">${fmtSize(used) || '0 MB'}</div><div class="s">ফ্রি প্ল্যানে মোট ১ GB (কাগজপত্রসহ)</div></div>
  </div>
  <div class="tabs"><button data-ml="" class="${!lv ? 'on' : ''}">সব (${all.length})</button>${Object.entries(MAT_LEVEL).map(([k, l]) => `<button data-ml="${k}" class="${lv === k ? 'on' : ''}">${l} (${all.filter(m => m.level === k).length})</button>`).join('')}</div>
  <div class="tw">${list.length ? `<table class="stack"><tr><th>অধ্যায়</th><th>নাম</th><th>লেভেল</th><th>ধরন</th><th>অবস্থা</th><th></th></tr>${list.map(m => `<tr class="click" data-me="${m.id}">
    <td data-l="অধ্যায়">${esc(m.chapter || '—')}</td>
    <td data-l="নাম"><b>${esc(m.title)}</b>${m.description ? `<div class="small muted">${esc(m.description)}</div>` : ''}</td>
    <td data-l="লেভেল">${esc(MAT_LEVEL[m.level] || m.level)}</td>
    <td data-l="ধরন">${esc(MAT_KIND[m.kind] || m.kind)}${m.size_bytes ? ` <span class="small muted">${fmtSize(m.size_bytes)}</span>` : ''}${m.kind === 'video' ? (() => { const vv = (S.video_views || []).filter(x => x.material_id === m.id); return `<div class="small muted">👁 ${vv.length} জন খুলেছে · ${vv.filter(x => x.done).length} জন পুরো দেখেছে</div>`; })() : ''}</td>
    <td data-l="অবস্থা">${m.published === false ? badge('dropped', 'লুকানো') : badge('active', 'ছাত্ররা দেখে')}</td>
    <td><button class="btn sm ghost" data-mo="${m.id}" data-stop>খুলুন</button></td></tr>`).join('')}</table>` : `<div class="empty">${lv ? 'এই লেভেলে' : 'এখনো'} কোনো উপকরণ নেই। "+ নতুন উপকরণ" চেপে PDF, অডিও, ভিডিও বা লিংক যোগ করুন।</div>`}</div>
  <div class="card" style="margin-top:16px"><h2>যা জেনে রাখবেন</h2><ul class="small" style="margin:0;padding-left:18px;line-height:1.8">
    <li><b>ছাপানো বইয়ের PDF বা অডিও এখানে রাখবেন না</b> (যেমন Minna no Nihongo, Genki) — এটা কপিরাইট আইনের লঙ্ঘন। নিজেদের বানানো নোট, ওয়ার্কশিট, শব্দের তালিকা, মডেল টেস্ট আর নিজেদের রেকর্ডিং রাখুন।</li>
    <li>প্রতিটা ফাইল সর্বোচ্চ ৫০ MB। বড় ভিডিও YouTube-এ "Unlisted" করে তুলে এখানে লিংক দিন — জায়গা বাঁচবে।</li>
    <li>ছাত্র ফাইল খুললে ১ ঘণ্টার জন্য একটা লিংক তৈরি হয়, তারপর সেটা আর কাজ করে না। তবে কেউ ফাইল নামিয়ে অন্যকে দিলে সেটা আটকানো যায় না।</li>
    <li>ছাত্রকে চালু করতে: ছাত্রের পাতায় <b>"ছাত্রদের সাইট"</b> বোতাম → WhatsApp-এ নিয়ম পাঠান।</li></ul></div>`, () => {
    bindGo();
    $$('[data-ml]').forEach(b => b.onclick = () => { location.hash = '#/materials' + (b.dataset.ml ? '?l=' + b.dataset.ml : ''); });
    $$('[data-me]').forEach(tr => tr.onclick = () => materialModal(byId(S.materials, tr.dataset.me)));
    $$('[data-mo]').forEach(b => b.onclick = (e) => { e.stopPropagation(); openMaterial(byId(S.materials, b.dataset.mo)); });
    $('#madd').onclick = () => materialModal(null, lv);
    $('#mcp').onclick = async () => { try { await navigator.clipboard.writeText(url); toast('সাইটের লিংক কপি হয়েছে'); } catch { toast(url); } };
  });
}

function materialModal(m, presetLevel) {
  const v = m || { level: presetLevel || 'N5', published: true, sort_order: ((S.materials || []).filter(x => x.level === (presetLevel || 'N5')).reduce((a, x) => Math.max(a, num(x.sort_order)), 0) + 1) };
  const isLink = m ? !m.file_path : false;
  openModal(`<h2>${m ? 'উপকরণ বদলান' : 'নতুন উপকরণ'}</h2>
  <form id="mf" class="form">
    <label class="f full">নাম<input name="title" required maxlength="140" value="${esc(v.title || '')}" placeholder="যেমন: পাঠ ৩ — শব্দতালিকা ও অনুশীলন"></label>
    <label class="f">লেভেল<select name="level">${Object.entries(MAT_LEVEL).map(([k, l]) => `<option value="${k}" ${v.level === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">অধ্যায় / পাঠ<input name="chapter" maxlength="60" value="${esc(v.chapter || '')}" placeholder="যেমন: পাঠ ৩"></label>
    <label class="f">ক্রম (ছোট সংখ্যা আগে)<input name="sort_order" type="number" step="1" value="${esc(v.sort_order ?? 0)}"></label>
    <label class="f">কী দেবেন<select name="src"><option value="file" ${isLink ? '' : 'selected'}>ফাইল আপলোড (PDF, অডিও, ভিডিও, ছবি, HTML বই)</option><option value="link" ${isLink ? 'selected' : ''}>লিংক (YouTube, Google Drive ইত্যাদি)</option></select></label>
    <label class="f full" id="mfile">ফাইল${m && m.file_path ? ` <span class="small muted">— এখন আছে: ${esc(m.file_name || 'ফাইল')} ${fmtSize(m.size_bytes)}; বদলাতে চাইলে নতুনটা বেছে নিন</span>` : ''}<input name="file" type="file" accept=".pdf,application/pdf,audio/*,video/*,image/*,.html,text/html"></label>
    <label class="f full" id="mlink">লিংক<input name="url" type="url" value="${esc(v.url || '')}" placeholder="https://youtu.be/…"><span class="small muted">ভিডিও ক্লাস: YouTube-এ <b>Unlisted</b> করে তুলুন, বা Google Drive-এ "Anyone with the link" করে লিংক দিন — ছাত্রদের সাইটের ভেতরেই চলবে।</span></label>
    <label class="f" id="mlk">লিংকটা কী<select name="lkind"><option value="video" ${v.kind === 'video' ? 'selected' : ''}>ভিডিও ক্লাস</option><option value="link" ${v.kind === 'link' ? 'selected' : ''}>অন্য লিংক</option></select></label>
    <label class="f full">ছোট বর্ণনা (ঐচ্ছিক)<textarea name="description" maxlength="300">${esc(v.description || '')}</textarea></label>
    <label class="f full" style="flex-direction:row;align-items:center;gap:8px"><input name="published" type="checkbox" ${v.published === false ? '' : 'checked'} style="width:auto"> ছাত্ররা দেখতে পাবে (টিক তুলে দিলে লুকানো থাকবে)</label>
    <p class="small muted full" id="mmsg" style="margin:0"></p>
    <div class="full row" style="justify-content:flex-end">${m ? '<button type="button" class="btn ghost" id="mdel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="mcc">বাতিল</button><button class="btn" type="submit">${m ? 'সংরক্ষণ' : 'যোগ করুন'}</button></div>
  </form>`);
  const f = $('#mf');
  const sync = () => { const link = f.src.value === 'link'; $('#mfile').style.display = link ? 'none' : ''; $('#mlink').style.display = link ? '' : 'none'; $('#mlk').style.display = link ? '' : 'none'; };
  f.url.oninput = () => { f.lkind.value = /youtu\.?be|vimeo|drive\.google\.com\/(file|open)/i.test(f.url.value) ? 'video' : 'link'; };
  f.src.onchange = sync; sync();
  $('#mcc').onclick = closeModal;
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]'); const msg = $('#mmsg');
    const d = { title: f.title.value.trim(), level: f.level.value, chapter: f.chapter.value.trim(), sort_order: Math.round(num(f.sort_order.value)), description: f.description.value.trim(), published: f.published.checked };
    if (!d.title) return toast('নাম লিখুন', true);
    const file = f.file.files[0]; let oldPath = null;
    if (f.src.value === 'link') {
      const u = f.url.value.trim(); if (!/^https?:\/\//i.test(u)) return toast('পুরো লিংক দিন (https:// দিয়ে শুরু)', true);
      Object.assign(d, { url: u, kind: f.lkind.value === 'video' ? 'video' : 'link', file_path: null, file_name: null, size_bytes: null });
      if (m && m.file_path) oldPath = m.file_path;
    } else if (file) {
      if (file.size > MAT_MAX) return toast(`ফাইলটা ${fmtSize(file.size)} — সর্বোচ্চ ৫০ MB রাখা যায়। বড় ভিডিও YouTube-এ Unlisted করে লিংক দিন।`, true);
      btn.disabled = true; msg.textContent = `আপলোড হচ্ছে… (${fmtSize(file.size)} — বড় ফাইলে কয়েক মিনিট লাগতে পারে, পাতা বন্ধ করবেন না)`;
      const ext = ((file.name.match(/\.([A-Za-z0-9]{1,8})$/) || [])[1] || 'bin').toLowerCase();
      const safe = (file.name.replace(/\.[^.]*$/, '').normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'file';
      try { d.file_path = await API.uploadTo(MAT_BUCKET, `${d.level}/${Date.now()}-${safe}.${ext}`, file); } catch (err) { btn.disabled = false; msg.textContent = ''; return toast('আপলোড হয়নি: ' + errMsg(err), true); }
      Object.assign(d, { file_name: file.name, size_bytes: file.size, kind: matKindOf(file), url: null });
      if (m && m.file_path) oldPath = m.file_path;
    } else if (!m || !m.file_path) return toast('একটা ফাইল বেছে নিন', true);
    btn.disabled = true;
    try {
      const row = m ? await API.update('materials', m.id, d) : await API.insert('materials', d);
      putLocal('materials', row);
      if (oldPath && oldPath !== row.file_path) API.removeFile(MAT_BUCKET, oldPath).catch(() => {});
      closeModal(); toast(m ? 'সংরক্ষণ হয়েছে' : 'যোগ হয়েছে'); render();
    } catch (err) { btn.disabled = false; msg.textContent = ''; if (d.file_path && (!m || d.file_path !== m.file_path)) API.removeFile(MAT_BUCKET, d.file_path).catch(() => {}); toast(errMsg(err), true); }
  };
  const del = $('#mdel'); if (del) del.onclick = async () => {
    closeModal(); if (!(await confirmBox(`"${m.title}" মুছে যাবে, ছাত্ররা আর দেখতে পাবে না।`))) return;
    try { await API.remove('materials', m.id); if (m.file_path) await API.removeFile(MAT_BUCKET, m.file_path).catch(() => {}); S.materials = S.materials.filter(x => x.id !== m.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); }
  };
}

// ------------------------------------------------------------------ online mock tests (v15 database)
const MOCK_SEC = { vocab: 'শব্দ ও কানজি', grammar: 'ব্যাকরণ', reading: 'পড়া (読解)', listening: 'শোনা (聴解)' };
const MOCK_SEC_ORDER = ['vocab', 'grammar', 'reading', 'listening'];
const ABCD = window.SK_LANG === 'en' ? ['A', 'B', 'C', 'D'] : ['ক', 'খ', 'গ', 'ঘ']; // answer labels: ক খ গ ঘ in Bangla, A B C D in English
const mockQs = (tid) => (S.mock_questions || []).filter(q => q.test_id === tid).sort((a, b) => (MOCK_SEC_ORDER.indexOf(a.section) - MOCK_SEC_ORDER.indexOf(b.section)) || (num(a.sort_order) - num(b.sort_order)) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
const mockDone = (tid) => (S.mock_attempts || []).filter(a => a.test_id === tid && a.submitted_at);
const mockOpts = (q) => Array.isArray(q.options) ? q.options : (() => { try { return JSON.parse(q.options); } catch { return []; } })();
// one Japanese sentence aloud (teacher notes); says what to check when no sound comes out
const NOVOICE = 'এই ডিভাইসে জাপানি ভয়েস পাওয়া যায়নি — শব্দ না এলে ফোনের Text-to-Speech-এ জাপানি যোগ করুন';
function sayJa(text) {
  if (!('speechSynthesis' in window)) return toast('এই ব্রাউজারে কথা বলার সুবিধা নেই — Chrome বা Safari ব্যবহার করুন', true);
  const ok = window.JLPTVoice ? window.JLPTVoice.play(text, '') : (speakJa(text), true);
  if (!ok) return toast(NOVOICE, true);
  setTimeout(() => { if (!speechSynthesis.speaking && !speechSynthesis.pending) toast('শব্দ আসেনি? ভলিউম বাড়ান, iPhone-এর সাইলেন্ট সুইচ বন্ধ করুন, তারপর আবার 🔊 চাপুন'); }, 1500);
}
function speakJa(text) { // reads a listening script aloud with the device's Japanese voice
  if (!('speechSynthesis' in window)) return toast('এই ব্রাউজারে কথা বলার সুবিধা নেই', true);
  speechSynthesis.cancel();
  const clean = String(text || '').split('\n').map(l => l.replace(/^[^：:\s]{1,6}[：:]\s*/, '')).join('。');
  const u = new SpeechSynthesisUtterance(clean); u.lang = 'ja-JP'; u.rate = 0.9;
  const v = speechSynthesis.getVoices().find(x => /^ja/i.test(x.lang)); if (v) u.voice = v; else toast('এই ডিভাইসে জাপানি ভয়েস পাওয়া যায়নি — শব্দ না এলে ফোনের Text-to-Speech-এ জাপানি যোগ করুন');
  speechSynthesis.speak(u);
}
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

const MOCK_CAT = { full: 'পূর্ণ মক টেস্ট', kanji: 'কানজি', grammar: 'ব্যাকরণ', listening: 'শোনার অনুশীলন', other: 'অন্যান্য' };
const MOCK_CAT_ORDER = ['full', 'kanji', 'grammar', 'listening', 'other'];
function mockCat(t) {
  if (MOCK_CAT[t.category] && t.category !== 'other') return t.category;
  const x = String(t.title || '');
  return /মক টেস্ট/.test(x) ? 'full' : /কানজি/.test(x) ? 'kanji' : /ব্যাকরণ/.test(x) ? 'grammar' : /শোনা/.test(x) ? 'listening' : 'other';
}
function viewMocks(q) {
  const lv = LEVELS.includes(q.get('l')) ? q.get('l') : '';
  const cat = MOCK_CAT[q.get('c')] ? q.get('c') : '';
  const all = (S.mock_tests || []).slice().sort((a, b) => (LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)) || (MOCK_CAT_ORDER.indexOf(mockCat(a)) - MOCK_CAT_ORDER.indexOf(mockCat(b))) || (num(a.sort_order) - num(b.sort_order)) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const byLv = all.filter(t => !lv || t.level === lv);
  const list = byLv.filter(t => !cat || mockCat(t) === cat);
  const hidden = all.filter(t => !t.published).length;
  const hiddenHere = list.filter(t => !t.published && mockQs(t.id).length);
  const view = q.get('v') === 'students' ? 'students' : 'tests';
  const link = (l, c) => '#/mocks' + ((l || c) ? '?' + [l ? 'l=' + l : '', c ? 'c=' + c : ''].filter(Boolean).join('&') : '');
  const cats = MOCK_CAT_ORDER.filter(c => c !== 'other' || byLv.some(t => mockCat(t) === 'other'));
  const vtabs = `<div class="tabs"><button data-kv="tests" class="${view === 'tests' ? 'on' : ''}">টেস্টগুলো (${all.length})</button><button data-kv="students" class="${view === 'students' ? 'on' : ''}">ছাত্র অনুযায়ী ফলাফল</button></div>`;
  mount('#/mocks', `
  <div class="top"><div><h1>মক টেস্ট</h1><p>ছাত্ররা ছাত্রদের সাইটে অনলাইনে পরীক্ষা দেয়; নম্বর সাথে সাথে গোনা হয় আর "পরীক্ষা ও রেজাল্ট"-এ উঠে যায়।</p></div>
    <div class="row">${view === 'tests' && hiddenHere.length ? `<button class="btn ghost" id="mkpuball">দেখানো ${hiddenHere.length}টি চালু করুন</button>` : ''}<button class="btn" id="mkadd">+ নতুন মক টেস্ট</button></div></div>
  ${hidden ? `<div class="alertbar" style="margin-bottom:16px"><b>${hidden}টি মক টেস্ট লুকানো আছে</b><span>নমুনা প্রশ্নগুলো শিক্ষক একবার দেখে নিন, তারপর টেস্ট খুলে "ছাত্রদের জন্য চালু করুন" চাপুন (বা একসাথে: লেভেল আর ভাগ বেছে উপরের "চালু করুন")।</span></div>` : ''}
  ${vtabs}${view === 'students' ? viewMockStudents(q, '', null) : `<div class="tabs" style="border:none;margin-top:-8px"><button data-kg="${link('', cat)}" class="${!lv ? 'on' : ''}">সব লেভেল (${all.length})</button>${LEVELS.map(l => `<button data-kg="${link(l, cat)}" class="${lv === l ? 'on' : ''}">${l} (${all.filter(t => t.level === l).length})</button>`).join('')}</div>
  <div class="tabs" style="border:none;margin-top:-8px"><button data-kg="${link(lv, '')}" class="${!cat ? 'on' : ''}">সব ভাগ (${byLv.length})</button>${cats.map(c => `<button data-kg="${link(lv, c)}" class="${cat === c ? 'on' : ''}">${MOCK_CAT[c]} (${byLv.filter(t => mockCat(t) === c).length})</button>`).join('')}</div>
  ${cat === 'listening' ? `<div class="card" style="margin-bottom:12px;padding:12px 16px;background:var(--soft)"><b>শোনার অনুশীলন</b><div class="small muted" style="margin-top:4px">এখানে নিজের রেকর্ড করা অডিও দিয়ে প্রশ্ন বসানো যাবে: টেস্ট খুলুন → "শোনা" ভাগে "+ প্রশ্ন" → অডিও ফাইল বেছে নিন, প্রশ্ন আর চারটি উত্তর লিখুন। প্রশ্ন যোগ করে টেস্ট চালু করলে তবেই ছাত্ররা দেখবে।</div></div>` : ''}
  <div class="tw">${list.length ? `<table class="stack"><tr><th>নাম</th><th>লেভেল</th><th>ভাগ</th><th class="num">প্রশ্ন</th><th class="num">সময়</th><th>অবস্থা</th><th class="num">যারা দিয়েছে</th><th class="num">গড়</th></tr>${list.map(t => {
    const qs = mockQs(t.id); const done = mockDone(t.id); const studs = new Set(done.map(a => a.student_id));
    const avg = done.length ? Math.round(done.reduce((a, x) => a + (num(x.total) ? num(x.score) * 100 / num(x.total) : 0), 0) / done.length) : null;
    return `<tr class="click" data-go="#/mock/${t.id}"><td data-l="নাম"><b>${esc(t.title)}</b>${t.description ? `<div class="small muted">${esc(t.description)}</div>` : ''}</td><td data-l="লেভেল">${esc(t.level)}</td><td data-l="ভাগ">${MOCK_CAT[mockCat(t)]}</td><td class="num" data-l="প্রশ্ন">${qs.length || '<span class="muted">খালি</span>'}</td><td class="num" data-l="সময়">${t.duration_min} মিনিট</td><td data-l="অবস্থা">${t.published ? badge('active', 'চালু') : badge('dropped', 'লুকানো')}</td><td class="num" data-l="যারা দিয়েছে">${studs.size} জন</td><td class="num" data-l="গড়">${avg == null ? '—' : avg + '%'}</td></tr>`;
  }).join('')}</table>` : '<div class="empty">এই ভাগে এখনো কোনো মক টেস্ট নেই</div>'}</div>`}`, () => {
    $$('[data-kv]').forEach(b => b.onclick = () => { location.hash = '#/mocks' + (b.dataset.kv === 'students' ? '?v=students' : ''); });
    bindGo();
    $$('[data-kg]').forEach(b => b.onclick = () => { location.hash = b.dataset.kg; });
    $('#mkadd').onclick = () => mockTestModal(null, lv, cat);
    const pa = $('#mkpuball'); if (pa) pa.onclick = async () => {
      if (!(await confirmBox(`${hiddenHere.length}টি টেস্ট ছাত্রদের জন্য চালু হবে: ${hiddenHere.slice(0, 6).map(t => t.title).join(', ')}${hiddenHere.length > 6 ? ' …' : ''}। প্রশ্নগুলো দেখে নিয়েছেন তো?`))) return;
      pa.disabled = true; let ok = 0;
      for (const t of hiddenHere) { try { putLocal('mock_tests', await API.update('mock_tests', t.id, { published: true })); ok++; } catch (e) { toast(errMsg(e), true); break; } }
      toast(`${ok}টি টেস্ট চালু হয়েছে`); render();
    };
  });
}

function mockTestModal(t, presetLevel, presetCat) {
  const v = t ? Object.assign({}, t, { category: mockCat(t) }) : { level: presetLevel || 'N5', category: presetCat || 'full', duration_min: 40, pass_pct: 60, show_answers: true, published: false };
  openModal(`<h2>${t ? 'মক টেস্টের তথ্য' : 'নতুন মক টেস্ট'}</h2>
  <form id="mkf" class="form">
    <label class="f full">নাম<input name="title" required maxlength="100" value="${esc(v.title || '')}" placeholder="যেমন: N5 মক টেস্ট ৪"></label>
    <label class="f">লেভেল<select name="level">${LEVELS.map(l => `<option ${v.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">ভাগ<select name="category">${MOCK_CAT_ORDER.map(c => `<option value="${c}" ${v.category === c ? 'selected' : ''}>${MOCK_CAT[c]}</option>`).join('')}</select></label>
    <label class="f">সময় (মিনিট)<input name="duration_min" type="number" min="1" max="300" required value="${esc(v.duration_min)}"></label>
    <label class="f">পাস নম্বর (%)<input name="pass_pct" type="number" min="0" max="100" required value="${esc(v.pass_pct)}"></label>
    <label class="f">কতবার দেওয়া যাবে (খালি = যতবার খুশি)<input name="max_attempts" type="number" min="1" value="${esc(v.max_attempts || '')}"></label>
    <label class="f full">ছোট বর্ণনা<input name="description" maxlength="200" value="${esc(v.description || '')}"></label>
    <label class="f full" style="flex-direction:row;align-items:center;gap:8px"><input name="show_answers" type="checkbox" ${v.show_answers === false ? '' : 'checked'} style="width:auto"> জমা দেওয়ার পর সঠিক উত্তর আর ব্যাখ্যা দেখাবে</label>
    <label class="f full" style="flex-direction:row;align-items:center;gap:8px"><input name="published" type="checkbox" ${v.published ? 'checked' : ''} style="width:auto"> ছাত্রদের জন্য চালু</label>
    <div class="full row" style="justify-content:flex-end">${t && (isAdmin() || !(S.mock_attempts || []).some(a => a.test_id === t.id)) ? '<button type="button" class="btn ghost" id="mkdel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="mkc">বাতিল</button><button class="btn" type="submit">${t ? 'সংরক্ষণ' : 'তৈরি করুন'}</button></div>
  </form>`);
  const f = $('#mkf'); $('#mkc').onclick = closeModal;
  f.onsubmit = async (e) => {
    e.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const d = { title: f.title.value.trim(), level: f.level.value, category: f.category.value, duration_min: Math.max(1, Math.round(num(f.duration_min.value))), pass_pct: Math.min(100, Math.max(0, Math.round(num(f.pass_pct.value)))), max_attempts: f.max_attempts.value ? Math.max(1, Math.round(num(f.max_attempts.value))) : null, description: f.description.value.trim(), show_answers: f.show_answers.checked, published: f.published.checked };
    if (!t) d.sort_order = (S.mock_tests || []).filter(x => x.level === d.level).reduce((a, x) => Math.max(a, num(x.sort_order)), 0) + 1;
    try { const row = t ? await API.update('mock_tests', t.id, d) : await API.insert('mock_tests', d); putLocal('mock_tests', row); closeModal(); toast(t ? 'সংরক্ষণ হয়েছে' : 'তৈরি হয়েছে — এবার প্রশ্ন যোগ করুন'); location.hash = '#/mock/' + row.id; render(); }
    catch (err) { btn.disabled = false; toast(errMsg(err), true); }
  };
  const del = $('#mkdel'); if (del) del.onclick = async () => {
    closeModal(); if (!(await confirmBox(`"${t.title}" আর এর সব প্রশ্ন ও ছাত্রদের দেওয়া উত্তর মুছে যাবে। "পরীক্ষা ও রেজাল্ট"-এ ওঠা নম্বর থেকে যাবে।`))) return;
    try { await API.remove('mock_tests', t.id); S.mock_tests = S.mock_tests.filter(x => x.id !== t.id); S.mock_questions = S.mock_questions.filter(x => x.test_id !== t.id); S.mock_attempts = S.mock_attempts.filter(x => x.test_id !== t.id); toast('মুছে ফেলা হয়েছে'); location.hash = '#/mocks'; } catch (e) { toast(errMsg(e), true); }
  };
}

// the question list can hide the answers, so a teacher can read the test the way a student meets it
const mockAnsShown = () => { try { return localStorage.getItem('sakura_mock_ans') !== 'hide'; } catch (_) { return true; } };
function viewMock(id, q) {
  const t = byId(S.mock_tests || [], id);
  if (!t) return mount('#/mocks', '<div class="empty">মক টেস্ট পাওয়া যায়নি</div>');
  const tab = q.get('t') === 'res' ? 'res' : 'qs';
  const qs = mockQs(t.id); const done = mockDone(t.id);
  const cnt = Object.fromEntries(MOCK_SEC_ORDER.map(s => [s, qs.filter(x => x.section === s).length]));
  let body = '';
  if (tab === 'qs') {
    let n = 0; let lastPassage = null;
    body = MOCK_SEC_ORDER.map(sec => { const items = qs.filter(x => x.section === sec); lastPassage = null;
      return `<div class="row" style="margin:18px 0 8px"><h2 style="margin:0;font:700 17px 'Noto Serif Bengali';color:var(--navy)">${MOCK_SEC[sec]} <span class="small muted">(${items.length})</span></h2><span class="spacer"></span><button class="btn sm ghost" data-qadd="${sec}">+ প্রশ্ন</button></div>
      ${items.length ? items.map(x => { n++; const o = mockOpts(x); const showP = x.passage && x.passage !== lastPassage; lastPassage = x.passage;
        return `${showP ? `<div class="card" style="padding:10px 14px;margin-bottom:6px;background:var(--soft);white-space:pre-line;font-size:14.5px">${fx(x.passage)}</div>` : ''}
        <div class="card click" data-qe="${x.id}" style="padding:12px 14px;margin-bottom:8px"><div class="row" style="align-items:flex-start;gap:10px"><b style="color:var(--muted)">${n}.</b><div style="flex:1;min-width:0"><div style="white-space:pre-line">${fx(x.question)}</div>
          ${x.section === 'listening' ? `<div class="small muted" style="margin-top:4px">🔊 ${x.audio_path ? 'অডিও ফাইল আছে' : 'জাপানি ভয়েসে পড়ে শোনানো হবে'} ${x.script ? `<button class="btn sm ghost" data-say="${x.id}" data-stop style="margin-left:6px">▶ শুনুন</button>` : ''}</div>` : ''}
          <ol class="mqo">${o.map((op, i) => `<li class="${i === num(x.correct) ? 'ok' : ''}"><span class="ab">${ABCD[i]}</span><span>${fx(op)}</span>${i === num(x.correct) ? '<b class="tick">✓ সঠিক</b>' : ''}</li>`).join('')}</ol>
          <div class="mqa"><b>সঠিক উত্তর: ${ABCD[num(x.correct)] || '?'}) ${fx(o[num(x.correct)] ?? '')}</b>${x.explanation ? `<span>${esc(x.explanation)}</span>` : ''}</div></div></div></div>`; }).join('') : '<div class="empty" style="padding:12px">এই ভাগে প্রশ্ন নেই</div>'}`; }).join('');
  } else {
    const byStu = new Map(); for (const a of done) { const arr = byStu.get(a.student_id) || []; arr.push(a); byStu.set(a.student_id, arr); }
    const rows = [...byStu.entries()].map(([sid, arr]) => { const best = arr.reduce((m, a) => num(a.score) > num(m.score) ? a : m, arr[0]); const last = arr.reduce((m, a) => (a.submitted_at || '') > (m.submitted_at || '') ? a : m, arr[0]); return { s: byId(S.students, sid), sid, n: arr.length, best, last }; }).sort((a, b) => num(b.best.score) - num(a.best.score));
    const secAvg = MOCK_SEC_ORDER.map(sec => { const xs = done.map(a => (a.sections || {})[sec]).filter(Boolean); const tot = xs.reduce((a, x) => a + num(x.total), 0); return [sec, tot ? Math.round(xs.reduce((a, x) => a + num(x.score), 0) * 100 / tot) : null]; });
    body = `<div class="grid g4" style="margin-bottom:14px">${secAvg.map(([sec, p]) => `<div class="card stat ${p != null && p < t.pass_pct ? 'red' : ''}"><div class="l">${MOCK_SEC[sec]}</div><div class="v">${p == null ? '—' : p + '%'}</div><div class="s">সব চেষ্টার গড়</div></div>`).join('')}</div>
    <div class="tw">${rows.length ? `<table class="stack"><tr><th>ছাত্র</th><th class="num">কতবার</th><th class="num">পাতা ছেড়েছে</th><th class="num">সেরা নম্বর</th><th>ভাগ অনুযায়ী (সেরা চেষ্টা)</th><th>শেষ দিয়েছে</th><th></th></tr>${rows.map(r => { const p = num(r.best.total) ? Math.round(num(r.best.score) * 100 / num(r.best.total)) : 0;
      return `<tr class="click" data-go="#/student/${r.sid}?t=exams"><td data-l="ছাত্র">${esc(r.s ? studentName(r.s) : '—')}<div class="small muted">${esc(r.s ? r.s.admission_no : '')}</div></td><td class="num" data-l="কতবার">${r.n}</td><td class="num" data-l="পাতা ছেড়েছে">${(() => { const k = (S.mock_attempts || []).filter(a => a.test_id === t.id && a.student_id === r.sid && a.end_reason === 'left').length; return k ? `<b style="color:var(--red)">${k}</b>` : '0'; })()}</td><td class="num" data-l="সেরা নম্বর"><b style="color:${p >= t.pass_pct ? 'var(--green)' : 'var(--red)'}">${num(r.best.score)}/${num(r.best.total)}</b> <span class="small muted">${p}%</span></td><td data-l="ভাগ" class="small">${MOCK_SEC_ORDER.filter(sec => (r.best.sections || {})[sec]).map(sec => `${MOCK_SEC[sec].split(' ')[0]} ${r.best.sections[sec].score}/${r.best.sections[sec].total}`).join(' · ')}</td><td data-l="শেষ দিয়েছে">${fmtDT(r.last.submitted_at)}</td><td>${isAdmin() ? `<button class="btn sm ghost" data-reset="${r.sid}" data-stop style="color:var(--red)">চেষ্টা মুছুন</button>` : ''}</td></tr>`; }).join('')}</table>` : '<div class="empty">এখনো কেউ এই টেস্ট দেয়নি</div>'}</div>`;
  }
  mount('#/mocks', `
  <div class="top"><div><h1>${esc(t.title)}</h1><p>${esc(t.level)} · ${MOCK_CAT[mockCat(t)]} · ${t.duration_min} মিনিট · পাস ${t.pass_pct}% · ${qs.length}টি প্রশ্ন (${MOCK_SEC_ORDER.map(s => `${MOCK_SEC[s].split(' ')[0]} ${cnt[s]}`).join(', ')})${t.max_attempts ? ` · সর্বোচ্চ ${t.max_attempts} বার` : ''}</p><div class="row" style="margin-top:4px">${t.published ? badge('active', 'ছাত্রদের জন্য চালু') : badge('dropped', 'লুকানো — ছাত্ররা দেখে না')}</div></div>
    <div class="row"><a class="btn ghost" href="#/mocks">‹ সব মক টেস্ট</a><a class="btn" href="student/#mock=${esc(t.id)}" target="_blank" rel="noopener" title="ছাত্রদের সাইটে খুলবে — সময়, প্রশ্ন, ফলাফল ঠিক ছাত্রের মতো; নম্বর জমা হবে না">📝 ছাত্রের মতো পরীক্ষা দিন</a><button class="btn ghost" id="mkans" type="button">${mockAnsShown() ? '🙈 উত্তর লুকান' : '👁 উত্তর দেখান'}</button><button class="btn ghost" id="mkedit">তথ্য বদলান</button><button class="btn ghost" id="mkcsv">CSV থেকে প্রশ্ন</button><button class="btn ${t.published ? 'ghost' : 'gold'}" id="mkpub">${t.published ? 'লুকিয়ে রাখুন' : 'ছাত্রদের জন্য চালু করুন'}</button></div></div>
  <div class="tabs"><button data-mt="qs" class="${tab === 'qs' ? 'on' : ''}">প্রশ্ন (${qs.length})</button><button data-mt="res" class="${tab === 'res' ? 'on' : ''}">ফলাফল (${new Set(done.map(a => a.student_id)).size} জন)</button></div>${body}`, () => {
    bindGo();
    $$('[data-mt]').forEach(b => b.onclick = () => { location.hash = `#/mock/${t.id}${b.dataset.mt === 'res' ? '?t=res' : ''}`; });
    const main = $('.main'); main.classList.toggle('hideans', !mockAnsShown());
    $('#mkans').onclick = () => { const show = !mockAnsShown(); try { localStorage.setItem('sakura_mock_ans', show ? 'show' : 'hide'); } catch (_) {} main.classList.toggle('hideans', !show); $('#mkans').textContent = show ? '🙈 উত্তর লুকান' : '👁 উত্তর দেখান'; };
    $('#mkedit').onclick = () => mockTestModal(t);
    $('#mkcsv').onclick = () => mockCsvModal(t);
    $('#mkpub').onclick = async () => {
      if (!t.published && !qs.length) return toast('আগে প্রশ্ন যোগ করুন', true);
      try { putLocal('mock_tests', await API.update('mock_tests', t.id, { published: !t.published })); toast(t.published ? 'লুকানো হয়েছে' : 'ছাত্রদের জন্য চালু হয়েছে'); render(); } catch (e) { toast(errMsg(e), true); }
    };
    $$('[data-qadd]').forEach(b => b.onclick = () => mockQuestionModal(t, null, b.dataset.qadd));
    $$('[data-qe]').forEach(c => c.onclick = () => mockQuestionModal(t, byId(S.mock_questions, c.dataset.qe)));
    $$('[data-say]').forEach(b => b.onclick = (e) => { e.stopPropagation(); { const q = byId(S.mock_questions, b.dataset.say); if (window.JLPTVoice) { if (!window.JLPTVoice.play(q.script, q.question)) toast(NOVOICE, true); else setTimeout(() => { if (!speechSynthesis.speaking && !speechSynthesis.pending) toast('শব্দ আসেনি? ভলিউম বাড়ান, iPhone-এর সাইলেন্ট সুইচ বন্ধ করুন, তারপর আবার চাপুন'); }, 1500); } else speakJa(q.script); } });
    $$('[data-reset]').forEach(b => b.onclick = async (e) => {
      e.stopPropagation(); const sid = b.dataset.reset; const s = byId(S.students, sid);
      if (!(await confirmBox(`${s ? studentName(s) : 'এই ছাত্র'}-এর এই টেস্টের সব চেষ্টা মুছে যাবে, ছাত্র আবার নতুন করে দিতে পারবে। "পরীক্ষা ও রেজাল্ট"-এর নম্বর থেকে যাবে।`, 'হ্যাঁ, মুছে দিন'))) return;
      try { for (const a of (S.mock_attempts || []).filter(x => x.test_id === t.id && x.student_id === sid)) await API.remove('mock_attempts', a.id); S.mock_attempts = S.mock_attempts.filter(x => !(x.test_id === t.id && x.student_id === sid)); toast('মুছে ফেলা হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); }
    });
  });
}

function mockQuestionModal(t, x, presetSection) {
  const v = x || { section: presetSection || 'vocab', options: ['', '', '', ''], correct: 0, sort_order: mockQs(t.id).filter(q => q.section === (presetSection || 'vocab')).reduce((a, q) => Math.max(a, num(q.sort_order)), 0) + 1 };
  const o = mockOpts(v); while (o.length < 4) o.push('');
  openModal(`<h2>${x ? 'প্রশ্ন বদলান' : 'নতুন প্রশ্ন'} — ${esc(t.title)}</h2>
  <form id="mqf" class="form">
    <label class="f">ভাগ<select name="section">${MOCK_SEC_ORDER.map(s => `<option value="${s}" ${v.section === s ? 'selected' : ''}>${MOCK_SEC[s]}</option>`).join('')}</select></label>
    <label class="f">ক্রম<input name="sort_order" type="number" step="1" value="${esc(v.sort_order ?? 0)}"></label>
    <label class="f full" id="mqp">পড়ার লেখা (পড়ার ভাগে; একই লেখার একাধিক প্রশ্নে হুবহু একই লেখা দিন)<textarea name="passage" rows="4">${esc(v.passage || '')}</textarea></label>
    <label class="f full" id="mqs">শোনার স্ক্রিপ্ট (জাপানি; "女：", "男：" দিয়ে কে বলছে লিখতে পারেন — ছাত্রের ফোন এটা জাপানি ভয়েসে পড়ে শোনাবে)<textarea name="script" rows="4">${esc(v.script || '')}</textarea></label>
    <label class="f full" id="mqa">অথবা নিজের রেকর্ড করা অডিও${v.audio_path ? ' <span class="small muted">— এখন একটা অডিও আছে; বদলাতে নতুনটা বেছে নিন</span>' : ''}<input name="audio" type="file" accept="audio/*"></label>
    <label class="f full">প্রশ্ন (প্রথম লাইনে নির্দেশনা দিতে পারেন)<textarea name="question" rows="3" required>${esc(v.question || '')}</textarea></label>
    ${o.slice(0, 4).map((op, i) => `<label class="f">উত্তর ${ABCD[i]}${i >= 2 ? ' (ঐচ্ছিক)' : ''}<input name="op${i}" value="${esc(op)}" ${i < 2 ? 'required' : ''}></label>`).join('')}
    <label class="f">সঠিক উত্তর<select name="correct">${ABCD.map((l, i) => `<option value="${i}" ${num(v.correct) === i ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f full">ব্যাখ্যা (জমার পর ছাত্র দেখবে)<textarea name="explanation" rows="2">${esc(v.explanation || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end">${x ? '<button type="button" class="btn ghost" id="mqd" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="mqc">বাতিল</button><button class="btn" type="submit">${x ? 'সংরক্ষণ' : 'যোগ করুন'}</button></div>
  </form>`);
  const f = $('#mqf'); const sync = () => { const s = f.section.value; $('#mqp').style.display = s === 'reading' ? '' : 'none'; $('#mqs').style.display = s === 'listening' ? '' : 'none'; $('#mqa').style.display = s === 'listening' ? '' : 'none'; };
  f.section.onchange = sync; sync(); $('#mqc').onclick = closeModal;
  f.onsubmit = async (e) => {
    e.preventDefault(); const btn = f.querySelector('button[type=submit]');
    const opts = [0, 1, 2, 3].map(i => f['op' + i].value.trim()); while (opts.length > 2 && !opts[opts.length - 1]) opts.pop();
    if (opts.some(x => !x)) return toast('উত্তরগুলো ক থেকে পরপর লিখুন — মাঝে খালি রাখা যাবে না', true);
    const correct = num(f.correct.value); if (correct >= opts.length) return toast('সঠিক উত্তর হিসেবে খালি ঘর বাছাই করা হয়েছে', true);
    const sec = f.section.value;
    const d = { test_id: t.id, section: sec, sort_order: Math.round(num(f.sort_order.value)), passage: sec === 'reading' ? f.passage.value.trim() : '', script: sec === 'listening' ? f.script.value.trim() : '', question: f.question.value.trim(), options: opts, correct, explanation: f.explanation.value.trim() };
    const file = f.audio.files[0]; btn.disabled = true;
    try {
      if (sec === 'listening' && file) { if (file.size > MAT_MAX) throw new Error('অডিও সর্বোচ্চ ৫০ MB'); d.audio_path = await API.uploadTo(MAT_BUCKET, `mock/${t.id}/${Date.now()}.${((file.name.match(/\.([A-Za-z0-9]{1,8})$/) || [])[1] || 'mp3').toLowerCase()}`, file); }
      if (sec !== 'listening') d.audio_path = null;
      if (sec === 'listening' && !d.script && !d.audio_path && !(x && x.audio_path)) throw new Error('শোনার প্রশ্নে স্ক্রিপ্ট বা অডিও দিন');
      const row = x ? await API.update('mock_questions', x.id, d) : await API.insert('mock_questions', d);
      putLocal('mock_questions', row);
      if (x && x.audio_path && row.audio_path !== x.audio_path) API.removeFile(MAT_BUCKET, x.audio_path).catch(() => {});
      closeModal(); toast(x ? 'সংরক্ষণ হয়েছে' : 'যোগ হয়েছে'); render();
    } catch (err) { btn.disabled = false; toast(errMsg(err), true); }
  };
  const del = $('#mqd'); if (del) del.onclick = async () => {
    closeModal(); if (!(await confirmBox('এই প্রশ্নটি মুছে যাবে।'))) return;
    try { await API.remove('mock_questions', x.id); if (x.audio_path) API.removeFile(MAT_BUCKET, x.audio_path).catch(() => {}); S.mock_questions = S.mock_questions.filter(z => z.id !== x.id); toast('মুছে ফেলা হয়েছে'); render(); } catch (e2) { toast(errMsg(e2), true); }
  };
}

const MOCK_CSV_HEAD = ['section', 'passage', 'question', 'option1', 'option2', 'option3', 'option4', 'correct', 'explanation', 'script'];
function mockCsvModal(t) {
  openModal(`<h2>CSV থেকে প্রশ্ন তুলুন — ${esc(t.title)}</h2>
    <p class="small muted">Excel বা Google Sheets-এ এই কলামগুলো রাখুন, তারপর "CSV (UTF-8)" হিসেবে সেভ করুন:<br><code>${MOCK_CSV_HEAD.join(', ')}</code><br>
    <b>section</b> = vocab / grammar / reading / listening · <b>correct</b> = সঠিক উত্তরের নম্বর ১–৪ · <b>passage</b> শুধু পড়ার প্রশ্নে · <b>script</b> শুধু শোনার প্রশ্নে।</p>
    <div class="row" style="gap:8px;margin:10px 0"><button class="btn ghost" id="mctpl">নমুনা ফাইল নামান</button></div>
    <label class="f">CSV ফাইল<input type="file" id="mcfile" accept=".csv,text/csv"></label>
    <div id="mcprev" class="small" style="margin-top:10px"></div>
    <div class="row" style="justify-content:flex-end;margin-top:14px;gap:8px"><button class="btn ghost" id="mcc">বাতিল</button><button class="btn" id="mcgo" disabled>তুলুন</button></div>`);
  $('#mcc').onclick = closeModal;
  $('#mctpl').onclick = () => csvDownload('sakura-mock-template.csv', [MOCK_CSV_HEAD, ['vocab', '', '【山】の よみかたは？', 'かわ', 'やま', 'うみ', 'そら', '2', '山 = やま (পাহাড়)', ''], ['grammar', '', 'でんしゃ（　）がっこうへ いきます。', 'で', 'に', 'を', 'が', '1', 'যানবাহনে で', ''], ['listening', '', '男の人は 何時に 来ますか。', '8時', '9時', '10時', '11時', '3', '১০টায় আসবে', '女：9時に 来て ください。\n男：10時でも いいですか。\n女：はい。']]);
  let rows = [];
  $('#mcfile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return; const data = parseCsv(await file.text()); const head = (data.shift() || []).map(h => h.trim().toLowerCase());
    const col = (r, k) => { const i = head.indexOf(k); return i < 0 ? '' : String(r[i] ?? '').trim(); };
    const errs = []; rows = [];
    const base = mockQs(t.id).length;
    data.forEach((r, i) => {
      const sec = col(r, 'section').toLowerCase(); const opts = ['option1', 'option2', 'option3', 'option4'].map(k => col(r, k)); while (opts.length > 2 && !opts[opts.length - 1]) opts.pop();
      const c = Math.round(num(col(r, 'correct'))) - 1;
      if (!MOCK_SEC_ORDER.includes(sec)) return errs.push(`লাইন ${i + 2}: section ভুল`);
      if (!col(r, 'question')) return errs.push(`লাইন ${i + 2}: প্রশ্ন নেই`);
      if (opts.some(x => !x) || opts.length < 2) return errs.push(`লাইন ${i + 2}: উত্তর কম বা মাঝে খালি`);
      if (c < 0 || c >= opts.length) return errs.push(`লাইন ${i + 2}: correct ১–${opts.length} হতে হবে`);
      if (sec === 'listening' && !col(r, 'script')) return errs.push(`লাইন ${i + 2}: শোনার প্রশ্নে script নেই`);
      rows.push({ test_id: t.id, section: sec, sort_order: base + rows.length + 1, passage: sec === 'reading' ? col(r, 'passage') : '', question: col(r, 'question'), options: opts, correct: c, explanation: col(r, 'explanation'), script: sec === 'listening' ? col(r, 'script') : '' });
    });
    $('#mcprev').innerHTML = `${rows.length}টি প্রশ্ন ঠিক আছে${errs.length ? `<div style="color:var(--red);margin-top:6px">${errs.slice(0, 8).map(esc).join('<br>')}${errs.length > 8 ? '<br>…' : ''}</div>` : ''}`;
    $('#mcgo').disabled = !rows.length;
  };
  $('#mcgo').onclick = async () => {
    $('#mcgo').disabled = true;
    try { const made = await API.insertMany('mock_questions', rows); made.forEach(r => putLocal('mock_questions', r)); closeModal(); toast(`${made.length}টি প্রশ্ন যোগ হয়েছে`); render(); } catch (e) { $('#mcgo').disabled = false; toast(errMsg(e), true); }
  };
}

// ------------------------------------------------------------------ teacher home (teachers see class work only)
function viewTeacherHome() {
  const smap = sessionMap(); const today = todayISO();
  const current = S.students.filter(s => s.status === 'active' || s.status === 'trial');
  const todaySessions = S.sessions.filter(s => s.class_date === today).map(s => s.id);
  const todayRecs = S.attendance.filter(a => todaySessions.includes(a.session_id));
  const todayCame = todayRecs.filter(a => a.status === 'present' || a.status === 'late').length;
  const low = current.map(s => ({ s, a: attOf(s.id, smap) })).filter(x => x.a.total >= 5 && x.a.pct < 80).sort((a, b) => a.a.pct - b.a.pct);
  const groups = {}; for (const s of current) { const k = s.current_level + '|' + s.batch; groups[k] = (groups[k] || 0) + 1; }
  const todayOff = dayInfo(today); const missAtt = missingAttendance();
  const exams = S.exams.filter(e => e.exam_date >= today).sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const mocks = (S.mock_attempts || []).filter(a => a.submitted_at).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)).slice(0, 8);
  mount('#/', `
  <div class="top"><div>${heroTitle()}<p>আজ ${fmtD(today)} · শিক্ষকের পাতা</p></div>
    <div class="row no-print"><a class="btn" href="#/attendance">আজকের হাজিরা</a><a class="btn ghost" href="#/exams">পরীক্ষা ও নম্বর</a><a class="btn ghost" href="#/mocks">মক টেস্ট</a><a class="btn ghost" href="#/materials">পড়ার উপকরণ</a></div></div>
  ${todayOff.off ? `<div class="alertbar" style="margin-bottom:16px"><b>আজ ক্লাস নেই</b><span>${esc(todayOff.why)}</span></div>` : ''}
  ${missAtt.length ? `<a class="alertbar" href="#/attendance?d=${missAtt[0].date}&l=${missAtt[0].level}&b=${missAtt[0].batch}" style="margin-bottom:16px"><b>${missAtt.length}টি ক্লাসের হাজিরা নেওয়া হয়নি</b><span>${missAtt.slice(0, 3).map(x => `${fmtD(x.date)} ${x.level} ${BATCH[x.batch]}`).join(' · ')}${missAtt.length > 3 ? ' …' : ''}</span></a>` : ''}
  <div class="grid g2 hero">${upNextCard()}${needsYouCard()}</div>
  <div class="grid g4">
    <div class="card stat"><div class="l">চলমান ছাত্র-ছাত্রী</div><div class="v">${current.length}</div></div>
    <div class="card stat"><div class="l">আজকের উপস্থিতি</div><div class="v">${todayRecs.length ? todayCame + ' / ' + todayRecs.length : '—'}</div><div class="s">${todaySessions.length ? todaySessions.length + 'টি ক্লাস' : 'আজ হাজিরা নেওয়া হয়নি'}</div></div>
    <div class="card stat ${low.length ? 'red' : ''}"><div class="l">উপস্থিতি ৮০%-এর নিচে</div><div class="v">${low.length}</div></div>
    <div class="card stat"><div class="l">সামনের পরীক্ষা</div><div class="v">${exams.length}</div></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>ব্যাচ অনুযায়ী ছাত্র</h2><div class="tw"><table><tr><th>লেভেল</th><th>${BATCH.morning}</th><th>${BATCH.evening}</th></tr>${LEVELS.map(l => `<tr><td><b>${l}</b></td><td>${groups[l + '|morning'] || 0} জন</td><td>${groups[l + '|evening'] || 0} জন</td></tr>`).join('')}</table></div></div>
    <div class="card"><h2>সামনের পরীক্ষা</h2>${exams.length ? `<div class="tw"><table>${exams.slice(0, 8).map(e => `<tr class="click" data-go="#/exam/${e.id}"><td>${fmtD(e.exam_date)}</td><td>${esc(e.title)}</td><td>${esc(e.level)}</td></tr>`).join('')}</table></div>` : '<div class="empty">সামনে কোনো পরীক্ষা নেই</div>'}</div>
    <div class="card"><h2>উপস্থিতি ৮০%-এর নিচে</h2>${low.length ? `<div class="tw"><table>${low.slice(0, 10).map(({ s, a }) => `<tr class="click" data-go="#/student/${s.id}?t=att"><td>${esc(studentName(s))}</td><td>${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</td><td>${bar(a.pct)}</td></tr>`).join('')}</table></div>` : '<div class="empty">সবার উপস্থিতি ভালো</div>'}</div>
    <div class="card"><h2>সাম্প্রতিক অনলাইন মক টেস্ট</h2>${mocks.length ? `<div class="tw"><table>${mocks.map(a => { const t = byId(S.mock_tests || [], a.test_id); const s = byId(S.students, a.student_id); const p = num(a.total) ? Math.round(num(a.score) * 100 / num(a.total)) : 0; return `<tr class="click" data-go="#/mock/${a.test_id}?t=res"><td>${esc(s ? studentName(s) : '—')}</td><td>${esc(t ? t.title : '')}</td><td class="num"><b style="color:${t && p >= t.pass_pct ? 'var(--green)' : 'var(--red)'}">${num(a.score)}/${num(a.total)}</b></td></tr>`; }).join('')}</table></div>` : '<div class="empty">এখনো কেউ অনলাইনে মক টেস্ট দেয়নি</div>'}</div>
  </div>`, () => { bindGo(); addStaffWallet(); bindHero(); });
}

// ------------------------------------------------------------------ people: the director adds and removes logins (v17 database)
const portalUrl = () => location.origin + location.pathname;
function newInviteCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = new Uint8Array(8); crypto.getRandomValues(b); return [...b].map(x => A[x % A.length]).join(''); }
const inviteMsg = (inv) => `আসসালামু আলাইকুম ${inv.name}। ${S.settings.institute_bn}-এর পোর্টালে আপনাকে ${ROLE_NAME[inv.role]} হিসেবে যোগ করা হয়েছে।\n\n১. এই লিংক খুলুন: ${portalUrl()}\n২. "প্রথমবার? অ্যাকাউন্ট খুলুন" চাপুন\n৩. ইমেইল: ${inv.email}\n৪. নিজের একটা পাসওয়ার্ড দিন (অন্তত ৮ অক্ষর)\n৫. আমন্ত্রণ কোড: ${inv.code}\n\nকোডটি ${fmtD((inv.expires_at || '').slice(0, 10))} পর্যন্ত কাজ করবে। পাসওয়ার্ড কাউকে বলবেন না।`;
async function viewPeople() {
  if (!isDirector()) return mount('#/people', ADMIN_ONLY_MSG);
  mount('#/people', '<div class="empty">লোড হচ্ছে…</div>');
  let people;
  try { if (DEMO) people = S.profiles.map(p => ({ ...p, email: p.id === 'demo' ? 'demo' : (p.email || '') })); else { const { data, error } = await sb.rpc('admin_people'); if (error) throw error; people = data || []; } }
  catch (e) { return mount('#/people', `<div class="empty">${esc(errMsg(e))}</div>`); }
  const me = S.profile.id; const now = new Date().toISOString();
  const inv = (S.staff_invites || []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const open = inv.filter(i => !i.used_at && i.expires_at > now); const closed = inv.filter(i => i.used_at || i.expires_at <= now).slice(0, 10);
  const count = (r) => people.filter(p => p.role === r).length;
  mount('#/people', `
  <div class="top"><div><h1>স্টাফ ও শিক্ষক</h1><p>কে পোর্টালে ঢুকতে পারবে আর কী দেখবে — এখান থেকেই যোগ করুন, ভূমিকা বদলান বা লগইন বন্ধ করুন।</p></div>
    <div class="row"><button class="btn ghost" id="pcards">🪪 সবার আইডি কার্ড প্রিন্ট</button><button class="btn" id="padd">+ নতুন শিক্ষক / স্টাফ</button></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">পরিচালক / উপ-পরিচালক</div><div class="v">${count('admin') + count('deputy')}</div></div>
    <div class="card stat"><div class="l">অফিস স্টাফ</div><div class="v">${count('staff')}</div></div>
    <div class="card stat"><div class="l">শিক্ষক</div><div class="v">${count('teacher') + count('head_teacher')}</div>${count('head_teacher') ? `<div class="s">প্রধান শিক্ষক ${count('head_teacher')} জন</div>` : ''}</div>
    <div class="card stat"><div class="l">আমন্ত্রণ বাকি</div><div class="v">${open.length}</div><div class="s">এখনো অ্যাকাউন্ট খোলেননি</div></div>
  </div>
  <div class="card"><h2>যাদের লগইন আছে</h2><div class="tw"><table class="stack"><tr><th>নাম</th><th>আইডি</th><th>ইমেইল</th><th>ভূমিকা</th><th>শেষ লগইন</th><th></th></tr>
    ${people.map(p => `<tr><td data-l="নাম"><b>${esc(p.name || '—')}</b>${p.id === me ? ' <span class="small muted">(আপনি)</span>' : ''}</td><td data-l="আইডি"><button class="btn sm ghost" data-card="${esc(p.id)}">🪪 ${esc((cardOf(p) || {}).staff_no || 'কার্ড')}</button></td><td data-l="ইমেইল" style="overflow-wrap:anywhere">${esc(p.email || '—')}</td>
      <td data-l="ভূমিকা"><select data-role="${esc(p.id)}" ${p.id === me ? 'disabled title="নিজের ভূমিকা বদলানো যায় না"' : ''}>${Object.entries(ROLE_NAME).map(([k, v]) => `<option value="${k}" ${p.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td data-l="শেষ লগইন">${p.last_sign_in_at ? fmtDT(p.last_sign_in_at) : '—'}</td>
      <td>${p.id === me ? '' : `<button class="btn sm ghost" data-rm="${esc(p.id)}" style="color:var(--red)">লগইন বন্ধ করুন</button>`}</td></tr>`).join('')}</table></div>
    <p class="small muted" style="margin:10px 0 0">লগইন বন্ধ করলে সে আর পোর্টালে ঢুকতে পারবে না; তার আগের কাজের রেকর্ড (হাজিরা, নম্বর, টাকা জমা) থেকে যাবে। ভূমিকা বদলালে পরের বার পাতা খুললেই নতুন ভূমিকা কাজ করবে।</p></div>
  <div class="card" style="margin-top:16px"><h2>আমন্ত্রণ</h2>${open.length ? `<div class="tw"><table class="stack"><tr><th>নাম</th><th>ইমেইল</th><th>ভূমিকা</th><th>কোড</th><th>মেয়াদ</th><th></th></tr>
    ${open.map(i => `<tr><td data-l="নাম"><b>${esc(i.name)}</b></td><td data-l="ইমেইল" style="overflow-wrap:anywhere">${esc(i.email)}</td><td data-l="ভূমিকা">${esc(ROLE_NAME[i.role])}</td><td data-l="কোড"><code style="font-size:15px;letter-spacing:.08em">${esc(i.code)}</code></td><td data-l="মেয়াদ">${fmtD(i.expires_at.slice(0, 10))}</td>
      <td><div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn sm wa" href="https://wa.me/?text=${encodeURIComponent(inviteMsg(i))}" target="_blank" rel="noopener">${WA_SVG} পাঠান</a><button class="btn sm ghost" data-icp="${esc(i.id)}">কপি</button><button class="btn sm ghost" data-ix="${esc(i.id)}" style="color:var(--red)">বাতিল</button></div></td></tr>`).join('')}</table></div>`
    : '<div class="empty">কোনো আমন্ত্রণ বাকি নেই। "+ নতুন শিক্ষক / স্টাফ" চেপে কাউকে যোগ করুন।</div>'}
    ${closed.length ? `<details style="margin-top:10px"><summary class="small muted">পুরোনো আমন্ত্রণ (${closed.length})</summary><div class="tw"><table>${closed.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.email)}</td><td>${esc(ROLE_NAME[i.role])}</td><td class="small muted">${i.used_at ? 'অ্যাকাউন্ট খুলেছেন ' + fmtD(i.used_at.slice(0, 10)) : 'মেয়াদ শেষ'}</td></tr>`).join('')}</table></div></details>` : ''}</div>
  <div class="card" style="margin-top:16px"><h2>কীভাবে কাজ করে</h2><ol class="small" style="margin:0;padding-left:18px;line-height:1.9">
    <li>"+ নতুন শিক্ষক / স্টাফ" চেপে নাম, ইমেইল আর ভূমিকা দিন — একটা ৮ অক্ষরের কোড তৈরি হবে।</li>
    <li>"পাঠান" চেপে WhatsApp-এ নিয়ম আর কোড পাঠান।</li>
    <li>সে পোর্টাল খুলে "প্রথমবার? অ্যাকাউন্ট খুলুন" চাপবে, সেই ইমেইল আর নিজের পাসওয়ার্ড দেবে, কোড লিখবে — তারপরই ঢুকতে পারবে। কোড শুধু সেই ইমেইলেই কাজ করে, ১৪ দিন পর্যন্ত।</li>
    <li>কে কী দেখবে তা ঠিক হয় ভূমিকা দিয়ে: <b>শিক্ষক</b> — হাজিরা, পরীক্ষা, উপকরণ, মক টেস্ট; <b>অফিস স্টাফ</b> — ভর্তি, টাকা জমা, কাগজ, জাপান আবেদনও; <b>পরিচালক</b> — সব কিছু। পরিচালক যোগ করার আগে ভালো করে ভাবুন।</li></ol></div>`, () => {
    $('#padd').onclick = () => inviteModal();
    $('#pcards').onclick = () => printStaffCards(people.map(p => byId(S.profiles, p.id) || p));
    $$('[data-card]').forEach(b => b.onclick = () => staffCardModal(people.find(x => x.id === b.dataset.card), false));
    $$('[data-role]').forEach(sel => sel.onchange = async () => {
      const p = people.find(x => x.id === sel.dataset.role); const role = sel.value;
      if (role === 'admin' && !(await confirmBox(`${p.name}-কে পরিচালক করলে সে সব কিছু দেখতে ও বদলাতে পারবে — টাকা, বেতন, ব্যাকআপ, অন্যদের লগইন।`, 'হ্যাঁ, পরিচালক করুন'))) { sel.value = p.role; return; }
      try { const row = await API.update('profiles', p.id, { role }); S.profiles = S.profiles.map(x => x.id === row.id ? row : x); toast(`${p.name} এখন ${ROLE_NAME[role]}`); viewPeople(); } catch (e) { sel.value = p.role; toast(errMsg(e), true); }
    });
    $$('[data-rm]').forEach(b => b.onclick = async () => {
      const p = people.find(x => x.id === b.dataset.rm);
      if (!(await confirmBox(`${p.name} (${p.email || ''}) আর পোর্টালে ঢুকতে পারবে না। পরে আবার চাইলে নতুন আমন্ত্রণ পাঠাতে হবে।`, 'হ্যাঁ, লগইন বন্ধ করুন'))) return;
      try { await API.remove('profiles', p.id); S.profiles = S.profiles.filter(x => x.id !== p.id); toast('লগইন বন্ধ করা হয়েছে'); viewPeople(); } catch (e) { toast(errMsg(e), true); }
    });
    $$('[data-icp]').forEach(b => b.onclick = async () => { const i = inv.find(x => x.id === b.dataset.icp); try { await navigator.clipboard.writeText(inviteMsg(i)); toast('মেসেজ কপি হয়েছে'); } catch { toast('কোড: ' + i.code); } });
    $$('[data-ix]').forEach(b => b.onclick = async () => {
      const i = inv.find(x => x.id === b.dataset.ix); if (!(await confirmBox(`${i.name}-এর আমন্ত্রণ বাতিল হবে; কোডটি আর কাজ করবে না।`, 'হ্যাঁ, বাতিল করুন'))) return;
      try { await API.remove('staff_invites', i.id); S.staff_invites = S.staff_invites.filter(x => x.id !== i.id); toast('আমন্ত্রণ বাতিল হয়েছে'); viewPeople(); } catch (e) { toast(errMsg(e), true); }
    });
  });
}
function inviteModal() {
  openModal(`<h2>নতুন শিক্ষক / স্টাফ যোগ করুন</h2>
  <form id="ivf" class="form">
    <label class="f full">নাম<input name="name" required maxlength="60" placeholder="যেমন: রহিমা আক্তার"></label>
    <label class="f full">ইমেইল (যেটা দিয়ে লগইন করবে)<input name="email" type="email" required maxlength="120" autocomplete="off"></label>
    <label class="f full">ভূমিকা<select name="role"><option value="teacher">শিক্ষক — হাজিরা, পরীক্ষা, উপকরণ, মক টেস্ট</option><option value="head_teacher">প্রধান শিক্ষক — শিক্ষকের সব কাজ, সাথে ছাত্রদের ক্লাসের মতামত দেখা</option><option value="staff">অফিস স্টাফ — ভর্তি, টাকা জমা, কাগজ, জাপান আবেদনও</option><option value="deputy">উপ-পরিচালক — সব তথ্য ও কাজ, শুধু স্টাফ যোগ / ভূমিকা বদলানো বাদে</option><option value="admin">পরিচালক — সব কিছু</option></select></label>
    <div class="full row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="ivc">বাতিল</button><button class="btn" type="submit">কোড তৈরি করুন</button></div>
  </form>`);
  const f = $('#ivf'); $('#ivc').onclick = closeModal;
  f.onsubmit = async (e) => {
    e.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const d = { name: f.name.value.trim(), email: f.email.value.trim().toLowerCase(), role: f.role.value, code: newInviteCode(), expires_at: new Date(Date.now() + 14 * 864e5).toISOString() };
    try {
      const row = await API.insert('staff_invites', d); putLocal('staff_invites', row);
      openModal(`<h2>${esc(row.name)}-এর আমন্ত্রণ তৈরি হয়েছে</h2><p>আমন্ত্রণ কোড:</p><p style="font:700 28px ui-monospace,monospace;letter-spacing:.12em;margin:4px 0 12px">${esc(row.code)}</p>
        <div class="card" style="padding:10px;white-space:pre-line;font-size:13.5px" id="ivmsg">${esc(inviteMsg(row))}</div>
        <div class="row" style="gap:8px;margin-top:12px;justify-content:flex-end"><a class="btn wa" href="https://wa.me/?text=${encodeURIComponent(inviteMsg(row))}" target="_blank" rel="noopener">${WA_SVG} WhatsApp-এ পাঠান</a><button class="btn ghost" id="ivcp">কপি</button><button class="btn" id="ivok">ঠিক আছে</button></div>`);
      $('#ivok').onclick = () => { closeModal(); viewPeople(); };
      $('#ivcp').onclick = async () => { try { await navigator.clipboard.writeText(inviteMsg(row)); toast('মেসেজ কপি হয়েছে'); } catch { toast('কোড: ' + row.code); } };
    } catch (err) { btn.disabled = false; toast(errMsg(err), true); }
  };
}
// first-time login: create the account and claim the invite code
function renderSignup(note = '', turned) {
  const glow = (h) => `<span class="glow">${h}</span>`;
  $('#app').innerHTML = `<div class="login auth-up"><form class="card ${turned ? 'turn-in' : ''}" id="sgf" autocomplete="on">
    <div class="kamon" style="width:56px;height:56px">${KAMON}</div>
    <h1 class="ahead">Start your first page<br>with <em>Sakura</em></h1><p class="asub">পরিচালকের পাঠানো আমন্ত্রণ কোড লাগবে। যে ইমেইলে আমন্ত্রণ এসেছে, সেটাই দিন।</p>
    <label class="f">ইমেইল${glow('<input name="email" type="email" required autocomplete="username" placeholder="you@example.com">')}</label>
    <label class="f">নতুন পাসওয়ার্ড (অন্তত ৮ অক্ষর)${glow('<input name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="••••••••">')}</label>
    <label class="f">আবার পাসওয়ার্ড${glow('<input name="password2" type="password" minlength="8" required autocomplete="new-password" placeholder="••••••••">')}</label>
    <label class="f">আমন্ত্রণ কোড${glow('<input name="code" required maxlength="12" autocapitalize="characters" autocomplete="off" style="letter-spacing:.1em" placeholder="ABCD1234">')}</label>
    <button class="btn abtn" type="submit">অ্যাকাউন্ট খুলুন</button>
    <p class="small" id="sgm" style="margin:10px 0 0;color:var(--red);text-align:center">${esc(note)}</p>
    <p class="aswap">আগেই অ্যাকাউন্ট আছে? <a href="#" id="sgback" class="linkbtn">লগইন করুন</a></p>
  </form></div>`;
  $('#sgback').onclick = (e) => { e.preventDefault(); authTurn(() => renderLogin(true), false); };
  $('#sgf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const m = $('#sgm'); const btn = f.querySelector('button[type=submit]');
    if (f.password.value !== f.password2.value) { m.textContent = 'দুটো পাসওয়ার্ড মেলেনি।'; return; }
    btn.disabled = true; m.textContent = '';
    const { data, error } = await sb.auth.signUp({ email: f.email.value.trim().toLowerCase(), password: f.password.value });
    if (error || (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)) { btn.disabled = false; m.textContent = /already|registered/i.test(error ? error.message : 'already') ? 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে — লগইন করুন, তারপর কোড চাইলে সেখানে দিন।' : errMsg(error); return; }
    if (!data.session) { btn.disabled = false; m.textContent = 'ইমেইলে পাঠানো লিংকে ক্লিক করে নিশ্চিত করুন, তারপর লগইন করে কোড দিন।'; return; }
    await claimAndEnter(data.user, f.code.value, (msg) => { btn.disabled = false; m.textContent = msg; });
  };
}
const CLAIM_MSG = { bad_code: 'কোড বা ইমেইল মেলেনি, অথবা কোডের মেয়াদ শেষ। পরিচালকের কাছে নতুন কোড চান।', busy: 'অনেকবার ভুল হয়েছে, ১ ঘণ্টা পরে আবার চেষ্টা করুন।', student: 'এটা ছাত্রদের সাইটের অ্যাকাউন্ট — পোর্টালের জন্য আলাদা ইমেইল দিন।', login: 'আবার লগইন করুন।' };
async function claimAndEnter(user, code, fail) {
  const { data, error } = await sb.rpc('claim_invite', { p_code: String(code || '').trim() });
  if (error) return fail(errMsg(error));
  if (data === 'ok' || data === 'already') { toast('স্বাগতম!'); return afterLogin(user); }
  fail(CLAIM_MSG[data] || data);
}

// ------------------------------------------------------------------ mock test records (student profile, mark sheet, per-student summary)
const END_NAME = { submit: 'নিজে জমা দিয়েছে', timeout: 'সময় শেষ', left: 'পাতা ছেড়ে গেছে' };
const endBadge = (r) => r === 'left' ? badge('due', '⚠ পাতা ছেড়ে গেছে') : r === 'timeout' ? badge('trial', 'সময় শেষ') : badge('active', 'জমা দিয়েছে');
function attemptsOf(sid) { return (S.mock_attempts || []).filter(a => a.student_id === sid && a.submitted_at).sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || '')); }
function attemptRow(a) {
  const t = byId(S.mock_tests || [], a.test_id) || {}; const total = num(a.total), score = num(a.score);
  const answered = a.answered != null ? num(a.answered) : Object.keys(a.answers || {}).length;
  return { a, t, total, score, wrong: Math.max(0, answered - score), blank: Math.max(0, total - answered), pct: total ? Math.round(score * 100 / total) : 0,
    mins: a.started_at && a.submitted_at ? Math.max(0, Math.round((Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 60000)) : null, pass: total && score * 100 >= num(t.pass_pct || 60) * total };
}
function mockSummary(rows) {
  const tests = new Set(rows.map(r => r.a.test_id)).size; const avg = rows.length ? Math.round(rows.reduce((x, r) => x + r.pct, 0) / rows.length) : null;
  const best = rows.length ? Math.max(...rows.map(r => r.pct)) : null; const left = rows.filter(r => r.a.end_reason === 'left').length; const passed = rows.filter(r => r.pass).length;
  return { n: rows.length, tests, avg, best, left, passed, last: rows[0] ? rows[0].a.submitted_at : null };
}
function mockRecordHtml(s) {
  const rows = attemptsOf(s.id).map(attemptRow); const m = mockSummary(rows);
  if (!rows.length) return '<div class="card"><div class="empty">এই ছাত্র এখনো অনলাইনে কোনো মক টেস্ট দেয়নি।</div></div>';
  return `<div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">মোট চেষ্টা</div><div class="v">${m.n}</div><div class="s">${m.tests}টি আলাদা টেস্ট · পাস ${m.passed} বার</div></div>
    <div class="card stat"><div class="l">গড় নম্বর</div><div class="v">${m.avg}%</div></div>
    <div class="card stat green"><div class="l">সেরা নম্বর</div><div class="v">${m.best}%</div></div>
    <div class="card stat ${m.left ? 'red' : ''}"><div class="l">পাতা ছেড়ে গেছে</div><div class="v">${m.left}</div><div class="s">${m.left ? 'পরীক্ষার মাঝে অন্য অ্যাপ/ট্যাবে গিয়েছিল' : 'কোনো সন্দেহজনক কিছু নেই'}</div></div></div>
  ${mockPerTestHtml(rows)}
  <div class="row" style="margin-bottom:10px"><h2 style="margin:0;font:700 17px 'Noto Serif Bengali';color:var(--navy)">সব চেষ্টা</h2><span class="spacer"></span><button class="btn ghost" id="pms">মার্কশিট প্রিন্ট</button></div>
  <div class="tw"><table class="stack"><tr><th>তারিখ ও সময়</th><th>টেস্ট</th><th class="num">নম্বর</th><th>সঠিক · ভুল · বাদ</th><th class="num">সময় লেগেছে</th><th>কীভাবে শেষ</th></tr>
  ${rows.map(r => `<tr class="click" data-go="#/mock/${r.a.test_id}?t=res"><td data-l="তারিখ">${fmtDT(r.a.submitted_at)}</td><td data-l="টেস্ট"><b>${esc(r.t.title || '—')}</b> <span class="small muted">${esc(r.t.level || '')}</span></td>
    <td class="num" data-l="নম্বর"><b style="color:${r.pass ? 'var(--green)' : 'var(--red)'}">${r.score}/${r.total}</b> <span class="small muted">${r.pct}%</span></td>
    <td data-l="সঠিক · ভুল · বাদ"><span style="color:var(--green)">${r.score}</span> · <span style="color:var(--red)">${r.wrong}</span> · <span class="muted">${r.blank}</span></td>
    <td class="num" data-l="সময় লেগেছে">${r.mins == null ? '—' : r.mins + ' মিনিট'}</td><td data-l="কীভাবে শেষ">${endBadge(r.a.end_reason)}</td></tr>`).join('')}</table></div>
  <p class="small muted" style="margin-top:8px">প্রতিটা টেস্টের সেরা নম্বর "পরীক্ষা" ট্যাবেও ওঠে। "পাতা ছেড়ে গেছে" মানে পরীক্ষা চলার সময় ছাত্র অন্য অ্যাপ বা ট্যাবে গিয়েছিল, তাই পরীক্ষা নিজে থেকে জমা হয়ে গেছে।</p>`;
}
// one line per test: how many times taken, the best score, passed or not, and the certificate (made from the saved best attempt, so it can be printed again any time)
function mockTestsOf(rows) {
  const by = new Map(); for (const r of rows) { const k = r.a.test_id; const x = by.get(k) || { t: r.t, n: 0, best: null, last: null }; x.n++; if (!x.best || r.pct > x.best.pct || (r.pct === x.best.pct && r.a.submitted_at < x.best.a.submitted_at)) x.best = r; if (!x.last || r.a.submitted_at > x.last) x.last = r.a.submitted_at; by.set(k, x); }
  const cat = { full: 1, kanji: 2, grammar: 3, listening: 4 };
  return [...by.values()].sort((a, b) => (a.t.level || '').localeCompare(b.t.level || '') * -1 || (cat[a.t.category] || 9) - (cat[b.t.category] || 9) || num(a.t.sort_order) - num(b.t.sort_order));
}
function mockPerTestHtml(rows) {
  const xs = mockTestsOf(rows); const passed = xs.filter(x => x.best.pass).length;
  return `<div class="row" style="margin-bottom:10px"><h2 style="margin:0;font:700 17px 'Noto Serif Bengali';color:var(--navy)">টেস্ট অনুযায়ী</h2><span class="small muted">${xs.length}টি টেস্ট দিয়েছে · ${passed}টিতে পাস · ${passed}টি সার্টিফিকেট</span></div>
  <div class="tw" style="margin-bottom:18px"><table class="stack"><tr><th>টেস্ট</th><th class="num">কতবার</th><th class="num">সেরা নম্বর</th><th>ফল</th><th>শেষ দিয়েছে</th><th></th></tr>
  ${xs.map(x => `<tr><td data-l="টেস্ট"><b>${esc(x.t.title || '—')}</b> <span class="small muted">${esc(x.t.level || '')}</span></td><td class="num" data-l="কতবার">${x.n} বার</td>
    <td class="num" data-l="সেরা নম্বর"><b style="color:${x.best.pass ? 'var(--green)' : 'var(--red)'}">${x.best.score}/${x.best.total}</b> <span class="small muted">${x.best.pct}%</span></td>
    <td data-l="ফল">${x.best.pass ? badge('active', 'পাস ✓') : badge('due', 'এখনো পাস নয়')}</td><td data-l="শেষ দিয়েছে">${fmtD(x.last.slice(0, 10))}</td>
    <td>${x.best.pass ? `<button class="btn sm gold" data-mcert="${esc(x.best.a.id)}">🎓 সার্টিফিকেট</button>` : ''}</td></tr>`).join('')}</table></div>`;
}
async function printMockCertificate(s, aid) {
  const a = (S.mock_attempts || []).find(x => x.id === aid); if (!a) return; const r = attemptRow(a); const st = S.settings; const t = r.t;
  const w = certWindow(); if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
  const vb = await certVerifyHtml('mock', s, { test: t.title || '', level: t.level || '', category: t.category || '', score: r.score, total: r.total, pct: r.pct, date: (a.submitted_at || '').slice(0, 10) });
  const jd = (iso) => iso ? `${iso.slice(0, 4)}年${num(iso.slice(5, 7))}月${num(iso.slice(8, 10))}日` : '';
  const day = (a.submitted_at || '').slice(0, 10); const today = todayISO();
  const CAT = { full: '総合模擬試験 / Full mock test', kanji: '漢字 / Kanji', grammar: '文法 / Grammar', listening: '聴解 / Listening' };
  printWindow('Mock certificate ' + s.admission_no, `${headHtml()}
  <div style="padding:30px 34px;font-family:'Shippori Mincho B1',serif;border:3px double #A3843A;margin:14px">
  <div style="text-align:center;margin-bottom:22px"><div style="font-size:28px;font-weight:800;letter-spacing:6px">模擬試験 合格証</div><div style="font-size:13px;letter-spacing:2px;color:#6E665A">CERTIFICATE OF PASSING · JAPANESE MOCK TEST</div></div>
  <table style="font-family:'Shippori Mincho B1','Hind Siliguri',serif"><tr><th>氏名 / Name</th><td>${esc(s.name_en || '')}${s.name_bn ? ' (' + esc(s.name_bn) + ')' : ''}</td></tr><tr><th>学籍番号 / Student No.</th><td>${esc(s.admission_no || '')}</td></tr>
  <tr><th>試験 / Test</th><td>JLPT ${esc(t.level || '')} 模擬試験 · ${CAT[t.category] || ''}<br><span style="font-size:12px">${esc(t.title || '')}</span></td></tr>
  <tr><th>受験日 / Date taken</th><td>${jd(day)} (${fmtD(day)})</td></tr>
  <tr><th>得点 / Score</th><td><b style="font-size:18px">${r.score} / ${r.total} (${r.pct}%)</b> &nbsp; 合格点 / Pass mark ${num(t.pass_pct || 60)}%</td></tr></table>
  <p style="margin-top:22px;font-size:14px">上記の者は、当学院の日本語模擬試験に合格したことを証明します。<br><span style="font-size:12px;color:#6E665A">This is to certify that the above-named student has passed the Japanese mock test of our institute.</span></p>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;font-size:13.5px;line-height:1.8">
  <div>発行日 / Date of Issue: ${jd(today)} (${fmtD(today)})<br>${esc(st.institute_ja)} / ${esc(st.institute_en)}</div>
  <div style="text-align:center"><div style="width:74px;height:74px;border:1.5px dashed #C8372B;border-radius:50%;margin:0 auto 6px;color:#C8372B;display:grid;place-items:center;font-size:12px">印</div>学院長 ${esc(st.director_ja)}<br>Director ${esc(st.director_en)}</div></div>
  ${vb}<p style="font-size:11px;color:#6E665A;margin-top:14px">この証明書はオンライン模擬試験の記録に基づいています。 / Based on the student's saved online mock test record.</p></div>`, w);
}
function printMockSheet(s) {
  const rows = attemptsOf(s.id).map(attemptRow).reverse(); const m = mockSummary([...rows].reverse());
  printWindow('Mark sheet ' + (s.name_en || s.name_bn || ''), `<div style="border:1.5px solid #A3843A">${headHtml()}
  <div style="padding:16px 20px"><div style="text-align:center;margin-bottom:12px"><div style="font:700 11px 'Shippori Mincho B1';letter-spacing:4px;color:#A3843A">MOCK TEST MARK SHEET · 模擬試験成績表</div><div style="font:800 20px 'Noto Serif Bengali';color:#1B2945">অনলাইন মক টেস্টের মার্কশিট</div></div>
  <table style="margin-bottom:12px"><tr><th>ছাত্রের নাম</th><td>${esc(s.name_bn || '')} ${s.name_en ? '(' + esc(s.name_en) + ')' : ''}</td></tr><tr><th>ভর্তি নম্বর · লেভেল · ব্যাচ</th><td>${esc(s.admission_no)} · ${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</td></tr>
  <tr><th>সারাংশ</th><td>মোট ${m.n}টি চেষ্টা (${m.tests}টি টেস্ট) · গড় ${m.avg ?? '—'}% · সেরা ${m.best ?? '—'}% · পাস ${m.passed} বার${m.left ? ` · পাতা ছেড়ে গেছে ${m.left} বার` : ''}</td></tr></table>
  <table><tr style="background:#1B2945;color:#fff"><th style="width:auto;background:#1B2945;color:#fff">#</th><th style="width:auto;background:#1B2945;color:#fff">তারিখ</th><th style="width:auto;background:#1B2945;color:#fff">টেস্ট</th><th style="width:auto;background:#1B2945;color:#fff">নম্বর</th><th style="width:auto;background:#1B2945;color:#fff">%</th><th style="width:auto;background:#1B2945;color:#fff">সঠিক/ভুল/বাদ</th><th style="width:auto;background:#1B2945;color:#fff">ফল</th><th style="width:auto;background:#1B2945;color:#fff">মন্তব্য</th></tr>
  ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${fmtDT(r.a.submitted_at).slice(0, 10)}</td><td>${esc(r.t.title || '')}</td><td><b>${r.score}/${r.total}</b></td><td>${r.pct}%</td><td>${r.score} / ${r.wrong} / ${r.blank}</td><td style="color:${r.pass ? '#2E7D4F' : '#B8382C'};font-weight:700">${r.pass ? 'পাস' : 'ফেল'}</td><td style="font-size:12px">${r.a.end_reason === 'left' ? 'পাতা ছেড়ে গেছে' : r.a.end_reason === 'timeout' ? 'সময় শেষ' : ''}</td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center">কোনো চেষ্টা নেই</td></tr>'}</table>
  <div style="display:flex;justify-content:space-between;margin-top:46px;font-size:12.5px"><div style="border-top:1px dotted #8A7F6C;width:36%;padding-top:4px">শিক্ষকের স্বাক্ষর</div><div style="border-top:1px dotted #8A7F6C;width:36%;padding-top:4px;text-align:right">পরিচালকের স্বাক্ষর · ${esc(S.settings.director_en || '')}</div></div>
  <div style="font-size:11px;color:#8A7F6C;margin-top:12px">প্রিন্টের তারিখ ${fmtD(todayISO())} · Sakura Portal</div></div></div>`);
}
function viewMockStudents(q, tabs, bind) {
  const byStu = new Map(); for (const a of (S.mock_attempts || []).filter(a => a.submitted_at)) { const arr = byStu.get(a.student_id) || []; arr.push(attemptRow(a)); byStu.set(a.student_id, arr); }
  const rows = [...byStu.entries()].map(([sid, rs]) => ({ s: byId(S.students, sid), sid, m: mockSummary(rs.sort((a, b) => (b.a.submitted_at || '').localeCompare(a.a.submitted_at || ''))) })).sort((a, b) => (b.m.last || '').localeCompare(a.m.last || ''));
  const quiet = S.students.filter(s => (s.status === 'active' || s.status === 'trial') && !byStu.has(s.id));
  return `${tabs}<div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="l">মক টেস্ট দিয়েছে</div><div class="v">${rows.length} জন</div><div class="s">চলমান ${S.students.filter(s => s.status === 'active' || s.status === 'trial').length} জনের মধ্যে</div></div>
    <div class="card stat"><div class="l">মোট চেষ্টা</div><div class="v">${rows.reduce((x, r) => x + r.m.n, 0)}</div></div>
    <div class="card stat"><div class="l">গড় নম্বর</div><div class="v">${rows.length ? Math.round(rows.reduce((x, r) => x + r.m.avg, 0) / rows.length) + '%' : '—'}</div></div>
    <div class="card stat ${rows.some(r => r.m.left) ? 'red' : ''}"><div class="l">পাতা ছেড়ে গেছে</div><div class="v">${rows.reduce((x, r) => x + r.m.left, 0)}</div><div class="s">${rows.filter(r => r.m.left).length} জন ছাত্রের</div></div></div>
  <div class="tw">${rows.length ? `<table class="stack"><tr><th>ছাত্র</th><th class="num">চেষ্টা</th><th class="num">টেস্ট</th><th class="num">গড়</th><th class="num">সেরা</th><th class="num">পাতা ছেড়েছে</th><th>শেষ দিয়েছে</th></tr>
    ${rows.map(r => `<tr class="click" data-go="#/student/${r.sid}?t=mock"><td data-l="ছাত্র"><b>${esc(r.s ? studentName(r.s) : '—')}</b><div class="small muted">${esc(r.s ? r.s.admission_no + ' · ' + r.s.current_level : '')}</div></td><td class="num" data-l="চেষ্টা">${r.m.n}</td><td class="num" data-l="টেস্ট">${r.m.tests}</td><td class="num" data-l="গড়">${r.m.avg}%</td><td class="num" data-l="সেরা"><b>${r.m.best}%</b></td><td class="num" data-l="পাতা ছেড়েছে">${r.m.left ? `<b style="color:var(--red)">${r.m.left}</b>` : '0'}</td><td data-l="শেষ দিয়েছে">${fmtDT(r.m.last)}</td></tr>`).join('')}</table>` : '<div class="empty">এখনো কোনো ছাত্র অনলাইনে মক টেস্ট দেয়নি</div>'}</div>
  ${quiet.length ? `<details style="margin-top:12px"><summary class="small muted">যারা এখনো একবারও দেয়নি (${quiet.length} জন)</summary><p class="small">${quiet.map(s => esc(studentName(s))).join(' · ')}</p></details>` : ''}`;
}

function studentInviteMsg(s) {
  return `আসসালামু আলাইকুম ${s.name_bn || s.name_en}। ${S.settings.institute_bn}-এর ছাত্রদের সাইটে আপনার লেভেলের নোট, শিট, অডিও আর অনলাইন মক টেস্ট পাবেন।\n\n১. এই লিংক খুলুন: ${studentSiteUrl()}\n২. "নতুন অ্যাকাউন্ট" চেপে নিজের ইমেইল আর একটা পাসওয়ার্ড দিন।\n৩. ভর্তি নম্বর ${s.admission_no} আর ভর্তির সময় দেওয়া মোবাইল নম্বর লিখে "যুক্ত করুন" চাপুন।\n\nপুরো কোর্স ফি পরিশোধ হলে বইগুলো খুলে যাবে। কোনো সমস্যা হলে অফিসে জানান।`;
}
function studentSiteModal(s) {
  const why = studentAccess(s); const lv = studentLevels(s);
  const n = (S.materials || []).filter(m => m.published !== false && (m.level === 'all' || lv.includes(m.level))).length;
  openModal(`<h2>ছাত্রদের সাইট — ${esc(studentName(s))}</h2>
    <dl class="kv"><dt>লগইন</dt><dd>${s.auth_user_id ? '✓ ছাত্র নিজের লগইন যুক্ত করেছে' : 'এখনো যুক্ত করেনি'}</dd>
    <dt>বই দেখা</dt><dd>${why ? `🔒 বন্ধ — ${esc(ACCESS_WHY[why])}${why === 'due' ? ` (বকেয়া ${tk(dueOf(s))})` : ''}` : '✓ খোলা'}</dd>
    <dt>যে লেভেল দেখবে</dt><dd>${esc(lv.join(', ') || '—')} · ${n}টি উপকরণ</dd></dl>
    <p class="small muted">ছাত্র নিজের ইমেইল দিয়ে অ্যাকাউন্ট খুলে <b>ভর্তি নম্বর ${esc(s.admission_no)}</b> আর ভর্তির সময় দেওয়া মোবাইল নম্বর (ছাত্র বা অভিভাবকের) দিয়ে যুক্ত করবে। পুরো কোর্স ফি পরিশোধ হলে নিজে থেকেই বই খুলে যাবে।</p>
    <div class="row" style="gap:8px;flex-wrap:wrap">${waBtn(s.phone || s.guardian_phone, studentInviteMsg(s), 'নিয়ম WhatsApp-এ পাঠান')}<a class="btn ghost" href="${esc(studentSiteUrl())}" target="_blank" rel="noopener">সাইট খুলুন</a></div>
    <div class="row" style="justify-content:flex-end;margin-top:18px;gap:8px;flex-wrap:wrap">
      <button class="btn ghost" id="sblk" ${s.portal_blocked ? '' : 'style="color:var(--red)"'}>${s.portal_blocked ? 'অ্যাক্সেস আবার চালু করুন' : 'অ্যাক্সেস বন্ধ রাখুন'}</button>
      ${s.auth_user_id && isAdmin() ? '<button class="btn ghost" id="sunl" style="color:var(--red)">লগইন আলাদা করুন</button>' : ''}
      <button class="btn" id="scl">ঠিক আছে</button></div>`);
  $('#scl').onclick = closeModal;
  const save = async (patch, msg) => { try { putLocal('students', await API.update('students', s.id, patch)); toast(msg); studentSiteModal(byId(S.students, s.id)); } catch (e) { toast(errMsg(e), true); } };
  $('#sblk').onclick = () => save({ portal_blocked: !s.portal_blocked }, s.portal_blocked ? 'অ্যাক্সেস চালু হয়েছে' : 'অ্যাক্সেস বন্ধ করা হয়েছে');
  const un = $('#sunl'); if (un) un.onclick = async () => { closeModal(); if (!(await confirmBox('এই লগইন আর এই ছাত্রের সাথে যুক্ত থাকবে না। ছাত্র চাইলে আবার যুক্ত করতে পারবে (যেমন নতুন ইমেইল দিয়ে)।', 'হ্যাঁ, আলাদা করুন'))) return; save({ auth_user_id: null }, 'লগইন আলাদা করা হয়েছে'); };
}

function parentLinkModal(s) {
  const tok = s.parent_token; const link = tok ? parentLink(tok) : '';
  openModal(`<h2>অভিভাবকের লিংক — ${esc(studentName(s))}</h2>
    <p class="small muted">এই লিংক খুললে লগইন ছাড়াই শুধু এই ছাত্রের হাজিরা, ফি, রেজাল্ট আর জাপানের আবেদনের অবস্থা দেখা যায়। NID, পাসপোর্ট, ফোন নম্বর, ঠিকানা বা কাগজের ফাইল দেখা যায় না। লিংক শুধু অভিভাবককে দিন।</p>
    ${tok ? `<div class="card" style="padding:10px;margin:10px 0;word-break:break-all;font-size:13px" id="plk">${esc(link)}</div>
    <div class="row" style="gap:8px;flex-wrap:wrap">${waBtn(guardianPhone(s), parentMsg(s, link), 'WhatsApp-এ পাঠান')}<button class="btn ghost" id="pcp">কপি</button><a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener">খুলে দেখুন</a></div>
    <div class="row" style="justify-content:flex-end;margin-top:18px;gap:8px"><button class="btn ghost" id="pnew">নতুন লিংক (পুরোনোটা বন্ধ)</button><button class="btn ghost" id="poff" style="color:var(--red)">লিংক বন্ধ করুন</button><button class="btn" id="pcl">ঠিক আছে</button></div>`
    : `<div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px"><button class="btn ghost" id="pcl">বাতিল</button><button class="btn" id="pnew">লিংক তৈরি করুন</button></div>`}`);
  $('#pcl').onclick = closeModal;
  const save = async (val, msg) => { try { putLocal('students', await API.update('students', s.id, { parent_token: val })); toast(msg); parentLinkModal(byId(S.students, s.id)); } catch (e) { toast(errMsg(e), true); } };
  $('#pnew').onclick = () => save(newParentToken(), tok ? 'নতুন লিংক তৈরি হয়েছে, পুরোনোটা আর কাজ করবে না' : 'লিংক তৈরি হয়েছে');
  const off = $('#poff'); if (off) off.onclick = () => save(null, 'লিংক বন্ধ করা হয়েছে');
  const cp = $('#pcp'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(link); toast('লিংক কপি হয়েছে'); } catch { const r = document.createRange(); r.selectNodeContents($('#plk')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('লিংকটা সিলেক্ট করা হয়েছে, কপি করে নিন'); } };
}

function localParentView(tok) { // demo mode: same shape as the database function
  const read = (t) => Local.read(t); const s = read('students').find(x => x.parent_token && x.parent_token === tok); if (!s) return null;
  const st = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}') };
  const ss = new Map(read('sessions').map(x => [x.id, x])); const ex = new Map(read('exams').map(x => [x.id, x])); const sc = new Map(read('jp_schools').map(x => [x.id, x]));
  const by = (k) => (a, b) => String(b[k] || '').localeCompare(String(a[k] || ''));
  return {
    institute: { bn: st.institute_bn, en: st.institute_en, ja: st.institute_ja, phone: st.phone, whatsapp: st.whatsapp, address: st.address },
    student: s,
    payments: read('payments').filter(p => p.student_id === s.id).map(p => ({ paid_on: p.paid_on, receipt_no: p.receipt_no, amount: p.amount, method: p.method, purpose: p.purpose })).sort(by('paid_on')),
    attendance: read('attendance').filter(a => a.student_id === s.id && ss.has(a.session_id)).map(a => { const x = ss.get(a.session_id); return { date: x.class_date, level: x.level, hours: x.hours, topic: x.topic, status: a.status }; }).sort(by('date')),
    exams: read('exam_results').filter(r => r.student_id === s.id && ex.has(r.exam_id)).map(r => { const e = ex.get(r.exam_id); return { date: e.exam_date, title: e.title, type: e.type, level: e.level, max_marks: e.max_marks, pass_marks: e.pass_marks, marks: r.marks, absent: r.absent }; }).sort(by('date')),
    documents: read('documents').filter(d => d.student_id === s.id).map(d => ({ doc_type: d.doc_type, status: d.status, expires_on: d.expires_on })),
    applications: read('applications').filter(a => a.student_id === s.id && sc.has(a.school_id)).map(a => { const j = sc.get(a.school_id); return { school: j.name_ja || j.name_en, city: j.city, intake: a.intake, status: a.status, interview_on: a.interview_on, deadline_on: a.deadline_on }; }).sort(by('intake')),
    generated_at: new Date().toISOString()
  };
}

async function renderParent(tok) {
  document.title = 'অভিভাবকের পাতা · Sakura';
  const app = $('#app'); app.innerHTML = '<div class="boot">লোড হচ্ছে…</div>';
  let d = null;
  try { if (DEMO) d = localParentView(tok); else { const { data, error } = await sb.rpc('parent_view', { p_token: tok }); if (error) throw error; d = data; } }
  catch (e) { app.innerHTML = `<div class="login"><div class="card"><h1>সমস্যা হয়েছে</h1><p>${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">আবার চেষ্টা</button></div></div>`; return; }
  if (!d) { app.innerHTML = `<div class="login"><div class="card"><span class="kamon" style="width:56px;height:56px;display:grid;place-items:center;margin-bottom:10px">${KAMON}</span><h1>লিংকটি কাজ করছে না</h1><p>লিংকটি ভুল, অথবা প্রতিষ্ঠান থেকে বন্ধ করে নতুন লিংক দেওয়া হয়েছে। নতুন লিংকের জন্য অফিসে যোগাযোগ করুন।</p></div></div>`; return; }
  const I = d.institute || {}; const s = d.student || {};
  const net = Math.max(0, num(s.total_fee) - num(s.discount)); const paid = (d.payments || []).filter(p => p.purpose !== 'processing').reduce((a, p) => a + num(p.amount), 0); const due = Math.max(0, net - paid);
  const procPaid = (d.payments || []).filter(p => p.purpose === 'processing').reduce((a, p) => a + num(p.amount), 0); const procDue = Math.max(0, num(s.processing_fee) - procPaid);
  const att = d.attendance || []; const came = att.filter(a => a.status === 'present' || a.status === 'late').length; const pct = att.length ? Math.round(came * 100 / att.length) : null;
  const hours = att.filter(a => a.status === 'present' || a.status === 'late').reduce((a, x) => a + num(x.hours), 0);
  const exams = (d.exams || []).map(e => { const p = e.absent || e.marks == null || !num(e.max_marks) ? null : Math.round(num(e.marks) * 100 / num(e.max_marks)); const pm = e.pass_marks != null ? num(e.pass_marks) : Math.ceil(num(e.max_marks) * 0.6); return { ...e, p, ok: !e.absent && e.marks != null && num(e.marks) >= pm }; });
  const taken = exams.filter(e => e.p != null); const avg = taken.length ? Math.round(taken.reduce((a, e) => a + e.p, 0) / taken.length) : null;
  const stageIdx = JSTAGES.findIndex(([k]) => k === (s.japan_stage || 'none'));
  const docs = new Map((d.documents || []).map(x => [x.doc_type, x])); const docsDone = DOC_TYPES.filter(([k]) => docs.get(k) && docs.get(k).status !== 'missing').length;
  const wa = waNum(I.whatsapp || I.phone);
  app.innerHTML = `<div class="parent">
  <div class="phd"><span class="kamon">${KAMON}</span><div><b>${esc(I.en || '')}</b><small>${esc(I.bn || '')} · ${esc(I.ja || '')}</small></div></div>
  <div class="card" style="margin-bottom:14px"><div class="small muted">অভিভাবকের পাতা</div><h1 style="margin:2px 0">${esc(s.name_bn || s.name_en || '')}</h1><div class="muted">${esc(s.name_en || '')} · ভর্তি নং ${esc(s.admission_no || '')}</div>
    <div class="row" style="margin-top:8px;gap:6px">${badge(s.status, STATUS[s.status] || s.status || '')}<span class="b completed">${esc(s.current_level || '')} · ${esc(BATCH[s.batch] || '')}</span>${s.start_date ? `<span class="b completed">ক্লাস শুরু ${fmtD(s.start_date)}</span>` : ''}</div></div>
  <div class="grid g4" style="margin-bottom:14px">
    <div class="card stat ${pct != null && pct < 80 ? 'red' : 'green'}"><div class="l">উপস্থিতি</div><div class="v">${pct == null ? '—' : pct + '%'}</div><div class="s">${came} / ${att.length} ক্লাস · ${hours} ঘণ্টা</div></div>
    <div class="card stat ${due ? 'red' : 'green'}"><div class="l">বকেয়া ফি</div><div class="v">${tk(due)}</div><div class="s">${due && s.next_due_date ? 'পরের কিস্তি ' + fmtD(s.next_due_date) : `মোট ${tk(net)}, দেওয়া ${tk(paid)}`}</div></div>
    <div class="card stat ${avg != null && avg < 60 ? 'red' : ''}"><div class="l">পরীক্ষার গড়</div><div class="v">${avg == null ? '—' : avg + '%'}</div><div class="s">${taken.length}টি পরীক্ষা</div></div>
    <div class="card stat"><div class="l">জাপান প্রসেস</div><div class="v" style="font-size:19px">${esc((JSTAGES[stageIdx] || JSTAGES[0])[1])}</div><div class="s">${esc(s.target_school || '')}${s.intake ? ' · ' + esc(intakeLabel(s.intake)) : ''}</div></div>
  </div>
  ${pct != null && pct < 80 ? '<div class="alertbar red" style="margin-bottom:14px"><b>উপস্থিতি ৮০%-এর কম</b><span>জাপানে পড়তে যাওয়ার আবেদনের জন্য অন্তত ৮০% উপস্থিতি দরকার। নিয়মিত ক্লাসে পাঠান।</span></div>' : ''}
  <div class="card" style="margin-bottom:14px"><h2>সাম্প্রতিক হাজিরা</h2>${att.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>পাঠ</th><th>হাজিরা</th></tr>${att.slice(0, 15).map(a => `<tr><td>${fmtD(a.date)}</td><td>${esc(a.topic || a.level || '—')}</td><td>${badge(a.status === 'present' ? 'active' : a.status === 'late' ? 'trial' : a.status === 'leave' ? 'completed' : 'due', ATT[a.status] || a.status)}</td></tr>`).join('')}</table></div>${att.length > 15 ? `<p class="small muted">সর্বশেষ ১৫টি ক্লাস দেখানো হচ্ছে (মোট ${att.length}টি)।</p>` : ''}` : '<div class="empty">এখনো হাজিরা নেওয়া হয়নি</div>'}</div>
  <div class="card" style="margin-bottom:14px"><h2>পরীক্ষার রেজাল্ট</h2>${exams.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>পরীক্ষা</th><th class="num">নম্বর</th><th>ফল</th></tr>${exams.map(e => `<tr><td>${fmtD(e.date)}</td><td>${esc(e.title)}<div class="small muted">${esc(EXAM_TYPE[e.type] || '')}</div></td><td class="num">${e.absent ? '—' : `${num(e.marks)} / ${num(e.max_marks)}`}${e.p != null ? `<div class="small muted">${e.p}%</div>` : ''}</td><td>${e.absent ? badge('dropped', 'অনুপস্থিত') : e.ok ? badge('active', 'পাস') : badge('due', 'পাস করেনি')}</td></tr>`).join('')}</table></div>` : '<div class="empty">এখনো কোনো পরীক্ষা হয়নি</div>'}</div>
  <div class="card" style="margin-bottom:14px"><h2>ফি পরিশোধ</h2><dl class="kv"><dt>মোট ফি</dt><dd>${tk(s.total_fee)}${num(s.discount) ? ` (ছাড় ${tk(s.discount)})` : ''}</dd><dt>দেওয়া হয়েছে</dt><dd>${tk(paid)}</dd><dt>বকেয়া</dt><dd><b style="color:${due ? 'var(--red)' : 'var(--green)'}">${tk(due)}</b></dd>${num(s.processing_fee) || procPaid ? `<dt>জাপান প্রসেসিং ফি</dt><dd>${tk(s.processing_fee)} · দেওয়া ${tk(procPaid)} · <b style="color:${procDue ? 'var(--red)' : 'var(--green)'}">বাকি ${tk(procDue)}</b></dd>` : ''}</dl>
    ${(d.payments || []).length ? `<div class="tw" style="margin-top:10px"><table><tr><th>তারিখ</th><th>রশিদ নং</th><th class="num">টাকা</th></tr>${d.payments.map(p => `<tr><td>${fmtD(p.paid_on)}</td><td>${esc(p.receipt_no)}<div class="small muted">${esc(PURPOSE[p.purpose] || '')} · ${esc(METHOD[p.method] || '')}</div></td><td class="num">${tk(p.amount)}</td></tr>`).join('')}</table></div>` : ''}</div>
  ${stageIdx > 0 || (d.applications || []).length ? `<div class="card" style="margin-bottom:14px"><h2>জাপানে পড়তে যাওয়ার অবস্থা</h2><div class="steps">${JSTAGES.slice(1).map(([k, l], i) => `<span class="${i + 1 < stageIdx ? 'done' : i + 1 === stageIdx ? 'cur' : ''}">${i + 1}. ${l}</span>`).join('')}</div>
    ${(d.applications || []).length ? `<div class="tw" style="margin-top:12px"><table><tr><th>স্কুল</th><th>সেশন</th><th>অবস্থা</th></tr>${d.applications.map(a => `<tr><td>${esc(a.school)}<div class="small muted">${esc(a.city || '')}</div></td><td>${esc(intakeLabel(a.intake))}</td><td>${badge(APP_CLS[a.status], APP_ST[a.status] || a.status)}${a.interview_on && ['submitted', 'interview'].includes(a.status) ? `<div class="small muted">ইন্টারভিউ ${fmtD(a.interview_on)}</div>` : ''}</td></tr>`).join('')}</table></div>` : ''}
    <p class="small" style="margin:12px 0 4px"><b>${docsDone} / ${DOC_TYPES.length}</b> কাগজ জমা হয়েছে</p><div class="pdocs">${DOC_TYPES.map(([k, l]) => { const x = docs.get(k); const ok = x && x.status !== 'missing'; return `<span class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${l}</span>`; }).join('')}</div></div>` : ''}
  <div class="card" style="text-align:center"><p style="margin:0 0 10px">কোনো প্রশ্ন থাকলে যোগাযোগ করুন</p><div class="row" style="justify-content:center;gap:8px">${wa ? `<a class="btn wa" href="https://wa.me/${wa}?text=${encodeURIComponent(`আসসালামু আলাইকুম। আমি ${s.name_bn || s.name_en} (${s.admission_no})-এর অভিভাবক।`)}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>` : ''}${I.phone ? `<a class="btn ghost" href="tel:${esc(String(I.phone).replace(/[^\d+]/g, ''))}">ফোন ${esc(I.phone)}</a>` : ''}</div>${I.address ? `<p class="small muted" style="margin:10px 0 0">${esc(I.address)}</p>` : ''}</div>
  <p class="small muted" style="text-align:center;margin:14px 0 30px">তথ্য ${fmtDT(d.generated_at)}-এর · এই লিংক কাউকে দেবেন না</p></div>`;
}

// ------------------------------------------------------------------ install as an app (PWA)
let _installEvt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _installEvt = e; });
window.addEventListener('appinstalled', () => { _installEvt = null; toast('ইনস্টল হয়েছে — হোম স্ক্রিনে "সাকুরা" আইকন দেখুন'); });
async function installApp() {
  if (_installEvt) { _installEvt.prompt(); const r = await _installEvt.userChoice.catch(() => null); _installEvt = null; if (r && r.outcome === 'accepted') return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openModal(`<h2>ফোনে অ্যাপের মতো রাখুন</h2>${ios ? `<p><b>iPhone (Safari):</b></p><ol><li>নিচের <b>Share</b> বোতাম (□↑) চাপুন</li><li><b>Add to Home Screen</b> চাপুন</li><li>ডানে উপরে <b>Add</b> চাপুন</li></ol>` : `<p><b>Android (Chrome):</b></p><ol><li>ডানে উপরে <b>⋮</b> চাপুন</li><li><b>Install app</b> বা <b>Add to Home screen</b> চাপুন</li><li><b>Install</b> চাপুন</li></ol><p><b>কম্পিউটার (Chrome/Edge):</b> ঠিকানার ঘরের ডান পাশে ইনস্টল আইকন (⊕) চাপুন।</p>`}<p class="small muted">এরপর হোম স্ক্রিনে "সাকুরা" আইকন থাকবে, চাপলেই পোর্টাল পুরো স্ক্রিনে খুলবে। লগইন একবার করলেই হবে।</p><div class="row" style="justify-content:flex-end"><button class="btn" id="ic">ঠিক আছে</button></div>`);
  $('#ic').onclick = closeModal;
}
// ---- birth dates: day / month / year lists instead of the calendar, so the year is quick to choose
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
function enhanceDob(inp) {
  if (inp.dataset.dobx) return; inp.dataset.dobx = '1'; inp.style.display = 'none';
  const y0 = new Date().getFullYear(); const [vy, vm, vd] = (inp.value || '').split('-');
  const w = document.createElement('span'); w.className = 'dobx';
  w.innerHTML = `<select aria-label="দিন"><option value="">দিন</option>${Array.from({ length: 31 }, (_, i) => `<option value="${String(i + 1).padStart(2, '0')}">${i + 1}</option>`).join('')}</select>`
    + `<select aria-label="মাস"><option value="">মাস</option>${BN_MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('')}</select>`
    + `<select aria-label="বছর"><option value="">বছর</option>${Array.from({ length: 81 }, (_, i) => y0 - 3 - i).map(y => `<option>${y}</option>`).join('')}</select>`;
  const [sd, sm, sy] = w.querySelectorAll('select');
  if (vy) { if (![...sy.options].some(o => o.value === vy)) sy.add(new Option(vy, vy), 1); sy.value = vy; sm.value = vm || ''; sd.value = (vd || '').slice(0, 2); }
  if (inp.disabled || inp.readOnly) [sd, sm, sy].forEach(x => { x.disabled = true; });
  const sync = () => { let v = '';
    if (sd.value && sm.value && sy.value) { const last = new Date(Number(sy.value), Number(sm.value), 0).getDate(); if (Number(sd.value) > last) sd.value = String(last).padStart(2, '0'); v = `${sy.value}-${sm.value}-${sd.value}`; }
    if (inp.value !== v) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); } };
  [sd, sm, sy].forEach(x => x.addEventListener('change', sync));
  inp.after(w);
}
const DOB_SEL = 'input[type=date][name=dob], input[type=date][data-k=dob], input[type=date][data-sp=dob]';
new MutationObserver(() => document.querySelectorAll(DOB_SEL).forEach(enhanceDob)).observe(document.documentElement, { childList: true, subtree: true });

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {   // a new version took over: load it once so the newest screens show
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!window.__swReloaded) { window.__swReloaded = true; location.reload(); } });
}

// ------------------------------------------------------------------ full backup (ZIP with data, spreadsheets and uploaded files)
let _zipLib = null;
function loadZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (_zipLib) return _zipLib;
  _zipLib = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; sc.onload = () => res(window.JSZip); sc.onerror = () => { _zipLib = null; rej(new Error('ZIP তৈরির ফাইল লোড হয়নি — ইন্টারনেট দেখে আবার চেষ্টা করুন')); }; document.head.appendChild(sc); });
  return _zipLib;
}
async function fullBackup() {
  if (!isAdmin()) return toast('শুধু অ্যাডমিন ব্যাকআপ নিতে পারেন', true);
  openModal('<h2>ব্যাকআপ তৈরি হচ্ছে…</h2><p id="bkp">তথ্য আনা হচ্ছে…</p><div class="bar" style="width:100%"><i id="bkb" style="width:3%"></i></div><p class="small muted">বন্ধ করবেন না। কাগজ বেশি থাকলে কয়েক মিনিট লাগতে পারে।</p>');
  const step = (t, pct) => { const p = $('#bkp'), b = $('#bkb'); if (p) p.textContent = t; if (b) b.style.width = pct + '%'; };
  try {
    const Zip = await loadZip(); await loadAll(); const zip = new Zip(); const now = new Date(); const stamp = `${todayISO()}_${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}`;
    let audit = []; try { audit = (await API.auditList({ from: '2020-01-01', to: todayISO(), limit: 20000 })).rows; } catch { /* log table may not exist */ }
    const data = { exported_at: now.toISOString(), app: 'Sakura Portal', settings: S.settings, profiles: S.profiles, ...Object.fromEntries(TABLES.map(t => [t, S[t]])), audit_log: audit };
    zip.file('data/sakura-backup.json', JSON.stringify(data, null, 1));
    step('Excel ফাইল তৈরি হচ্ছে…', 10);
    for (const t of [...TABLES, 'audit_log']) { const rows = t === 'audit_log' ? audit : S[t]; if (!rows || !rows.length) continue; const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]; zip.file(`excel/${t}.csv`, csvText([cols, ...rows.map(r => cols.map(c => r[c]))])); }
    const docs = S.documents.filter(d => d.file_path); const photos = []; let ok = 0, fail = 0;
    for (const [i, d] of docs.entries()) {
      step(`কাগজ নামানো হচ্ছে ${i + 1} / ${docs.length}…`, 12 + Math.round((i / Math.max(1, docs.length)) * 78));
      const s = byId(S.students, d.student_id) || {}; const folder = `${s.admission_no || 'unknown'}-${(s.name_en || s.name_bn || '').replace(/[^\w\u0980-\u09FF -]/g, '').trim().slice(0, 40)}`;
      const ext = (d.file_path.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5);
      try { const u = await API.fileUrl(d.file_path); const r = await fetch(u); if (!r.ok) throw new Error(r.status); zip.file(`files/${folder}/${d.doc_type}.${ext}`, await r.blob()); ok++; } catch { fail++; photos.push(d.file_path); }
    }
    zip.file('README.txt', `Sakura Portal backup — ${now.toISOString()}\n\nডেটা: data/sakura-backup.json (পুরো তথ্য, পোর্টালে ফেরত আনার জন্য)\nExcel: excel/*.csv (Excel বা Google Sheets-এ খোলা যায়)\nকাগজপত্র: files/<ভর্তি নং-নাম>/ (${ok}টি ফাইল)${fail ? `\nনামানো যায়নি: ${fail}টি — ${photos.join(', ')}` : ''}\n\nএই ফাইলে ছাত্রদের NID, পাসপোর্ট আর ব্যাংকের কাগজ আছে — নিরাপদ জায়গায় রাখুন, কাউকে দেবেন না।\n`);
    step('ZIP ফাইল বানানো হচ্ছে…', 92);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sakura-backup-${stamp}.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    const st = { ...S.settings, last_backup_at: now.toISOString() }; try { await API.saveSettings(st); S.settings = st; } catch { /* still downloaded */ }
    step('হয়ে গেছে', 100);
    openModal(`<h2>ব্যাকআপ তৈরি হয়েছে</h2><p><b>sakura-backup-${stamp}.zip</b> নামে ফাইল ডাউনলোড হয়েছে (${(blob.size / 1048576).toFixed(1)} MB)।</p><ul><li>তথ্য: ${S.students.length} জন ছাত্র, ${S.payments.length}টি টাকা জমা, ${S.attendance.length}টি হাজিরা</li><li>কাগজ ও ছবি: ${ok}টি${fail ? ` <span style="color:var(--red)">(${fail}টি নামানো যায়নি)</span>` : ''}</li></ul><p class="small muted">ফাইলটা ল্যাপটপের একটা ফোল্ডারে আর Google Drive-এ রাখুন। এতে ছাত্রদের NID আর পাসপোর্ট আছে, তাই কাউকে পাঠাবেন না।</p><div class="row" style="justify-content:flex-end"><button class="btn" id="bkc">ঠিক আছে</button></div>`);
    $('#bkc').onclick = () => { closeModal(); render(); };
  } catch (e) { closeModal(); toast(errMsg(e), true); }
}

boot().catch(e => { $('#app').innerHTML = `<div class="boot">${esc(errMsg(e))}</div>`; });
})();
