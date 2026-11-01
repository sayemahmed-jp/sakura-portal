/* Sakura Japanese Institute · Student & accounts portal
   Plain JavaScript, no build step. Works in DEMO mode (browser storage)
   or with Supabase (see config.js and supabase-schema.sql). */
(() => {
'use strict';

// ------------------------------------------------------------------ config
const CFG = window.SAKURA_CONFIG || {};
const DEMO = !(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
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
const isAdmin = () => S.profile && S.profile.role === 'admin';

// ------------------------------------------------------------------ helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
function csvDownload(name, rows) {
  const csv = '﻿' + rows.map(r => r.map(c => {
    const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');
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
const TABLES = ['students', 'payments', 'sessions', 'attendance', 'documents', 'expenses', 'inquiries', 'exams', 'exam_results', 'jp_schools', 'applications', 'teachers', 'commissions'];
const OPTIONAL_TABLES = ['expenses', 'inquiries', 'exams', 'exam_results', 'jp_schools', 'applications', 'teachers', 'commissions'];
const Local = {
  key: (t) => 'sakura_demo_' + t,
  read(t) { try { return JSON.parse(localStorage.getItem(this.key(t)) || '[]'); } catch { return []; } },
  write(t, rows) { try { localStorage.setItem(this.key(t), JSON.stringify(rows)); } catch { toast('ব্রাউজারে জায়গা শেষ — ডেমো ফাইল ছোট রাখুন', true); } },
  async fetchAll(t) { return this.read(t); },
  unique: { applications: [['student_id', 'school_id', 'intake']], exam_results: [['exam_id', 'student_id']], students: [['admission_no']], payments: [['receipt_no']], sessions: [['class_date', 'level', 'batch']], attendance: [['session_id', 'student_id']], documents: [['student_id', 'doc_type']] },
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
  async update(t, id, patch) { const { data, error } = await sb.from(t).update(patch).eq('id', id).select().single(); if (error) throw error; return data; },
  async remove(t, id) { const { error } = await sb.from(t).delete().eq('id', id); if (error) throw error; },
  async upsertResults(rows) { const { data, error } = await sb.from('exam_results').upsert(rows, { onConflict: 'exam_id,student_id' }).select(); if (error) throw error; return data; },
  async upsertAttendance(rows) { const { data, error } = await sb.from('attendance').upsert(rows, { onConflict: 'session_id,student_id' }).select(); if (error) throw error; return data; },
  async upload(path, file) { const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined }); if (error) throw error; return path; },
  async fileUrl(path) { const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; },
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

async function loadAll() {
  const [settings, profiles, ...rest] = await Promise.all([API.getSettings(), API.profiles(), ...TABLES.map(t => API.fetchAll(t).catch(e => { if (OPTIONAL_TABLES.includes(t)) { console.warn('Table not ready: ' + t, e); return []; } throw e; }))]);
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

// ------------------------------------------------------------------ auth
async function boot() {
  const pm = location.hash.match(/^#\/p\/([A-Za-z0-9_-]{24,})/);
  if (pm) return renderParent(pm[1]);
  if (DEMO) { renderLogin(); return; }
  const { data } = await sb.auth.getSession();
  if (data.session) await afterLogin(data.session.user); else renderLogin();
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.user = null; S.profile = null; S.loaded = false; renderLogin(); } });
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
        $('#app').innerHTML = `<div class="login"><div class="card"><h1>অনুমতি নেই</h1><p>আপনার লগইন (${esc(user.email)}) এখনও স্টাফ হিসেবে যোগ করা হয়নি। ডিরেক্টরকে বলুন আপনাকে যোগ করতে।</p><button class="btn" id="lo">লগআউট</button></div></div>`;
        $('#lo').onclick = () => sb.auth.signOut(); return;
      }
      S.profile = data;
    }
    await loadAll();
    if (!location.hash || location.hash === '#') location.hash = '#/';
    render();
  } catch (e) { $('#app').innerHTML = `<div class="login"><div class="card"><h1>সমস্যা হয়েছে</h1><p>${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">আবার চেষ্টা</button></div></div>`; }
}
function renderLogin() {
  $('#app').innerHTML = `<div class="login"><form class="card" id="lf" autocomplete="on">
    <div class="kamon" style="width:56px;height:56px">${KAMON}</div>
    <h1>সাকুরা পোর্টাল</h1><p class="muted" style="margin:0 0 16px">শুধু ইনস্টিটিউটের স্টাফদের জন্য</p>
    ${DEMO ? `<div class="demo-bar">ডেমো মোড: এখনো ডেটাবেস যুক্ত হয়নি। তথ্য শুধু এই ব্রাউজারে থাকবে।</div>
      <button class="btn" type="submit" style="width:100%;justify-content:center">ডেমো মোডে ঢুকুন</button>` :
      `<label class="f">ইমেইল<input name="email" type="email" required autocomplete="username"></label>
      <label class="f" style="margin-top:10px">পাসওয়ার্ড<input name="password" type="password" required autocomplete="current-password"></label>
      <button class="btn" type="submit" style="width:100%;justify-content:center;margin-top:16px">লগইন</button>`}
  </form></div>`;
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
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M1 21c0-4 4-7 8-7s8 3 8 7"/><path d="M17 4a4 4 0 0 1 0 8M23 21c0-3-2-5-5-6"/>',
  money: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/><path d="M6 10v5M18 10v5"/>',
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
const NAV = [['#/', 'ড্যাশবোর্ড', 'home'], ['#/alerts', 'সতর্কতা', 'bell'], ['#/students', 'ছাত্র-ছাত্রী', 'users'], ['#/leads', 'আগ্রহী ছাত্র', 'chat'], ['#/payments', 'ফি ও হিসাব', 'money'], ['#/expenses', 'খরচ ও লাভ', 'wallet'], ['#/attendance', 'হাজিরা', 'check'], ['#/teachers', 'শিক্ষক ও বেতন', 'teacher'], ['#/exams', 'পরীক্ষা ও রেজাল্ট', 'pen'], ['#/japan', 'জাপান আবেদন', 'plane'], ['#/reports', 'রিপোর্ট', 'chart'], ['#/audit', 'কাজের রেকর্ড', 'log'], ['#/settings', 'সেটিংস', 'gear']];
function shell(active, inner) {
  return `<div class="mtop"><button id="mnav" aria-label="মেনু">☰</button><b>সাকুরা পোর্টাল</b>${computeAlerts().length ? `<a class="nb ${computeAlerts().some(a => a.level === 'red') ? 'red' : ''}" href="#/alerts" style="margin-left:auto">${computeAlerts().length} সতর্কতা</a>` : ''}</div>
  <div class="shell"><aside class="side" id="side">
    <div class="brand"><span class="kamon">${KAMON}</span><div><b>Sakura Portal</b><small>さくら日本語学院</small></div></div>
    <nav class="nav">${(() => { const al = computeAlerts(); const red = al.filter(a => a.level === 'red').length; return NAV.filter(([h]) => h !== '#/audit' || isAdmin()).map(([h, l, i]) => `<a href="${h}" class="${active === h ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[i]}</svg>${l}${h === '#/alerts' && al.length ? `<span class="nb ${red ? 'red' : ''}">${al.length}</span>` : ''}</a>`).join(''); })()}</nav>
    <div class="who">${esc(S.profile.name || S.user.email)}<br><span style="color:#E2C987">${isAdmin() ? 'অ্যাডমিন' : 'স্টাফ'}</span><br><button id="logout">${DEMO ? 'বের হন' : 'লগআউট'}</button></div>
  </aside><main class="main">${DEMO ? '<div class="demo-bar">ডেমো মোড: তথ্য শুধু এই ব্রাউজারে আছে। আসল ব্যবহারের আগে Supabase যুক্ত করুন (README দেখুন)।</div>' : ''}${inner}</main></div>`;
}
function mount(active, inner, after) {
  $('#app').innerHTML = shell(active, inner);
  $('#logout').onclick = () => { if (DEMO) { S.loaded = false; renderLogin(); } else sb.auth.signOut(); };
  $('#mnav').onclick = () => $('#side').classList.toggle('open');
  if (after) after();
}
function render() {
  if (!S.loaded) return;
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, query] = h.split('?'); const q = new URLSearchParams(query || '');
  const p = path.split('/').filter(Boolean);
  window.scrollTo(0, 0);
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
  if (p[0] === 'audit') return viewAudit(q);
  if (p[0] === 'alerts') return viewAlerts(q);
  if (p[0] === 'teachers') return viewTeachers(q);
  if (p[0] === 'teacher') return viewTeacher(p[1], q);
  if (p[0] === 'japan') return viewJapan(q);
  if (p[0] === 'school') return viewSchool(p[1]);
  if (p[0] === 'reports') return viewReports();
  if (p[0] === 'settings') return viewSettings();
  return viewDashboard();
}
window.addEventListener('hashchange', render);

// ------------------------------------------------------------------ dashboard
function viewDashboard() {
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
  const jpSoon = S.applications.filter(a => appOpen(a) && appNext(a) && appNext(a)[0] <= isoPlus(21)).sort((a, b) => appNext(a)[0].localeCompare(appNext(b)[0]));
  const expByCat = {}; S.expenses.filter(e => (e.spent_on || '').startsWith(m)).forEach(e => { expByCat[e.category] = (expByCat[e.category] || 0) + num(e.amount); });
  mount('#/', `
  <div class="top"><div><h1>ড্যাশবোর্ড</h1><p>আজ ${fmtD(today)}</p></div>
    <div class="row no-print"><a class="btn" href="#/students/new">+ নতুন ছাত্র</a><button class="btn gold" id="qp">+ টাকা জমা</button><a class="btn ghost" href="#/attendance">আজকের হাজিরা</a></div></div>
  ${(() => { const al = computeAlerts(); const red = al.filter(a => a.level === 'red'); if (!al.length) return ''; return `<a class="alertbar ${red.length ? 'red' : ''}" href="#/alerts"><b>${red.length ? red.length + 'টি জরুরি সতর্কতা' : al.length + 'টি সতর্কতা'}</b><span>${esc(al.slice(0, 2).map(a => { const t = studentName(byId(S.students, a.sid)) + ': ' + a.what + ' — ' + a.issue; return t.length > 110 ? t.slice(0, 108) + '…' : t; }).join(' · '))}${al.length > 2 ? ` · আরও ${al.length - 2}টি` : ''}</span><span class="go">দেখুন →</span></a>`; })()}
  <div class="grid g4">
    <div class="card stat"><div class="l">চলমান ছাত্র-ছাত্রী</div><div class="v">${current.length}</div><div class="s">মোট ভর্তি ${S.students.length} জন</div></div>
    <div class="card stat green"><div class="l">এ মাসের আয়</div><div class="v">${tk(monthIncome)}</div><div class="s">খরচ ${tk(monthExp)} · <b style="color:${profit < 0 ? 'var(--red)' : 'var(--green)'}">${profit < 0 ? 'ক্ষতি' : 'লাভ'} ${tk(Math.abs(profit))}</b></div></div>
    <div class="card stat red"><div class="l">মোট বকেয়া</div><div class="v">${tk(totalDue)}</div><div class="s">${dues.length} জনের কাছে</div></div>
    <div class="card stat"><div class="l">আজকের উপস্থিতি</div><div class="v">${todayRecs.length ? todayCame + ' / ' + todayRecs.length : '—'}</div><div class="s">${todaySessions.length ? todaySessions.length + 'টি ক্লাস' : 'আজ হাজিরা নেওয়া হয়নি'}</div></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>বকেয়া ফি</h2>${dues.length ? `<div class="tw"><table><tr><th>ছাত্র</th><th class="num">বকেয়া</th><th>পরের কিস্তি</th><th></th></tr>${dues.slice(0, 8).map(({ s, due }) => `<tr class="click" data-go="#/student/${s.id}?t=fees"><td>${esc(studentName(s))}<div class="small muted">${esc(s.admission_no)}</div></td><td class="num">${tk(due)}</td><td>${s.next_due_date ? (s.next_due_date < today ? badge('due', fmtD(s.next_due_date) + ' পার হয়েছে') : fmtD(s.next_due_date)) : '<span class="muted">—</span>'}</td><td class="num">${waBtn(guardianPhone(s), dueMsg(s), '')}</td></tr>`).join('')}</table></div>` : '<div class="empty">কোনো বকেয়া নেই</div>'}</div>
    <div class="card"><h2>উপস্থিতি ৮০%-এর নিচে</h2>${low.length ? `<div class="tw"><table><tr><th>ছাত্র</th><th>লেভেল</th><th>উপস্থিতি</th><th></th></tr>${low.slice(0, 8).map(({ s, a }) => `<tr class="click" data-go="#/student/${s.id}?t=att"><td>${esc(studentName(s))}<div class="small muted">${esc(s.guardian_phone || s.phone)}</div></td><td>${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</td><td>${bar(a.pct)}</td><td class="num">${waBtn(guardianPhone(s), absentMsg(s, lastAbsent(s.id), a), '')}</td></tr>`).join('')}</table></div><p class="small muted">স্টাডি-আওয়ার সার্টিফিকেটের জন্য ৮০% উপস্থিতি লাগে। অভিভাবকের সাথে কথা বলুন।</p>` : '<div class="empty">সবার উপস্থিতি ঠিক আছে</div>'}</div>
    <div class="card"><h2>সাম্প্রতিক জমা</h2>${recent.length ? `<div class="tw"><table><tr><th>তারিখ</th><th>ছাত্র</th><th class="num">টাকা</th></tr>${recent.map(p => { const s = byId(S.students, p.student_id); return `<tr class="click" data-go="#/student/${p.student_id}?t=fees"><td>${fmtD(p.paid_on)}</td><td>${esc(studentName(s))}</td><td class="num">${tk(p.amount)}</td></tr>`; }).join('')}</table></div>` : '<div class="empty">এখনো কোনো জমা নেই</div>'}</div>
    <div class="card"><h2>ব্যাচ অনুযায়ী ছাত্র</h2><div class="tw"><table><tr><th>লেভেল</th><th>${BATCH.morning}</th><th>${BATCH.evening}</th></tr>${LEVELS.map(l => `<tr><td><b>${l}</b></td><td>${groups[l + '|morning'] || 0} জন</td><td>${groups[l + '|evening'] || 0} জন</td></tr>`).join('')}</table></div></div>
    <div class="card"><h2>আজকের ফলো-আপ</h2>${follow.length ? `<div class="tw"><table><tr><th>নাম</th><th>অবস্থা</th><th>তারিখ</th><th></th></tr>${follow.slice(0, 8).map(l => `<tr class="click" data-go="#/leads"><td>${esc(l.name)}<div class="small muted">${esc(l.phone)}</div></td><td>${badge(LEAD_ST_CLS[l.status], LEAD_ST[l.status])}</td><td>${l.next_follow_up < today ? badge('due', fmtD(l.next_follow_up)) : 'আজ'}</td><td class="num">${waBtn(l.phone, leadMsg(l), '')}</td></tr>`).join('')}</table></div>` : '<div class="empty">আজ কাউকে ফোন করার নেই</div>'}</div>
    <div class="card"><h2>জাপান আবেদন: সামনের তারিখ</h2>${jpSoon.length ? `<div class="tw"><table><tr><th>ছাত্র</th><th>স্কুল</th><th>তারিখ</th></tr>${jpSoon.slice(0, 8).map(a => `<tr class="click" data-go="#/student/${a.student_id}?t=japan"><td>${esc(studentName(byId(S.students, a.student_id)))}</td><td>${esc(schoolName(byId(S.jp_schools, a.school_id)))}</td><td>${nextCell(a)}</td></tr>`).join('')}</table></div>` : '<div class="empty">সামনের ৩ সপ্তাহে কোনো তারিখ নেই</div>'}</div>
    <div class="card"><h2>এ মাসের খরচ</h2>${Object.keys(expByCat).length ? `<div class="tw"><table><tr><th>খাত</th><th class="num">টাকা</th></tr>${Object.entries(expByCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr class="click" data-go="#/expenses"><td>${esc(EXP_CAT[k] || k)}</td><td class="num">${tk(v)}</td></tr>`).join('')}</table></div>` : '<div class="empty">এ মাসে কোনো খরচ লেখা হয়নি</div>'}</div>
  </div>`, () => { $('#qp').onclick = () => paymentModal(null); bindGo(); });
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
  <div class="top"><div><h1>ছাত্র-ছাত্রী</h1><p>${list.length} জন দেখানো হচ্ছে</p></div><div class="row">${list.length ? `<button class="btn ghost" id="idall">আইডি কার্ড প্রিন্ট (${list.length} জন)</button>` : ''}<a class="btn" href="#/students/new">+ নতুন ছাত্র</a></div></div>
  <form class="row card" id="flt" style="padding:12px;margin-bottom:14px">
    <input class="search" name="s" placeholder="নাম, ভর্তি নম্বর বা ফোন দিয়ে খুঁজুন" value="${esc(f.s)}">
    <select name="l"><option value="">সব লেভেল</option>${LEVELS.map(l => `<option ${f.l === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select name="b"><option value="">সব ব্যাচ</option>${Object.entries(BATCH).map(([k, v]) => `<option value="${k}" ${f.b === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <select name="st"><option value="current" ${f.st === 'current' ? 'selected' : ''}>চলমান + ট্রায়াল</option><option value="all" ${f.st === 'all' ? 'selected' : ''}>সবাই</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${f.st === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="btn ghost">খুঁজুন</button></form>
  <div class="tw">${list.length ? `<table class="stack"><tr><th>ভর্তি নং</th><th>নাম</th><th>লেভেল · ব্যাচ</th><th class="hide-m">ফোন</th><th>অবস্থা</th><th class="num">বকেয়া</th><th class="hide-m">উপস্থিতি</th></tr>
    ${list.map(s => { const due = dueOf(s); const a = attOf(s.id, smap); return `<tr class="click" data-go="#/student/${s.id}"><td class="mt" data-l=""><span><b>${esc(s.name_bn || s.name_en || '')}</b><span class="small muted"> · ${esc(s.admission_no)}</span></span></td><td class="dm">${esc(s.admission_no)}</td><td class="dm"><b>${esc(s.name_bn || '')}</b><div class="small muted">${esc(s.name_en || '')}</div></td><td data-l="লেভেল · ব্যাচ">${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</td><td class="hide-m">${esc(s.phone)}</td><td data-l="অবস্থা">${badge(s.status, STATUS[s.status] || s.status)}</td><td class="num" data-l="বকেয়া">${due ? `<span style="color:var(--red);font-weight:600">${tk(due)}</span>` : badge('paid', 'পরিশোধিত')}</td><td data-l="উপস্থিতি">${bar(a.pct)}</td></tr>`; }).join('')}</table>` : '<div class="empty">কোনো ছাত্র পাওয়া যায়নি</div>'}</div>`,
  () => {
    $('#flt').onsubmit = (e) => { e.preventDefault(); const d = formData(e.target); const p = new URLSearchParams(Object.entries(d).filter(([, v]) => v)); location.hash = '#/students?' + p; };
    $$('#flt select').forEach(sel => sel.onchange = () => $('#flt').requestSubmit());
    const ia = $('#idall'); if (ia) ia.onclick = () => printIdCards([...list].sort((a, b) => (a.admission_no || '').localeCompare(b.admission_no || '')));
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
    ${inp('total_fee', 'মোট ফি (৳)', 'number', 'min="0" step="1" required')}${inp('discount', 'ছাড় (৳)', 'number', 'min="0" step="1"')}${inp('processing_fee', 'জাপান প্রসেসিং ফি (৳, না থাকলে খালি)', 'number', 'min="0" step="1"')}
    ${inp('next_due_date', 'পরের কিস্তির তারিখ', 'date')}${sel('status', 'অবস্থা', STATUS)}
    <label class="f full">নোট<textarea name="notes">${esc(v.notes || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end"><a class="btn ghost" href="${s ? '#/student/' + s.id : '#/students'}">বাতিল</a><button class="btn" type="submit">${s ? 'সংরক্ষণ' : 'ভর্তি করুন'}</button></div>
  </form>`, () => {
    const f = $('#sf');
    f.package.onchange = () => { f.total_fee.value = S.settings.fees[f.package.value] || 0; const first = f.package.value.split('+')[0]; if (LEVELS.includes(first) && !s) f.current_level.value = first; };
    f.onsubmit = async (e) => {
      e.preventDefault(); const d = formData(f); d.total_fee = d.total_fee || 0; d.discount = d.discount || 0; d.processing_fee = d.processing_fee || 0;
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
  const TABS = [['info', 'তথ্য'], ['fees', 'ফি'], ['att', 'হাজিরা'], ['exams', 'পরীক্ষা'], ['docs', 'কাগজপত্র'], ['japan', 'জাপান প্রসেস'], ...(isAdmin() ? [['hist', 'ইতিহাস']] : [])];
  let body = '';
  if (tab === 'info') {
    const kv = [['ভর্তি নম্বর', s.admission_no], ['ভর্তির তারিখ', fmtD(s.admission_date)], ['ইংরেজি নাম', s.name_en], ['জন্ম তারিখ', fmtD(s.dob)], ['লিঙ্গ', { male: 'ছেলে', female: 'মেয়ে' }[s.gender] || '—'], ['NID / জন্ম নিবন্ধন', s.nid], ['পাসপোর্ট', s.passport_no], ['মোবাইল', s.phone], ['ইমেইল', s.email], ['বর্তমান ঠিকানা', s.address_present], ['স্থায়ী ঠিকানা', s.address_permanent], ['শিক্ষাগত যোগ্যতা', s.education], ['অভিভাবক', [s.guardian_name, s.guardian_relation && `(${s.guardian_relation})`].filter(Boolean).join(' ')], ['অভিভাবকের মোবাইল', s.guardian_phone], ['প্যাকেজ', s.package], ['লেভেল · ব্যাচ', s.current_level + ' · ' + (BATCH[s.batch] || '')], ['ক্লাস শুরু', fmtD(s.start_date)], ['নোট', s.notes]];
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
    body = `<div class="card" style="margin-bottom:14px"><div class="row"><b>${done} / ${DOC_TYPES.length}</b> <span class="muted">কাগজ জমা হয়েছে</span><span class="spacer"></span><div class="bar" style="width:200px"><i style="width:${Math.round(done * 100 / DOC_TYPES.length)}%"></i></div></div></div>
    <div class="tw"><table><tr><th>কাগজ</th><th>অবস্থা</th><th>ফাইল</th><th class="hide-m">নোট</th></tr>${DOC_TYPES.map(([k, l]) => { const d = docs.get(k) || { status: 'missing' }; const al = docAlertFor(s, k); const dd = DOC_DATE[k]; return `<tr data-doc="${k}"><td><b>${l}</b>${dd ? `<label class="small muted ddt">${dd[1]} <input type="date" data-dt="${dd[0]}" value="${esc(d[dd[0]] || '')}"></label>` : ''}${al ? `<div style="margin-top:4px">${badge(al.level === 'red' ? 'due' : 'trial', al.issue)}</div>` : ''}</td><td><select data-dst>${Object.entries(DOC_STATUS).map(([sk, sl]) => `<option value="${sk}" ${d.status === sk ? 'selected' : ''}>${sl}</option>`).join('')}</select></td><td><div class="row" style="gap:6px">${d.file_path ? `<button class="btn sm ghost" data-view="${esc(d.file_path)}">দেখুন</button>` : ''}<label class="btn sm ghost" style="cursor:pointer">${d.file_path ? 'বদলান' : 'আপলোড'}<input type="file" data-up accept="image/*,application/pdf" hidden></label></div></td><td class="hide-m"><input data-note value="${esc(d.note || '')}" placeholder="নোট" style="width:100%"></td></tr>`; }).join('')}</table></div>
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
  if (tab === 'hist') body = '<div id="histbox"><div class="empty">লোড হচ্ছে…</div></div>';
  const photo = S.documents.find(d => d.student_id === s.id && d.doc_type === 'photo' && d.file_path);
  mount('#/students', `
  <div class="top"><div class="phead"><div class="avatar" id="av">${esc(initials(s))}</div><div><h1>${esc(s.name_bn || s.name_en)}</h1><p>${esc(s.name_en)} · ${esc(s.admission_no)} · ${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</p><div class="row" style="margin-top:4px">${badge(s.status, STATUS[s.status])}${due ? badge('due', 'বকেয়া ' + tk(due)) : badge('paid', 'ফি পরিশোধিত')}</div></div></div>
  <div class="row no-print">${waBtn(guardianPhone(s), `আসসালামু আলাইকুম। ${S.settings.institute_bn} থেকে বলছি। `, 'অভিভাবক')}<button class="btn ghost" id="plink">অভিভাবকের লিংক${s.parent_token ? ' ✓' : ''}</button><button class="btn ghost" id="idc">আইডি কার্ড</button><a class="btn ghost" href="#/student/${s.id}/edit">সম্পাদনা</a>${isAdmin() ? '<button class="btn ghost" id="del" style="color:var(--red);border-color:var(--red)">মুছুন</button>' : ''}</div></div>
  <div class="tabs">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`, () => {
    $$('[data-tab]').forEach(b => b.onclick = () => { location.hash = `#/student/${s.id}?t=${b.dataset.tab}`; });
    $('#idc').onclick = () => printIdCards([s]);
    $('#plink').onclick = () => parentLinkModal(s);
    if (tab === 'hist') API.auditList({ student: s.id, from: '2020-01-01', to: todayISO(), limit: 300 }).then(r => { const box = $('#histbox'); if (box) box.innerHTML = r.rows.length ? `<div class="tw">${audRows(r.rows)}</div><p class="small muted" style="margin-top:8px">এই ছাত্রের তথ্য, টাকা জমা, কাগজ, আবেদন আর নম্বরে যা যা যোগ, বদল বা মোছা হয়েছে।</p>` : '<div class="empty">এখনো কোনো রেকর্ড নেই</div>'; }).catch(e => { const box = $('#histbox'); if (box) box.innerHTML = `<div class="empty">${/audit_log|does not exist|schema cache/i.test(e.message || '') ? 'কাজের রেকর্ডের টেবিল এখনো তৈরি হয়নি।' : esc(errMsg(e))}</div>`; });
    if (photo) API.fileUrl(photo.file_path).then(u => { if (u) $('#av').innerHTML = `<img alt="" src="${esc(u)}">`; }).catch(() => {});
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
        const v = $('[data-view]', tr); if (v) v.onclick = async () => { try { const u = await API.fileUrl(v.dataset.view); const w = window.open(); if (w) { w.opener = null; w.location = u; } } catch (err) { toast(errMsg(err), true); } };
      });
    }
  });
}

// ------------------------------------------------------------------ payments
function paymentModal(studentId) {
  const opts = S.students.filter(s => s.status !== 'dropped').sort((a, b) => (a.admission_no || '').localeCompare(b.admission_no || ''));
  if (!opts.length) return toast('আগে একজন ছাত্র ভর্তি করুন', true);
  const pre = studentId ? byId(S.students, studentId) : null;
  openModal(`<h2>টাকা জমা</h2><form class="form" id="pf">
    <label class="f full">ছাত্র<select name="student_id" required>${studentId ? '' : '<option value="">— বাছাই করুন —</option>'}${opts.map(s => `<option value="${s.id}" ${s.id === studentId ? 'selected' : ''}>${esc(s.admission_no)} · ${esc(studentName(s))} (বকেয়া ${tk(dueOf(s))})</option>`).join('')}</select></label>
    <label class="f">টাকার পরিমাণ (৳)<input name="amount" type="number" min="1" step="1" required value="${pre && dueOf(pre) ? dueOf(pre) : ''}"></label>
    <label class="f">তারিখ<input name="paid_on" type="date" required value="${todayISO()}"></label>
    <label class="f">মাধ্যম<select name="method">${Object.entries(METHOD).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label class="f">ট্রানজেকশন আইডি (বিকাশ/নগদ/ব্যাংক)<input name="trx_id"></label>
    <label class="f">বাবদ<select name="purpose">${Object.entries(PURPOSE).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label class="f">পরের কিস্তির তারিখ (যদি থাকে)<input name="next_due_date" type="date" value="${pre && pre.next_due_date ? esc(pre.next_due_date) : ''}"></label>
    <label class="f full">নোট<input name="note"></label>
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
  <div class="top"><div><h1>আগ্রহী ছাত্র</h1><p>যারা জিজ্ঞেস করেছে, তাদের ফলো-আপ আর ভর্তি</p></div><button class="btn" id="nl">+ নতুন আগ্রহী</button></div>
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
    $('#flt').onsubmit = (e) => { e.preventDefault(); const d = formData(e.target); location.hash = '#/leads?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
    $$('#flt select').forEach(sel => sel.onchange = () => $('#flt').requestSubmit());
    $$('[data-lead]').forEach(tr => tr.onclick = () => leadModal(byId(S.inquiries, tr.dataset.lead)));
    bindGo();
  });
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
    <div class="full row" style="justify-content:flex-end">${ex && isAdmin() ? '<button type="button" class="btn ghost" id="xd" style="color:var(--red);margin-right:auto">পরীক্ষা মুছুন</button>' : ''}<button type="button" class="btn ghost" id="xc">বাতিল</button><button class="btn" type="submit">${ex ? 'সংরক্ষণ' : 'তৈরি করে নম্বর তুলুন'}</button></div></form>`);
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
const AUD_TABLE = { students: 'ছাত্র', payments: 'টাকা জমা', sessions: 'ক্লাস', attendance: 'হাজিরা', documents: 'কাগজপত্র', expenses: 'খরচ', inquiries: 'আগ্রহী ছাত্র', exams: 'পরীক্ষা', exam_results: 'নম্বর', jp_schools: 'জাপানি স্কুল', applications: 'জাপান আবেদন', teachers: 'শিক্ষক', commissions: 'কমিশন', settings: 'সেটিংস', profiles: 'স্টাফ' };
const AUD_ACT = { insert: ['যোগ', 'active'], update: ['বদল', 'trial'], delete: ['মুছেছে', 'due'] };
const MONEY_TABLES = ['payments', 'expenses'];
const AUD_FIELD = { name_bn: 'বাংলা নাম', name_en: 'ইংরেজি নাম', phone: 'ফোন', guardian_phone: 'অভিভাবকের ফোন', guardian_name: 'অভিভাবক', total_fee: 'মোট ফি', discount: 'ছাড়', next_due_date: 'পরের কিস্তি', status: 'অবস্থা', current_level: 'লেভেল', batch: 'ব্যাচ', package: 'প্যাকেজ', amount: 'টাকা', paid_on: 'তারিখ', spent_on: 'তারিখ', method: 'মাধ্যম', receipt_no: 'রশিদ নং', purpose: 'বাবদ', category: 'খাত', paid_to: 'কাকে', note: 'নোট', notes: 'নোট', japan_stage: 'জাপান ধাপ', target_school: 'স্কুল', intake: 'সেশন', passport_no: 'পাসপোর্ট নং', nid: 'NID', address_present: 'ঠিকানা', marks: 'নম্বর', absent: 'অনুপস্থিত', doc_type: 'কাগজ', file_path: 'ফাইল', expires_on: 'মেয়াদ', issued_on: 'ইস্যুর তারিখ', rate: 'বেতনের হার', processing_fee: 'প্রসেসিং ফি', amount_bdt: 'টাকা (৳)', amount_yen: 'টাকা (¥)', pay_type: 'বেতনের ধরন', hours: 'ঘণ্টা', topic: 'বিষয়', teacher_id: 'শিক্ষক', deadline_on: 'শেষ তারিখ', interview_on: 'ইন্টারভিউ', result_on: 'COE-র ফল', title: 'নাম', max_marks: 'পূর্ণ নম্বর', role: 'ভূমিকা', data: 'সেটিংস', active: 'কাজ চলছে', school_id: 'স্কুল' };
const AUD_HIDE = ['id', 'created_at', 'created_by', 'updated_at'];

function audValue(k, v) {
  if (v == null || v === '') return '—';
  if (['amount', 'total_fee', 'discount', 'rate', 'processing_fee', 'amount_bdt'].includes(k)) return tk(v); if (k === 'amount_yen') return yen(v);
  if (/_on$|_date$|^dob$/.test(k) && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return fmtD(String(v).slice(0, 10));
  if (k === 'status') return STATUS[v] || APP_ST[v] || ATT[v] || DOC_STATUS[v] || LEAD_ST[v] || v;
  if (k === 'method') return METHOD[v] || v; if (k === 'purpose') return PURPOSE[v] || v; if (k === 'pay_type') return PAY_TYPE[v] || v; if (k === 'role') return v === 'admin' ? 'অ্যাডমিন' : 'স্টাফ'; if (k === 'category') return EXP_CAT[v] || v; if (k === 'batch') return BATCH[v] || v;
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
  return `<table class="stack"><tr><th>সময়</th><th>কে</th><th>কাজ</th>${showWhere ? '<th>কোথায়</th>' : ''}<th>কী</th><th>বিবরণ</th></tr>${list.map(e => { const [al, ac] = AUD_ACT[e.action] || [e.action, '']; const link = audLink(e); const money = MONEY_TABLES.includes(e.table_name) && e.action !== 'insert'; return `<tr class="${money ? 'audmoney' : ''}"><td data-l="সময়" style="white-space:nowrap">${fmtDT(e.at)}</td><td data-l="কে">${esc(e.user_name || (e.user_id ? 'স্টাফ' : 'সিস্টেম'))}</td><td data-l="কাজ">${badge(ac, al)}${money ? ' ' + badge('due', 'টাকার রেকর্ড') : ''}</td>${showWhere ? `<td data-l="কোথায়">${esc(AUD_TABLE[e.table_name] || e.table_name)}</td>` : ''}<td data-l="কী">${link ? `<a href="${link}">${esc(audSubject(e) || '—')}</a>` : esc(audSubject(e) || '—')}</td><td data-l="বিবরণ"><span class="cell small">${audDetail(e) || '—'}</span></td></tr>`; }).join('')}</table>`;
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
  mount('#/reports', `
  <div class="top"><div><h1>রিপোর্ট</h1><p>হিসাব, বকেয়া আর হাজিরার সারসংক্ষেপ</p></div></div>
  <div class="card"><h2>গত ১২ মাসের আয় ও খরচ (৳)</h2>${chart}<p class="small muted">১২ মাসে আয় ${tk(tInc)} · খরচ ${tk(tExp)} · ${tInc - tExp < 0 ? 'ক্ষতি' : 'লাভ'} <b>${tk(Math.abs(tInc - tExp))}</b></p></div>
  <div class="card" style="margin-top:16px"><div class="row" style="margin-bottom:10px"><h2 style="margin:0">মাসিক লাভ-ক্ষতি</h2><span class="spacer"></span><button class="btn ghost sm" id="r5">CSV ডাউনলোড</button></div>
  <div class="tw"><table class="stack"><tr><th>মাস</th><th class="num">আয়</th><th class="num">খরচ</th><th class="num">লাভ / ক্ষতি</th></tr>${pl.map(r => `<tr class="click" data-go="#/expenses?m=${r.m}"><td data-l="মাস"><b>${r.m.slice(5)}/${r.m.slice(0, 4)}</b></td><td class="num" data-l="আয়">${tk(r.inc)}</td><td class="num" data-l="খরচ">${tk(r.exp)}</td><td class="num" data-l="লাভ / ক্ষতি"><b style="color:${r.pr < 0 ? 'var(--red)' : r.pr > 0 ? 'var(--green)' : 'inherit'}">${r.pr < 0 ? '−' : ''}${tk(Math.abs(r.pr))}</b></td></tr>`).join('')}</table></div></div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>বকেয়ার তালিকা</h2><p class="muted small">যাদের কাছে টাকা বাকি, অভিভাবকের ফোন নম্বরসহ।</p><button class="btn ghost" id="r1">CSV ডাউনলোড</button></div>
    <div class="card"><h2>হাজিরা ও শিক্ষার ঘণ্টা</h2><p class="muted small">প্রত্যেক ছাত্রের মোট ঘণ্টা, উপস্থিতি % আর লেভেল অনুযায়ী ভাগ।</p><button class="btn ghost" id="r2">CSV ডাউনলোড</button></div>
    <div class="card"><h2>ছাত্রদের পূর্ণ তালিকা</h2><p class="muted small">সব তথ্যসহ, জাপানের স্কুলে পাঠানোর প্রস্তুতির জন্য।</p><button class="btn ghost" id="r3">CSV ডাউনলোড</button></div>
    <div class="card"><h2>পুরো ব্যাকআপ</h2><p class="muted small">সব তথ্য একটা JSON ফাইলে। মাসে একবার নামিয়ে রাখুন।</p><button class="btn ghost" id="r4" ${isAdmin() ? '' : 'disabled'}>ব্যাকআপ ডাউনলোড</button></div>
  </div>`, () => {
    bindGo();
    $('#r5').onclick = () => csvDownload(`sakura-profit-loss-${todayISO()}.csv`, [['Month', 'Income', 'Expenses', 'Profit'], ...pl.map(r => [r.m, r.inc, r.exp, r.pr])]);
    $('#r1').onclick = () => csvDownload(`sakura-dues-${todayISO()}.csv`, [['Admission no', 'Name', 'Level', 'Batch', 'Total fee', 'Discount', 'Paid', 'Due', 'Next due date', 'Phone', 'Guardian phone'], ...studs.map(s => [s.admission_no, s.name_en || s.name_bn, s.current_level, s.batch, s.total_fee, s.discount, paidOf(s.id), dueOf(s), s.next_due_date, s.phone, s.guardian_phone]).filter(r => r[7] > 0)]);
    $('#r2').onclick = () => csvDownload(`sakura-attendance-${todayISO()}.csv`, [['Admission no', 'Name', 'Level', 'Classes marked', 'Attended', 'Attendance %', 'Total hours', 'N5 hours', 'N4 hours', 'N3 hours', 'First class', 'Last class'], ...studs.map(s => { const a = attOf(s.id, smap); return [s.admission_no, s.name_en || s.name_bn, s.current_level, a.total, a.came, a.pct ?? '', a.hours, a.byLevel.N5 || 0, a.byLevel.N4 || 0, a.byLevel.N3 || 0, a.first || '', a.last || '']; })]);
    $('#r3').onclick = () => { const cols = ['admission_no', 'admission_date', 'name_bn', 'name_en', 'dob', 'gender', 'nid', 'passport_no', 'phone', 'email', 'address_present', 'address_permanent', 'education', 'guardian_name', 'guardian_relation', 'guardian_phone', 'package', 'current_level', 'batch', 'start_date', 'total_fee', 'discount', 'status', 'japan_stage', 'target_school', 'intake', 'notes']; csvDownload(`sakura-students-${todayISO()}.csv`, [cols, ...S.students.map(s => cols.map(c => s[c]))]); };
    $('#r4').onclick = () => { const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), settings: S.settings, ...Object.fromEntries(TABLES.map(t => [t, S[t]])) }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sakura-backup-${todayISO()}.json`; a.click(); };
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
    <h3>সার্টিফিকেটে বইয়ের নাম</h3>
    ${LEVELS.map(l => `<label class="f">${l}<input name="tb_${l}" value="${esc(st.textbooks[l])}" ${ro}></label>`).join('')}
    ${isAdmin() ? '<div class="full row" style="justify-content:flex-end"><button class="btn">সংরক্ষণ</button></div>' : ''}
  </form>
  <div class="card" style="margin-top:16px"><h2>স্টাফ</h2><div class="tw"><table><tr><th>নাম</th><th>ভূমিকা</th></tr>${S.profiles.map(p => `<tr><td>${esc(p.name || '—')}</td><td>${p.role === 'admin' ? 'অ্যাডমিন' : 'স্টাফ'}</td></tr>`).join('')}</table></div>
  <p class="small muted">নতুন স্টাফ যোগ করতে README-এর "স্টাফ যোগ করা" অংশ দেখুন। স্টাফরা ছাত্র ভর্তি, টাকা জমা আর হাজিরা নিতে পারবেন; মোছা আর টাকার রেকর্ড বদলানো শুধু অ্যাডমিনের কাজ।</p></div>
  ${DEMO ? `<div class="card" style="margin-top:16px"><h2>ডেমো</h2><p class="small muted">পরীক্ষা করার জন্য কয়েকজন কাল্পনিক ছাত্র আর হাজিরা যোগ করুন, অথবা সব ডেমো তথ্য মুছে দিন।</p><div class="row"><button class="btn ghost" id="seed">ডেমো তথ্য যোগ করুন</button><button class="btn ghost" id="wipe" style="color:var(--red)">সব ডেমো তথ্য মুছুন</button></div></div>` : ''}`, () => {
    $('#stf').onsubmit = async (e) => {
      e.preventDefault(); const d = formData(e.target);
      const data = { ...S.settings, address: d.address, phone: d.phone, whatsapp: d.whatsapp, email: d.email, director_en: d.director_en, director_ja: d.director_ja, hours_per_class: d.hours_per_class || 2, fees: Object.fromEntries(PACKAGES.map(p => [p, d['fee_' + p] || 0])), textbooks: Object.fromEntries(LEVELS.map(l => [l, d['tb_' + l]])), wa_due: d.wa_due || DEFAULT_SETTINGS.wa_due, wa_absent: d.wa_absent || DEFAULT_SETTINGS.wa_absent, wa_lead: d.wa_lead || DEFAULT_SETTINGS.wa_lead, wa_result: d.wa_result || DEFAULT_SETTINGS.wa_result, wa_japan: d.wa_japan || DEFAULT_SETTINGS.wa_japan, wa_doc: d.wa_doc || DEFAULT_SETTINGS.wa_doc, wa_parent: d.wa_parent && d.wa_parent.includes('{link}') ? d.wa_parent : DEFAULT_SETTINGS.wa_parent, alert_passport_months: d.alert_passport_months || 6, alert_fresh_days: d.alert_fresh_days || 90, alert_deadline_days: d.alert_deadline_days || 14, id_valid_months: d.id_valid_months || 12 };
      try { await API.saveSettings(data); S.settings = data; toast('সংরক্ষণ হয়েছে'); } catch (err) { toast(errMsg(err), true); }
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
function printWindow(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
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
function printCertificate(s) {
  const a = attOf(s.id); const st = S.settings;
  if (!a.hours) return toast('এখনো কোনো উপস্থিতির ঘণ্টা নেই', true);
  const jd = (iso) => iso ? `${iso.slice(0, 4)}年${num(iso.slice(5, 7))}月${num(iso.slice(8, 10))}日` : '';
  const today = todayISO();
  const rows = LEVELS.filter(l => a.byLevel[l]).map(l => `<tr><td>${l}</td><td>${esc(st.textbooks[l] || '')}</td><td style="text-align:right">${a.byLevel[l]} 時間</td></tr>`).join('');
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
  <p style="font-size:11px;color:#6E665A;margin-top:24px">学習時間は出席記録（出席・遅刻）に基づいて算出しています。 / Hours are calculated from signed attendance records (present and late).</p></div>`);
}

function printTranscript(s) {
  const res = studentResults(s.id); const a = attOf(s.id); const st = S.settings; const today = todayISO();
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
  <div style="text-align:center"><div style="width:74px;height:74px;border:1.5px dashed #C8372B;border-radius:50%;margin:0 auto 6px;color:#C8372B;display:grid;place-items:center;font-size:12px">印</div>学院長 ${esc(st.director_ja)}<br>Director ${esc(st.director_en)}</div></div></div>`);
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
  <style>@page{size:A4;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:'Hind Siliguri',sans-serif;color:#26231E;-webkit-print-color-adjust:exact;print-color-adjust:exact}
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
  .print{position:fixed;bottom:14px;right:14px;background:#1B2945;color:#fff;border:none;padding:8px 14px;border-radius:6px;font:inherit;cursor:pointer}@media print{.print,.help{display:none}}</style></head>
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

boot().catch(e => { $('#app').innerHTML = `<div class="boot">${esc(errMsg(e))}</div>`; });
})();
