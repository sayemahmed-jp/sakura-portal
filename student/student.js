/* Sakura Japanese Institute — student site (ছাত্রদের সাইট)
   A student signs up with their own email, links the login to their admission
   (admission no + phone), and then reads the study materials for their levels.
   What a student may see is decided by the database (student_me, can_read_material),
   not by this page. Works in DEMO mode (no Supabase config) using the portal's demo data. */
'use strict';
const CFG = window.SAKURA_CONFIG || {};
const DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;
// a separate saved login from the staff portal, so the two never mix on one computer
const sb = DEMO ? null : window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { storageKey: 'sakura-student-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const BUCKET = 'materials';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const tk = (n) => '৳ ' + Math.round(num(n)).toLocaleString('en-IN');
const fmtD = (iso) => iso ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : '—';
const fmtSize = (b) => !num(b) ? '' : num(b) >= 1048576 ? (num(b) / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(num(b) / 1024)) + ' KB';
const KAMON = `<svg width="78%" height="78%" viewBox="-25 -25 50 50" aria-hidden="true"><circle r="23.4" fill="none" stroke="#26231E" stroke-width="2.2"/><circle r="20.6" fill="none" stroke="#26231E" stroke-width=".8"/><g fill="#26231E">${[0, 72, 144, 216, 288].map(r => `<path transform="rotate(${r})" d="M0 -3.4 C-7.4 -8 -8.6 -15.4 -4.6 -19.4 L0 -16.2 L4.6 -19.4 C8.6 -15.4 7.4 -8 0 -3.4Z"/>`).join('')}</g><circle r="2.6" fill="#FBF8F1"/></svg>`;
const LEVEL_NAME = { all: 'সব লেভেলের জন্য', N5: 'N5', N4: 'N4', N3: 'N3' };
const KIND = { pdf: 'PDF', audio: 'অডিও', video: 'ভিডিও', image: 'ছবি', link: 'লিংক', file: 'ফাইল' };
const BATCH = { morning: 'সকাল ১০–১২টা', evening: 'সন্ধ্যা ৬–৮টা' };
const WHY = { blocked: 'অফিস থেকে আপনার অ্যাক্সেস আপাতত বন্ধ রাখা হয়েছে।', dropped: 'আপনার ভর্তি এখন চালু নেই।', due: 'পুরো কোর্স ফি পরিশোধ হলে বইগুলো খুলে যাবে।' };

function toast(msg, err = false) { const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : ''); clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = ''; }, 3600); }
function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'ইমেইল বা পাসওয়ার্ড মেলেনি।';
  if (/already registered|already been registered/i.test(m)) return 'এই ইমেইলে আগেই অ্যাকাউন্ট খোলা আছে — "লগইন" থেকে ঢুকুন।';
  if (/Email not confirmed/i.test(m)) return 'ইমেইল এখনো নিশ্চিত করা হয়নি — ইনবক্সে পাঠানো লিংকে ক্লিক করুন।';
  if (/Password should be|weak/i.test(m)) return 'পাসওয়ার্ড অন্তত ৮ অক্ষরের দিন।';
  if (/rate limit|too many/i.test(m)) return 'অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পরে আবার চেষ্টা করুন।';
  if (/Signups not allowed/i.test(m)) return 'এখন নতুন অ্যাকাউন্ট খোলা বন্ধ আছে — অফিসে যোগাযোগ করুন।';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'ইন্টারনেট সংযোগ নেই।';
  return m;
}
const waNum = (ph) => { let d = String(ph || '').replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '88' + d; else if (d.length === 10 && d.startsWith('1')) d = '880' + d; return d; };

