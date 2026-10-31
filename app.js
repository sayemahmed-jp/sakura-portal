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
  fees: { 'N5': 20000, 'N4': 20000, 'N3': 22000, 'N5+N4': 35000, 'N5+N4+N3': 45000 },
  textbooks: { 'N5': 'みんなの日本語 初級I', 'N4': 'みんなの日本語 初級II', 'N3': '中級教材' },
  wa_due: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name}-এর কোর্স ফি বাবদ {due} বকেয়া আছে{date}। অনুগ্রহ করে সময়মতো পরিশোধ করবেন। ধন্যবাদ। যোগাযোগ: {phone}',
  wa_absent: 'আসসালামু আলাইকুম। {institute} থেকে বলছি। {name} {date} তারিখে ক্লাসে উপস্থিত ছিল না। এখন পর্যন্ত উপস্থিতি {pct}। জাপানে আবেদনের জন্য অন্তত ৮০% উপস্থিতি দরকার। ধন্যবাদ। যোগাযোগ: {phone}',
  wa_lead: 'আসসালামু আলাইকুম {name}, {institute} থেকে বলছি। জাপানি ভাষা কোর্স (N5–N3) ও জাপানে পড়াশোনা নিয়ে আগ্রহ দেখানোর জন্য ধন্যবাদ। প্রথম ৩টি ক্লাস ফ্রি, আর সব বই কোর্স ফি-র মধ্যেই। কবে একবার অফিসে আসতে পারবেন জানাবেন? যোগাযোগ: {phone}'
};
const BATCH = { morning: 'সকাল ১০–১২টা', evening: 'সন্ধ্যা ৬–৮টা' };
const STATUS = { trial: 'ট্রায়াল', active: 'চলমান', completed: 'কোর্স শেষ', dropped: 'বাদ দিয়েছে', japan: 'জাপানে' };
const METHOD = { cash: 'ক্যাশ', bkash: 'বিকাশ', nagad: 'নগদ', bank: 'ব্যাংক' };
const PURPOSE = { course_fee: 'কোর্স ফি', installment: 'কিস্তি', admission: 'ভর্তি ফি', other: 'অন্যান্য' };
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
const DOC_STATUS = { missing: 'জমা হয়নি', received: 'জমা হয়েছে', verified: 'যাচাই হয়েছে' };
const JSTAGES = [
  ['none', 'শুরু হয়নি'], ['docs', 'কাগজ জোগাড়'], ['school', 'স্কুল বাছাই'], ['applied', 'আবেদন জমা'],
  ['coe', 'COE পেয়েছে'], ['visa', 'ভিসা পেয়েছে'], ['departed', 'জাপানে গেছে']
];

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
const TABLES = ['students', 'payments', 'sessions', 'attendance', 'documents', 'expenses', 'inquiries'];
const OPTIONAL_TABLES = ['expenses', 'inquiries'];
const Local = {
  key: (t) => 'sakura_demo_' + t,
  read(t) { try { return JSON.parse(localStorage.getItem(this.key(t)) || '[]'); } catch { return []; } },
  write(t, rows) { try { localStorage.setItem(this.key(t), JSON.stringify(rows)); } catch { toast('ব্রাউজারে জায়গা শেষ — ডেমো ফাইল ছোট রাখুন', true); } },
  async fetchAll(t) { return this.read(t); },
  unique: { students: [['admission_no']], payments: [['receipt_no']], sessions: [['class_date', 'level', 'batch']], attendance: [['session_id', 'student_id']], documents: [['student_id', 'doc_type']] },
  check(t, rows, row) {
    for (const cols of this.unique[t] || []) if (rows.some(r => r.id !== row.id && cols.every(c => r[c] === row[c]))) throw new Error('duplicate key');
  },
  async insert(t, row) { const rows = this.read(t); const r = { id: uuid(), created_at: new Date().toISOString(), ...row }; this.check(t, rows, r); rows.push(r); this.write(t, rows); return r; },
  async update(t, id, patch) { const rows = this.read(t); const i = rows.findIndex(r => r.id === id); if (i < 0) throw new Error('not found'); const r = { ...rows[i], ...patch }; this.check(t, rows, r); rows[i] = r; this.write(t, rows); return r; },
  async remove(t, id) {
    let rows = this.read(t).filter(r => r.id !== id); this.write(t, rows);
    if (t === 'students') for (const c of ['attendance', 'documents']) this.write(c, this.read(c).filter(r => r.student_id !== id));
    if (t === 'sessions') this.write('attendance', this.read('attendance').filter(r => r.session_id !== id));
  },
  async upsertAttendance(rows) {
    const all = this.read('attendance');
    for (const r of rows) { const i = all.findIndex(x => x.session_id === r.session_id && x.student_id === r.student_id); if (i >= 0) all[i] = { ...all[i], status: r.status }; else all.push({ id: uuid(), ...r }); }
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
  async upsertAttendance(rows) { const { data, error } = await sb.from('attendance').upsert(rows, { onConflict: 'session_id,student_id' }).select(); if (error) throw error; return data; },
  async upload(path, file) { const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined }); if (error) throw error; return path; },
  async fileUrl(path) { const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; },
  async getSettings() { const { data, error } = await sb.from('settings').select('data').eq('id', 1).maybeSingle(); if (error) throw error; return (data && data.data) || {}; },
  async saveSettings(d) { const { error } = await sb.from('settings').update({ data: d, updated_at: new Date().toISOString() }).eq('id', 1); if (error) throw error; },
  async profiles() { const { data, error } = await sb.from('profiles').select('*').order('created_at'); if (error) throw error; return data; }
};
const API = DEMO ? Local : Remote;