// ------------------------------------------------------------------ data access (Supabase, or the portal's demo data)
const Demo = {
  read: (t) => { try { return JSON.parse(localStorage.getItem('sakura_demo_' + t) || '[]'); } catch { return []; } },
  write: (t, rows) => localStorage.setItem('sakura_demo_' + t, JSON.stringify(rows)),
  user() { try { return JSON.parse(localStorage.getItem('sakura_demo_student_user') || 'null'); } catch { return null; } },
  uid() { const u = this.user(); return u ? 'demo-student:' + u.email : null; },
  levels: (s) => [...new Set([...(s.package || '').split('+'), s.current_level].filter(x => ['N5', 'N4', 'N3'].includes(x)))],
  me() {
    const uid = this.uid(); if (!uid) return null;
    const st = (() => { try { return JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); } catch { return {}; } })();
    const inst = { bn: st.institute_bn || 'সাকুরা জাপানিজ ইনস্টিটিউট', phone: st.phone || '', whatsapp: st.whatsapp || '' };
    const s = this.read('students').find(x => x.auth_user_id === uid);
    if (!s) return { linked: false, staff: false, institute: inst };
    const net = Math.max(0, num(s.total_fee) - num(s.discount));
    const paid = this.read('payments').filter(p => p.student_id === s.id && p.purpose !== 'processing').reduce((a, p) => a + num(p.amount), 0);
    const due = Math.max(0, net - paid);
    const why = s.portal_blocked ? 'blocked' : s.status === 'dropped' ? 'dropped' : due > 0 ? 'due' : null;
    const lv = this.levels(s); const order = { all: 0, N5: 1, N4: 2, N3: 3 };
    const mats = this.read('materials').filter(m => m.published !== false && (m.level === 'all' || lv.includes(m.level)))
      .sort((a, b) => (order[a.level] - order[b.level]) || (num(a.sort_order) - num(b.sort_order)) || String(a.chapter || '').localeCompare(String(b.chapter || '')) || String(a.title).localeCompare(String(b.title)));
    const counts = {}; mats.forEach(m => { counts[m.level] = (counts[m.level] || 0) + 1; });
    return { linked: true, institute: inst, student: { name_bn: s.name_bn, name_en: s.name_en, admission_no: s.admission_no, package: s.package, current_level: s.current_level, batch: s.batch, status: s.status, next_due_date: s.next_due_date },
      levels: lv, fee: { net, paid, due }, blocked: why, counts, materials: why ? [] : mats };
  },
  link(adm, phone) {
    const uid = this.uid(); if (!uid) return 'login';
    const rows = this.read('students'); if (rows.some(x => x.auth_user_id === uid)) return 'already';
    const ph = String(phone || '').replace(/\D/g, '').slice(-10); if (ph.length < 10) return 'bad_phone';
    const d10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);
    const i = rows.findIndex(x => String(x.admission_no || '').trim().toUpperCase() === String(adm || '').trim().toUpperCase() && (d10(x.phone) === ph || d10(x.guardian_phone) === ph));
    if (i < 0) return 'not_found'; if (rows[i].auth_user_id && rows[i].auth_user_id !== uid) return 'taken';
    rows[i].auth_user_id = uid; this.write('students', rows); return 'ok';
  },
  fileUrl(path) { try { return (JSON.parse(localStorage.getItem('sakura_demo_files') || '{}'))[path] || ''; } catch { return ''; } }
};
const API = {
  async session() { if (DEMO) return Demo.user(); const { data } = await sb.auth.getSession(); return data.session ? data.session.user : null; },
  async me() { if (DEMO) return Demo.me(); const { data, error } = await sb.rpc('student_me'); if (error) throw error; return data; },
  async link(a, p) { if (DEMO) return Demo.link(a, p); const { data, error } = await sb.rpc('link_student', { p_admission_no: a, p_phone: p }); if (error) throw error; return data; },
  async fileUrl(path) { if (DEMO) return Demo.fileUrl(path); const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; },
  async signIn(email, password) { if (DEMO) { localStorage.setItem('sakura_demo_student_user', JSON.stringify({ email })); return; } const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; },
  async signUp(email, password) {
    if (DEMO) { localStorage.setItem('sakura_demo_student_user', JSON.stringify({ email })); return { session: true }; }
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error;
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('already registered');
    return { session: !!data.session };
  },
  async reset(email) { if (DEMO) return; const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw error; },
  async newPassword(pw) { const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error; },
  async signOut() { if (DEMO) { localStorage.removeItem('sakura_demo_student_user'); return; } await sb.auth.signOut(); }
};

// ------------------------------------------------------------------ screens
const shellCard = (inner) => `<div class="login"><div class="card" style="max-width:420px"><div class="kamon" style="width:56px;height:56px">${KAMON}</div>${inner}</div></div>`;