async function loadAll() {
  const [settings, profiles, ...rest] = await Promise.all([API.getSettings(), API.profiles(), ...TABLES.map(t => API.fetchAll(t).catch(e => { if (OPTIONAL_TABLES.includes(t)) { console.warn('Table not ready: ' + t, e); return []; } throw e; }))]);
  S.settings = { ...DEFAULT_SETTINGS, ...settings, fees: { ...DEFAULT_SETTINGS.fees, ...(settings.fees || {}) }, textbooks: { ...DEFAULT_SETTINGS.textbooks, ...(settings.textbooks || {}) } };
  for (const k of ['wa_due', 'wa_absent', 'wa_lead']) if (!S.settings[k]) S.settings[k] = DEFAULT_SETTINGS[k];
  S.profiles = profiles;
  TABLES.forEach((t, i) => { S[t] = rest[i]; });
  S.loaded = true;
}
function putLocal(t, row) { const i = S[t].findIndex(r => r.id === row.id); if (i >= 0) S[t][i] = row; else S[t].push(row); }

// ------------------------------------------------------------------ derived numbers
const sessionMap = () => new Map(S.sessions.map(s => [s.id, s]));
function paidOf(sid) { return S.payments.filter(p => p.student_id === sid).reduce((a, p) => a + num(p.amount), 0); }
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
function monthSum(arr, field, m, amt = 'amount') { return arr.filter(x => (x[field] || '').startsWith(m)).reduce((a, x) => a + num(x[amt]), 0); }
const badge = (cls, label) => `<span class="b ${esc(cls)}">${esc(label)}</span>`;
const bar = (pct) => pct == null ? '<span class="muted small">—</span>' : `<div class="row" style="gap:6px;flex-wrap:nowrap"><div class="bar ${pct < 80 ? 'low' : ''}"><i style="width:${pct}%"></i></div><span class="small">${pct}%</span></div>`;

// ------------------------------------------------------------------ auth
async function boot() {
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
  check: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 15l3 3 5-6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  wallet: '<path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H3z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="13.5" r="1.2"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.3A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
};
const NAV = [['#/', 'ড্যাশবোর্ড', 'home'], ['#/students', 'ছাত্র-ছাত্রী', 'users'], ['#/leads', 'আগ্রহী ছাত্র', 'chat'], ['#/payments', 'ফি ও হিসাব', 'money'], ['#/expenses', 'খরচ ও লাভ', 'wallet'], ['#/attendance', 'হাজিরা', 'check'], ['#/reports', 'রিপোর্ট', 'chart'], ['#/settings', 'সেটিংস', 'gear']];
function shell(active, inner) {
  return `<div class="mtop"><button id="mnav" aria-label="মেনু">☰</button><b>সাকুরা পোর্টাল</b></div>
  <div class="shell"><aside class="side" id="side">
    <div class="brand"><span class="kamon">${KAMON}</span><div><b>Sakura Portal</b><small>さくら日本語学院</small></div></div>
    <nav class="nav">${NAV.map(([h, l, i]) => `<a href="${h}" class="${active === h ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[i]}</svg>${l}</a>`).join('')}</nav>
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
  if (p[0] === 'student') return viewStudent(p[1], q.get('t') || 'info');
  if (p[0] === 'payments') return viewPayments(q);
  if (p[0] === 'attendance') return viewAttendance(q);
  if (p[0] === 'expenses') return viewExpenses(q);
  if (p[0] === 'leads') return viewLeads(q);
  if (p[0] === 'reports') return viewReports();
  if (p[0] === 'settings') return viewSettings();
  return viewDashboard();
}
window.addEventListener('hashchange', render);