function renderAuth(mode = 'in', note = '') {
  document.title = 'ছাত্রদের সাইট · সাকুরা';
  $('#app').innerHTML = shellCard(`
    <h1>ছাত্রদের সাইট</h1><p class="muted" style="margin:0 0 14px">সাকুরা জাপানিজ ইনস্টিটিউটের ভর্তি হওয়া ছাত্র-ছাত্রীদের পড়ার নোট, শিট আর অডিও</p>
    ${DEMO ? '<div class="demo-bar">ডেমো মোড: যেকোনো ইমেইল দিয়ে ঢুকে দেখুন। পোর্টালের ডেমো তথ্য ব্যবহার হবে।</div>' : ''}
    <div class="authtabs"><button data-m="in" class="${mode === 'in' ? 'on' : ''}">লগইন</button><button data-m="up" class="${mode === 'up' ? 'on' : ''}">নতুন অ্যাকাউন্ট</button></div>
    <form id="af" autocomplete="on">
      <label class="f">ইমেইল<input name="email" type="email" required autocomplete="username" inputmode="email"></label>
      ${mode === 'reset' ? '' : `<label class="f" style="margin-top:10px">পাসওয়ার্ড${mode === 'up' ? ' (অন্তত ৮ অক্ষর)' : ''}<input name="password" type="password" required minlength="${mode === 'up' ? 8 : 1}" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}"></label>`}
      ${mode === 'up' ? '<label class="f" style="margin-top:10px">আবার পাসওয়ার্ড<input name="password2" type="password" required minlength="8" autocomplete="new-password"></label>' : ''}
      <button class="btn" type="submit" style="width:100%;justify-content:center;margin-top:16px">${mode === 'up' ? 'অ্যাকাউন্ট খুলুন' : mode === 'reset' ? 'রিসেট লিংক পাঠান' : 'লগইন'}</button>
      <div class="msg ${note && note.startsWith('!') ? 'err' : 'ok'}" id="am">${esc(note.replace(/^!/, ''))}</div>
      ${mode === 'in' && !DEMO ? '<p style="margin:12px 0 0"><button type="button" class="linkbtn" id="fg">পাসওয়ার্ড ভুলে গেছেন?</button></p>' : ''}
      ${mode === 'reset' ? '<p style="margin:12px 0 0"><button type="button" class="linkbtn" data-m="in">← লগইনে ফিরে যান</button></p>' : ''}
    </form>
    <p class="small muted" style="margin:16px 0 0">স্টাফ? <a href="../">স্টাফ পোর্টালে যান</a></p>`);
  $$('[data-m]').forEach(b => b.onclick = () => renderAuth(b.dataset.m));
  const fg = $('#fg'); if (fg) fg.onclick = () => renderAuth('reset');
  $('#af').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const btn = f.querySelector('button[type=submit]'); const am = $('#am');
    const email = f.email.value.trim().toLowerCase(); am.className = 'msg'; am.textContent = '';
    if (mode === 'up' && f.password.value !== f.password2.value) { am.className = 'msg err'; am.textContent = 'দুটো পাসওয়ার্ড মেলেনি।'; return; }
    btn.disabled = true;
    try {
      if (mode === 'reset') { await API.reset(email); am.className = 'msg ok'; am.textContent = 'ইমেইলে পাসওয়ার্ড বদলানোর লিংক পাঠানো হয়েছে (স্প্যাম ফোল্ডারও দেখুন)। ইমেইল না এলে অফিসে যোগাযোগ করুন।'; btn.disabled = false; return; }
      if (mode === 'up') {
        const r = await API.signUp(email, f.password.value);
        if (!r.session) { renderAuth('in', 'অ্যাকাউন্ট খোলা হয়েছে। ইমেইলে পাঠানো লিংকে ক্লিক করে নিশ্চিত করুন, তারপর লগইন করুন।'); return; }
      } else await API.signIn(email, f.password.value);
      start();
    } catch (err) { am.className = 'msg err'; am.textContent = errMsg(err); btn.disabled = false; }
  };
}

function renderNewPassword() {
  $('#app').innerHTML = shellCard(`<h1>নতুন পাসওয়ার্ড দিন</h1>
    <form id="npf"><label class="f">নতুন পাসওয়ার্ড (অন্তত ৮ অক্ষর)<input name="p1" type="password" minlength="8" required autocomplete="new-password"></label>
    <label class="f" style="margin-top:10px">আবার<input name="p2" type="password" minlength="8" required autocomplete="new-password"></label>
    <button class="btn" type="submit" style="width:100%;justify-content:center;margin-top:16px">সংরক্ষণ</button><div class="msg" id="npm"></div></form>`);
  $('#npf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const m = $('#npm');
    if (f.p1.value !== f.p2.value) { m.className = 'msg err'; m.textContent = 'দুটো পাসওয়ার্ড মেলেনি।'; return; }
    try { await API.newPassword(f.p1.value); toast('পাসওয়ার্ড বদলানো হয়েছে'); start(); } catch (err) { m.className = 'msg err'; m.textContent = errMsg(err); }
  };
}

function renderLink(d, user) {
  const I = d.institute || {};
  if (d.staff) {
    $('#app').innerHTML = shellCard(`<h1>এটা স্টাফের অ্যাকাউন্ট</h1><p class="muted">স্টাফের লগইন দিয়ে ছাত্রদের সাইটে ঢোকা যায় না। ছাত্রের নিজের ইমেইল দিয়ে আলাদা অ্যাকাউন্ট খুলুন।</p>
      <div class="row" style="gap:8px;margin-top:14px"><a class="btn" href="../">স্টাফ পোর্টালে যান</a><button class="btn ghost" id="lo">লগআউট</button></div>`);
    $('#lo').onclick = async () => { await API.signOut(); renderAuth(); }; return;
  }
  $('#app').innerHTML = shellCard(`
    <h1>আপনার ভর্তির সাথে যুক্ত করুন</h1>
    <p class="muted" style="margin:0 0 14px">${esc(user && user.email ? user.email : '')} — এই লগইন কোন ছাত্রের, সেটা মিলিয়ে দেখতে ভর্তি নম্বর আর ভর্তির সময় দেওয়া মোবাইল নম্বর লিখুন। আইডি কার্ড বা টাকার রশিদে ভর্তি নম্বর পাবেন।</p>
    <form id="lf">
      <label class="f">ভর্তি নম্বর<input name="adm" required placeholder="যেমন SJI-0001" autocapitalize="characters" autocomplete="off"></label>
      <label class="f" style="margin-top:10px">মোবাইল নম্বর (নিজের বা অভিভাবকের)<input name="phone" type="tel" required inputmode="tel" placeholder="01XXXXXXXXX"></label>
      <button class="btn" type="submit" style="width:100%;justify-content:center;margin-top:16px">যুক্ত করুন</button>
      <div class="msg" id="lm"></div>
    </form>
    <div class="row" style="justify-content:space-between;margin-top:16px;gap:8px">${I.whatsapp || I.phone ? `<a class="small" href="https://wa.me/${waNum(I.whatsapp || I.phone)}" target="_blank" rel="noopener">অফিসে WhatsApp করুন</a>` : '<span></span>'}<button class="linkbtn" id="lo">লগআউট</button></div>`);
  $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  const MSG = { not_found: 'এই ভর্তি নম্বর আর মোবাইল নম্বর মেলেনি। আইডি কার্ড বা রশিদ দেখে আবার লিখুন, অথবা অফিসে জিজ্ঞেস করুন কোন নম্বরটা লেখা আছে।', taken: 'এই ভর্তি নম্বর আগেই অন্য একটা লগইনের সাথে যুক্ত আছে। ভুল হয়ে থাকলে অফিসে জানান।', busy: 'অনেকবার ভুল হয়েছে। ১ ঘণ্টা পরে আবার চেষ্টা করুন, অথবা অফিসে যোগাযোগ করুন।', bad_phone: 'পুরো মোবাইল নম্বর লিখুন (১১ সংখ্যা)।', staff: 'স্টাফের লগইন দিয়ে যুক্ত করা যায় না।', login: 'আবার লগইন করুন।' };
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const btn = f.querySelector('button'); const lm = $('#lm'); btn.disabled = true; lm.textContent = '';
    try {
      const r = await API.link(f.adm.value.trim(), f.phone.value.trim());
      if (r === 'ok' || r === 'already') { toast('যুক্ত হয়েছে'); start(); return; }
      lm.className = 'msg err'; lm.textContent = MSG[r] || r; btn.disabled = false;
    } catch (err) { lm.className = 'msg err'; lm.textContent = errMsg(err); btn.disabled = false; }
  };
}

function matRow(m) {
  const kind = m.kind || 'file';
  const action = m.file_path
    ? (kind === 'audio' ? `<button class="btn sm" data-play="${esc(m.id)}">▶ শুনুন</button>` : kind === 'video' ? `<button class="btn sm" data-play="${esc(m.id)}">▶ দেখুন</button>` : `<button class="btn sm" data-open="${esc(m.id)}">${kind === 'pdf' ? 'পড়ুন' : 'খুলুন'}</button>`)
    : m.url ? `<a class="btn sm" href="${esc(m.url)}" target="_blank" rel="noopener">${kind === 'video' ? '▶ দেখুন' : 'খুলুন'}</a>` : '';
  return `<div class="mat" data-q="${esc(((m.title || '') + ' ' + (m.chapter || '') + ' ' + (m.description || '')).toLowerCase())}"><div class="ic ${esc(kind)}">${esc(KIND[kind] || 'ফাইল')}</div>
    <div class="bd"><b>${esc(m.title)}</b>${m.description ? `<div class="small muted">${esc(m.description)}</div>` : ''}${m.size_bytes ? `<div class="small muted">${fmtSize(m.size_bytes)}</div>` : ''}<div class="player" id="pl-${esc(m.id)}"></div></div>
    <div>${action}</div></div>`;
}

function renderHome(d, user) {
  const I = d.institute || {}; const s = d.student || {}; const fee = d.fee || {}; const mats = d.materials || [];
  document.title = 'ছাত্রদের সাইট · ' + (s.name_bn || s.name_en || 'সাকুরা');
  const wa = waNum(I.whatsapp || I.phone);
  const groups = []; for (const m of mats) { let g = groups.find(x => x.level === m.level); if (!g) groups.push(g = { level: m.level, items: [] }); g.items.push(m); }
  const levelBlock = (g) => { const chaps = []; for (const m of g.items) { const k = m.chapter || ''; let c = chaps.find(x => x.k === k); if (!c) chaps.push(c = { k, items: [] }); c.items.push(m); }
    return `<section data-lv><div class="lvl">${esc(LEVEL_NAME[g.level] || g.level)}</div>${chaps.map(c => `<div data-ch>${c.k ? `<div class="chap">${esc(c.k)}</div>` : ''}<div class="mlist">${c.items.map(matRow).join('')}</div></div>`).join('')}</section>`; };
  const counts = d.counts || {}; const total = Object.values(counts).reduce((a, b) => a + num(b), 0);
  $('#app').innerHTML = `<div class="st">
    <div class="phd"><div class="sw"><span class="kamon">${KAMON}</span><div style="min-width:0"><b>${esc(s.name_bn || s.name_en)}</b><small>${esc(s.admission_no)} · ${esc((d.levels || []).join(', '))}${s.batch && BATCH[s.batch] ? ' · ' + esc(BATCH[s.batch]) : ''}</small></div></div><button class="out" id="lo">লগআউট</button></div>
    ${d.blocked ? `<div class="card lock"><h2 style="margin-top:0">🔒 বইগুলো এখনো বন্ধ</h2><p style="margin:0 0 6px">${esc(WHY[d.blocked] || '')}</p>
      ${d.blocked === 'due' ? `<p style="margin:0">মোট কোর্স ফি ${tk(fee.net)} · পরিশোধ ${tk(fee.paid)} · <b style="color:var(--red)">বাকি ${tk(fee.due)}</b></p><p class="small muted" style="margin:6px 0 0">অফিসে বা বিকাশে টাকা দেওয়ার পর অফিস রশিদ লিখলেই এই পাতা নিজে থেকে খুলে যাবে — আবার লগইন করে দেখুন।</p>` : ''}
      ${total ? `<div class="teaser">${Object.entries(counts).map(([k, n]) => `<span>${esc(LEVEL_NAME[k] || k)}: ${n}টি উপকরণ</span>`).join('')}</div>` : ''}
      ${wa ? `<p style="margin:12px 0 0"><a class="btn sm wa" href="https://wa.me/${wa}?text=${encodeURIComponent(`আসসালামু আলাইকুম। আমি ${s.name_bn || s.name_en} (${s.admission_no})। ছাত্রদের সাইট নিয়ে কথা বলতে চাই।`)}" target="_blank" rel="noopener">অফিসে WhatsApp করুন</a></p>` : ''}</div>`
    : mats.length ? `<div class="card open" style="padding:12px 16px"><b>স্বাগতম!</b> <span class="muted">আপনার লেভেলের ${mats.length}টি উপকরণ নিচে আছে। এগুলো শুধু আপনার নিজের পড়ার জন্য — অন্য কাউকে দেবেন না।</span></div>
      <input class="search" id="q" type="search" placeholder="খুঁজুন: পাঠের নাম, অধ্যায়…" aria-label="খুঁজুন">${groups.map(levelBlock).join('')}<div class="empty" id="none" hidden>কিছু পাওয়া যায়নি</div>`
    : '<div class="card"><div class="empty">আপনার লেভেলের জন্য এখনো কোনো উপকরণ যোগ করা হয়নি। শিগগিরই যোগ হবে।</div></div>'}
    <p class="small muted" style="text-align:center;margin-top:24px">${esc(I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট')}${I.phone ? ' · ' + esc(I.phone) : ''}</p></div>`;
  $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  const byId = (id) => mats.find(m => String(m.id) === String(id));
  $$('[data-open]').forEach(b => b.onclick = async () => {
    const m = byId(b.dataset.open); const w = window.open('', '_blank'); b.disabled = true;
    try { const u = await API.fileUrl(m.file_path); if (!u) throw new Error('ফাইল পাওয়া যায়নি'); if (w) w.location = u; else location.href = u; } catch (e) { if (w) w.close(); toast(errMsg(e), true); }
    b.disabled = false;
  });
  $$('[data-play]').forEach(b => b.onclick = async () => {
    const m = byId(b.dataset.play); const box = $('#pl-' + CSS.escape(String(m.id))); b.disabled = true;
    try { const u = await API.fileUrl(m.file_path); if (!u) throw new Error('ফাইল পাওয়া যায়নি'); box.innerHTML = m.kind === 'audio' ? `<audio controls autoplay controlsList="nodownload" src="${esc(u)}"></audio>` : `<video controls autoplay playsinline controlsList="nodownload" src="${esc(u)}"></video>`; b.style.display = 'none'; }
    catch (e) { toast(errMsg(e), true); b.disabled = false; }
  });
  const q = $('#q'); if (q) q.oninput = () => {
    const t = q.value.trim().toLowerCase(); let any = false;
    $$('.mat').forEach(el => { const ok = !t || el.dataset.q.includes(t); el.hidden = !ok; any = any || ok; });
    $$('[data-ch]').forEach(c => { c.hidden = !$$('.mat', c).some(el => !el.hidden); });
    $$('[data-lv]').forEach(c => { c.hidden = !$$('.mat', c).some(el => !el.hidden); });
    $('#none').hidden = any;
  };
}

async function start() {
  $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>';
  try {
    const user = await API.session();
    if (!user) return renderAuth();
    const d = await API.me();
    if (!d) return renderAuth();
    if (!d.linked) return renderLink(d, user);
    renderHome(d, user);
  } catch (e) {
    $('#app').innerHTML = shellCard(`<h1>সমস্যা হয়েছে</h1><p>${esc(errMsg(e))}</p><div class="row" style="gap:8px"><button class="btn" id="rt">আবার চেষ্টা</button><button class="btn ghost" id="lo">লগআউট</button></div>`);
    $('#rt').onclick = start; $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  }
}

if (sb) sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') renderNewPassword(); });
if (!DEMO && /type=recovery/.test(location.hash)) setTimeout(() => { if (!$('#npf')) start(); }, 5000); // the recovery event above shows the new-password form
else start();