// ------------------------------------------------------------------ dashboard
function viewDashboard() {
  const smap = sessionMap(); const today = todayISO(); const m = monthISO();
  const current = S.students.filter(s => s.status === 'active' || s.status === 'trial');
  const monthIncome = S.payments.filter(p => (p.paid_on || '').startsWith(m)).reduce((a, p) => a + num(p.amount), 0);
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
  const expByCat = {}; S.expenses.filter(e => (e.spent_on || '').startsWith(m)).forEach(e => { expByCat[e.category] = (expByCat[e.category] || 0) + num(e.amount); });
  mount('#/', `
  <div class="top"><div><h1>ড্যাশবোর্ড</h1><p>আজ ${fmtD(today)}</p></div>
    <div class="row no-print"><a class="btn" href="#/students/new">+ নতুন ছাত্র</a><button class="btn gold" id="qp">+ টাকা জমা</button><a class="btn ghost" href="#/attendance">আজকের হাজিরা</a></div></div>
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
  <div class="top"><div><h1>ছাত্র-ছাত্রী</h1><p>${list.length} জন দেখানো হচ্ছে</p></div><a class="btn" href="#/students/new">+ নতুন ছাত্র</a></div>
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
    ${inp('total_fee', 'মোট ফি (৳)', 'number', 'min="0" step="1" required')}${inp('discount', 'ছাড় (৳)', 'number', 'min="0" step="1"')}
    ${inp('next_due_date', 'পরের কিস্তির তারিখ', 'date')}${sel('status', 'অবস্থা', STATUS)}
    <label class="f full">নোট<textarea name="notes">${esc(v.notes || '')}</textarea></label>
    <div class="full row" style="justify-content:flex-end"><a class="btn ghost" href="${s ? '#/student/' + s.id : '#/students'}">বাতিল</a><button class="btn" type="submit">${s ? 'সংরক্ষণ' : 'ভর্তি করুন'}</button></div>
  </form>`, () => {
    const f = $('#sf');
    f.package.onchange = () => { f.total_fee.value = S.settings.fees[f.package.value] || 0; const first = f.package.value.split('+')[0]; if (LEVELS.includes(first) && !s) f.current_level.value = first; };
    f.onsubmit = async (e) => {
      e.preventDefault(); const d = formData(f); d.total_fee = d.total_fee || 0; d.discount = d.discount || 0;
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
  const TABS = [['info', 'তথ্য'], ['fees', 'ফি'], ['att', 'হাজিরা'], ['docs', 'কাগজপত্র'], ['japan', 'জাপান প্রসেস']];
  let body = '';
  if (tab === 'info') {
    const kv = [['ভর্তি নম্বর', s.admission_no], ['ভর্তির তারিখ', fmtD(s.admission_date)], ['ইংরেজি নাম', s.name_en], ['জন্ম তারিখ', fmtD(s.dob)], ['লিঙ্গ', { male: 'ছেলে', female: 'মেয়ে' }[s.gender] || '—'], ['NID / জন্ম নিবন্ধন', s.nid], ['পাসপোর্ট', s.passport_no], ['মোবাইল', s.phone], ['ইমেইল', s.email], ['বর্তমান ঠিকানা', s.address_present], ['স্থায়ী ঠিকানা', s.address_permanent], ['শিক্ষাগত যোগ্যতা', s.education], ['অভিভাবক', [s.guardian_name, s.guardian_relation && `(${s.guardian_relation})`].filter(Boolean).join(' ')], ['অভিভাবকের মোবাইল', s.guardian_phone], ['প্যাকেজ', s.package], ['লেভেল · ব্যাচ', s.current_level + ' · ' + (BATCH[s.batch] || '')], ['ক্লাস শুরু', fmtD(s.start_date)], ['নোট', s.notes]];
    body = `<div class="card"><dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl></div>`;
  }
  if (tab === 'fees') {
    const pays = S.payments.filter(p => p.student_id === s.id).sort((x, y) => (y.paid_on || '').localeCompare(x.paid_on || ''));
    body = `<div class="grid g4"><div class="card stat"><div class="l">মোট ফি</div><div class="v">${tk(s.total_fee)}</div></div><div class="card stat"><div class="l">ছাড়</div><div class="v">${tk(s.discount)}</div></div><div class="card stat green"><div class="l">পরিশোধিত</div><div class="v">${tk(paid)}</div></div><div class="card stat red"><div class="l">বকেয়া</div><div class="v">${tk(due)}</div><div class="s">${s.next_due_date ? 'পরের কিস্তি ' + fmtD(s.next_due_date) : ''}</div></div></div>
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
    <div class="tw"><table><tr><th>কাগজ</th><th>অবস্থা</th><th>ফাইল</th><th class="hide-m">নোট</th></tr>${DOC_TYPES.map(([k, l]) => { const d = docs.get(k) || { status: 'missing' }; return `<tr data-doc="${k}"><td><b>${l}</b></td><td><select data-dst>${Object.entries(DOC_STATUS).map(([sk, sl]) => `<option value="${sk}" ${d.status === sk ? 'selected' : ''}>${sl}</option>`).join('')}</select></td><td><div class="row" style="gap:6px">${d.file_path ? `<button class="btn sm ghost" data-view="${esc(d.file_path)}">দেখুন</button>` : ''}<label class="btn sm ghost" style="cursor:pointer">${d.file_path ? 'বদলান' : 'আপলোড'}<input type="file" data-up accept="image/*,application/pdf" hidden></label></div></td><td class="hide-m"><input data-note value="${esc(d.note || '')}" placeholder="নোট" style="width:100%"></td></tr>`; }).join('')}</table></div>
    <p class="small muted">ছবি বা PDF আপলোড করা যায়। ফাইল সুরক্ষিত থাকে, শুধু স্টাফরা লগইন করে দেখতে পারেন।</p>`;
  }
  if (tab === 'japan') {
    const idx = JSTAGES.findIndex(([k]) => k === (s.japan_stage || 'none'));
    body = `<div class="card"><h2>জাপানে আবেদনের ধাপ</h2><div class="steps">${JSTAGES.slice(1).map(([k, l], i) => `<span class="${i + 1 < idx ? 'done' : i + 1 === idx ? 'cur' : ''}">${i + 1}. ${l}</span>`).join('')}</div>
    <form class="form" id="jf" style="margin-top:16px"><label class="f">বর্তমান ধাপ<select name="japan_stage">${JSTAGES.map(([k, l]) => `<option value="${k}" ${k === (s.japan_stage || 'none') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">লক্ষ্য সেশন (যেমন 2027-04)<input name="intake" value="${esc(s.intake || '')}" placeholder="2027-04"></label>
    <label class="f full">জাপানের স্কুল<input name="target_school" value="${esc(s.target_school || '')}" placeholder="যেমন 春日日本語学院"></label>
    <div class="full row" style="justify-content:flex-end"><button class="btn">সংরক্ষণ</button></div></form></div>`;
  }
  const photo = S.documents.find(d => d.student_id === s.id && d.doc_type === 'photo' && d.file_path);
  mount('#/students', `
  <div class="top"><div class="phead"><div class="avatar" id="av">${esc(initials(s))}</div><div><h1>${esc(s.name_bn || s.name_en)}</h1><p>${esc(s.name_en)} · ${esc(s.admission_no)} · ${esc(s.current_level)} · ${esc(BATCH[s.batch] || '')}</p><div class="row" style="margin-top:4px">${badge(s.status, STATUS[s.status])}${due ? badge('due', 'বকেয়া ' + tk(due)) : badge('paid', 'ফি পরিশোধিত')}</div></div></div>
  <div class="row no-print">${waBtn(guardianPhone(s), `আসসালামু আলাইকুম। ${S.settings.institute_bn} থেকে বলছি। `, 'অভিভাবক')}<a class="btn ghost" href="#/student/${s.id}/edit">সম্পাদনা</a>${isAdmin() ? '<button class="btn ghost" id="del" style="color:var(--red);border-color:var(--red)">মুছুন</button>' : ''}</div></div>
  <div class="tabs">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`, () => {
    $$('[data-tab]').forEach(b => b.onclick = () => { location.hash = `#/student/${s.id}?t=${b.dataset.tab}`; });
    if (photo) API.fileUrl(photo.file_path).then(u => { if (u) $('#av').innerHTML = `<img alt="" src="${esc(u)}">`; }).catch(() => {});
    const del = $('#del'); if (del) del.onclick = async () => {
      if (S.payments.some(p => p.student_id === s.id)) return toast('এই ছাত্রের টাকা জমার রেকর্ড আছে, তাই মোছা যাবে না। অবস্থা "বাদ দিয়েছে" করে দিন।', true);
      if (!(await confirmBox(`${studentName(s)}-এর সব তথ্য, হাজিরা ও কাগজপত্র মুছে যাবে।`))) return;
      try { await API.remove('students', s.id); S.students = S.students.filter(x => x.id !== s.id); S.attendance = S.attendance.filter(x => x.student_id !== s.id); S.documents = S.documents.filter(x => x.student_id !== s.id); toast('মুছে ফেলা হয়েছে'); location.hash = '#/students'; } catch (e) { toast(errMsg(e), true); }
    };
    if (tab === 'fees') { $('#addpay').onclick = () => paymentModal(s.id); $$('[data-rc]').forEach(b => b.onclick = () => printReceipt(byId(S.payments, b.dataset.rc))); }
    if (tab === 'att') { const c = $('#cert'); if (c) c.onclick = () => printCertificate(s); }
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
  f.student_id.onchange = () => { const s = byId(S.students, f.student_id.value); if (s) { const d = dueOf(s); f.amount.value = d || ''; f.next_due_date.value = s.next_due_date || ''; } };
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
    <label class="f">শিক্ষক<input name="teacher" value="${esc(session ? session.teacher : '')}"></label>
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
        const meta = { class_no: d.class_no || null, hours: d.hours || S.settings.hours_per_class, topic: d.topic, teacher: d.teacher };
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
  const income = monthSum(S.payments, 'paid_on', m); const spent = list.reduce((a, x) => a + num(x.amount), 0); const profit = income - spent;
  const byCat = {}; list.forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + num(x.amount); });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]); const maxCat = Math.max(1, ...cats.map(c => c[1]));
  mount('#/expenses', `
  <div class="top"><div><h1>খরচ ও লাভ</h1><p>মাস অনুযায়ী আয়, খরচ আর লাভ-ক্ষতি</p></div><div class="row"><input type="month" id="mon" value="${esc(m)}"><button class="btn ghost" id="csv">CSV ডাউনলোড</button><button class="btn" id="ne">+ খরচ যোগ</button></div></div>
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card stat green"><div class="l">আয় (ফি জমা)</div><div class="v">${tk(income)}</div><div class="s">${S.payments.filter(p => (p.paid_on || '').startsWith(m)).length}টি রশিদ</div></div>
    <div class="card stat red"><div class="l">খরচ</div><div class="v">${tk(spent)}</div><div class="s">${list.length}টি খরচ</div></div>
    <div class="card stat ${profit < 0 ? 'red' : 'green'}"><div class="l">${profit < 0 ? 'ক্ষতি' : 'লাভ'}</div><div class="v">${tk(Math.abs(profit))}</div><div class="s">আয় − খরচ</div></div>
  </div>
  ${cats.length ? `<div class="card" style="margin-bottom:16px"><h2>খাত অনুযায়ী খরচ</h2><div class="catbars">${cats.map(([k, v]) => `<div class="cb"><span>${esc(EXP_CAT[k] || k)}</span><div class="bar"><i style="width:${Math.round(v * 100 / maxCat)}%;background:var(--red)"></i></div><b>${tk(v)}</b></div>`).join('')}</div></div>` : ''}
  <div class="tw">${list.length ? `<table class="stack"><tr><th>তারিখ</th><th>খাত</th><th>বিবরণ</th><th>মাধ্যম</th><th class="num">টাকা</th><th></th></tr>${list.map(x => `<tr><td data-l="তারিখ">${fmtD(x.spent_on)}</td><td data-l="খাত">${esc(EXP_CAT[x.category] || x.category)}</td><td data-l="বিবরণ">${esc([x.paid_to, x.note].filter(Boolean).join(' · ') || '—')}</td><td data-l="মাধ্যম">${esc(METHOD[x.method] || x.method)}</td><td class="num" data-l="টাকা"><b>${tk(x.amount)}</b></td><td class="num" data-l="">${isAdmin() ? `<button class="btn sm ghost" data-de="${x.id}" style="color:var(--red)">মুছুন</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="empty">এই মাসে কোনো খরচ লেখা হয়নি। উপরের "+ খরচ যোগ" দিয়ে শুরু করুন।</div>'}</div>`, () => {
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

// ------------------------------------------------------------------ reports
function viewReports() {
  const smap = sessionMap();
  const months = []; const d = new Date(); d.setDate(1);
  for (let i = 11; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); months.push(`${x.getFullYear()}-${pad(x.getMonth() + 1, 2)}`); }
  const inc = months.map(m => S.payments.filter(p => (p.paid_on || '').startsWith(m)).reduce((a, p) => a + num(p.amount), 0));
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
    <h3>কোর্স ফি (৳)</h3>
    ${PACKAGES.map(p => `<label class="f">${p}<input name="fee_${p}" type="number" min="0" value="${esc(st.fees[p])}" ${ro}></label>`).join('')}
    <h3>WhatsApp মেসেজের লেখা</h3>
    <p class="full small muted" style="margin:0">{name} = ছাত্র বা আগ্রহীর নাম, {due} = বকেয়া টাকা, {date} = তারিখ, {pct} = উপস্থিতি %, {institute} = প্রতিষ্ঠানের নাম, {phone} = অফিসের ফোন। এগুলো নিজে থেকে বসে যাবে।</p>
    <label class="f full">বকেয়ার রিমাইন্ডার<textarea name="wa_due" ${ro}>${esc(st.wa_due)}</textarea></label>
    <label class="f full">অনুপস্থিতির খবর<textarea name="wa_absent" ${ro}>${esc(st.wa_absent)}</textarea></label>
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
      const data = { ...S.settings, address: d.address, phone: d.phone, whatsapp: d.whatsapp, email: d.email, director_en: d.director_en, director_ja: d.director_ja, hours_per_class: d.hours_per_class || 2, fees: Object.fromEntries(PACKAGES.map(p => [p, d['fee_' + p] || 0])), textbooks: Object.fromEntries(LEVELS.map(l => [l, d['tb_' + l]])), wa_due: d.wa_due || DEFAULT_SETTINGS.wa_due, wa_absent: d.wa_absent || DEFAULT_SETTINGS.wa_absent, wa_lead: d.wa_lead || DEFAULT_SETTINGS.wa_lead };
      try { await API.saveSettings(data); S.settings = data; toast('সংরক্ষণ হয়েছে'); } catch (err) { toast(errMsg(err), true); }
    };
    if (DEMO) {
      $('#seed').onclick = async () => { await seedDemo(); await loadAll(); toast('ডেমো তথ্য যোগ হয়েছে'); location.hash = '#/'; };
      $('#wipe').onclick = async () => { if (!(await confirmBox('এই ব্রাউজারের সব ডেমো তথ্য মুছে যাবে।'))) return; [...TABLES, 'files', 'settings'].forEach(t => localStorage.removeItem('sakura_demo_' + t)); await loadAll(); toast('মুছে ফেলা হয়েছে'); render(); };
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
  for (let k = 0; k < 12; k++) {
    const dt = new Date(base); dt.setDate(base.getDate() + k * 2); if (dt > new Date()) break;
    for (const batch of ['morning', 'evening']) {
      let ss; try { ss = await Local.insert('sessions', { class_date: iso(dt), level: 'N5', batch, class_no: k + 1, hours: 2, topic: 'ডেমো পাঠ ' + (k + 1), teacher: 'ডেমো শিক্ষক' }); } catch { continue; }
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
  const paidTotal = paidOf(s.id); const due = s.id ? dueOf(s) : 0;
  const copy = (label) => `<div style="border:1.5px solid #A3843A;margin-bottom:14px;page-break-inside:avoid">${headHtml()}
  <div style="padding:14px 18px"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px"><div><div style="font:700 11px 'Shippori Mincho B1';letter-spacing:3px;color:#A3843A">MONEY RECEIPT</div><div style="font:800 20px 'Noto Serif Bengali'">ফি-র রশিদ</div></div>
  <div style="text-align:right;font-size:13px"><span style="background:#C8372B;color:#fff;padding:2px 10px;border-radius:4px;font-weight:700">${label}</span><br>রশিদ নং: <b>${esc(p.receipt_no)}</b> · তারিখ: <b>${fmtD(p.paid_on)}</b></div></div>
  <table><tr><th>ছাত্র/ছাত্রীর নাম</th><td>${esc(s.name_bn || '')} ${s.name_en ? '(' + esc(s.name_en) + ')' : ''}</td></tr><tr><th>ভর্তি নম্বর</th><td>${esc(s.admission_no || '')}</td></tr>
  <tr><th>কোর্স / ব্যাচ</th><td>${esc(s.package || '')} · ${esc(BATCH[s.batch] || '')}</td></tr><tr><th>বাবদ</th><td>${esc(PURPOSE[p.purpose] || p.purpose)}</td></tr>
  <tr><th>মাধ্যম</th><td>${esc(METHOD[p.method] || p.method)}${p.trx_id ? ' · TrxID: ' + esc(p.trx_id) : ''}</td></tr>
  <tr><th>টাকার পরিমাণ</th><td><b style="font-size:17px;color:#C8372B">${tk(p.amount)}</b><br><span style="font-size:12px">In words: Taka ${words(p.amount)} only</span></td></tr>
  <tr><th>মোট ফি · মোট পরিশোধিত · বকেয়া</th><td>${tk(netFee(s))} · ${tk(paidTotal)} · <b>${tk(due)}</b>${s.next_due_date && due ? ' · পরের কিস্তি ' + fmtD(s.next_due_date) : ''}</td></tr></table>
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

boot().catch(e => { $('#app').innerHTML = `<div class="boot">${esc(errMsg(e))}</div>`; });
})();
