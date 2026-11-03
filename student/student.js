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
const KIND = { book: 'বই', pdf: 'PDF', audio: 'অডিও', video: 'ভিডিও', image: 'ছবি', link: 'লিংক', file: 'ফাইল' };
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
  fileUrl(path) { try { return (JSON.parse(localStorage.getItem('sakura_demo_files') || '{}'))[path] || ''; } catch { return ''; } },
  // ---- demo mock tests: same rules and results as the database functions
  student() { const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) throw new Error('not_linked'); const d = this.me(); if (d.blocked) throw new Error('locked'); return s; },
  secRank: (x) => ({ vocab: 1, grammar: 2, reading: 3, listening: 4 }[x] || 5),
  qsOf(tid) { return this.read('mock_questions').filter(q => q.test_id === tid).sort((a, b) => (this.secRank(a.section) - this.secRank(b.section)) || (num(a.sort_order) - num(b.sort_order))); },
  testFor(s, id) { const t = this.read('mock_tests').find(x => x.id === id && x.published && this.levels(s).includes(x.level)); if (!t) throw new Error('not_found'); return t; },
  mockList() {
    let s; try { s = this.student(); } catch { return []; }
    const att = this.read('mock_attempts').filter(a => a.student_id === s.id); const lv = this.levels(s);
    return this.read('mock_tests').filter(t => t.published && lv.includes(t.level) && this.qsOf(t.id).length).sort((a, b) => (lv.indexOf(a.level) - lv.indexOf(b.level)) || (num(a.sort_order) - num(b.sort_order))).map(t => {
      const done = att.filter(a => a.test_id === t.id && a.submitted_at).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
      const open = att.find(a => a.test_id === t.id && !a.submitted_at && Date.parse(a.deadline) > Date.now());
      return { id: t.id, title: t.title, level: t.level, description: t.description, duration_min: t.duration_min, pass_pct: t.pass_pct, max_attempts: t.max_attempts, questions: this.qsOf(t.id).length, attempts: done.length, best: done.length ? Math.max(...done.map(a => a.score)) : null, last_attempt: done[0] ? done[0].id : null, open_attempt: open ? open.id : null };
    });
  },
  grade(aid, reason = 'submit') {
    const all = this.read('mock_attempts'); const a = all.find(x => x.id === aid); const t = this.read('mock_tests').find(x => x.id === a.test_id);
    if (!a.submitted_at) {
      let sc = 0, tot = 0; const secs = {};
      let ans = 0;
      for (const q of this.qsOf(t.id)) { const v = a.answers[q.id]; const ok = v != null && String(v) === String(q.correct); tot++; if (ok) sc++; if (v != null) ans++; const x = secs[q.section] || (secs[q.section] = { score: 0, total: 0 }); x.total++; if (ok) x.score++; }
      const late = Date.now() > Date.parse(a.deadline) + 30000;
      Object.assign(a, { submitted_at: new Date(Math.min(Date.now(), Date.parse(a.deadline) + 120000)).toISOString(), score: sc, total: tot, answered: ans, sections: secs, end_reason: late && reason !== 'left' ? 'timeout' : reason }); this.write('mock_attempts', all);
      const exams = this.read('exams'); let ex = exams.find(e => e.id === t.exam_id);
      if (!ex) { ex = { id: 'ex-' + t.id, exam_date: new Date().toISOString().slice(0, 10), title: 'অনলাইন মক: ' + t.title, type: 'mock', level: t.level, batch: 'all', max_marks: tot, pass_marks: Math.ceil(tot * t.pass_pct / 100), created_at: new Date().toISOString() }; exams.push(ex); this.write('exams', exams); const ts = this.read('mock_tests'); ts.find(x => x.id === t.id).exam_id = ex.id; this.write('mock_tests', ts); }
      const best = Math.max(...all.filter(x => x.test_id === t.id && x.student_id === a.student_id && x.submitted_at).map(x => x.score));
      const rs = this.read('exam_results'); const r = rs.find(x => x.exam_id === ex.id && x.student_id === a.student_id);
      if (r) Object.assign(r, { marks: best, absent: false, note: 'অনলাইনে দিয়েছে' }); else rs.push({ id: 'er-' + aid, exam_id: ex.id, student_id: a.student_id, marks: best, absent: false, note: 'অনলাইনে দিয়েছে' }); this.write('exam_results', rs);
    }
    return this.review(aid);
  },
  review(aid) {
    const a = this.read('mock_attempts').find(x => x.id === aid); const t = this.read('mock_tests').find(x => x.id === a.test_id);
    return { attempt_id: a.id, test: { id: t.id, title: t.title, level: t.level, pass_pct: t.pass_pct }, started_at: a.started_at, submitted_at: a.submitted_at, score: a.score, total: a.total, answered: a.answered, end_reason: a.end_reason, sections: a.sections,
      passed: a.total > 0 && a.score * 100 >= t.pass_pct * a.total, show_answers: t.show_answers !== false,
      questions: t.show_answers === false ? [] : this.qsOf(t.id).map(q => ({ id: q.id, section: q.section, passage: q.passage, question: q.question, options: q.options, script: q.script, correct: q.correct, explanation: q.explanation, mine: a.answers[q.id] ?? null })) };
  },
  mockStart(id) {
    const s = this.student(); const t = this.testFor(s, id);
    let closed = null;
    this.read('mock_attempts').filter(a => a.student_id === s.id && !a.submitted_at).forEach(a => { this.grade(a.id, Date.parse(a.deadline) < Date.now() ? 'timeout' : 'left'); closed = closed || a.id; });
    const all = this.read('mock_attempts');
    if (t.max_attempts && all.filter(x => x.test_id === t.id && x.student_id === s.id && x.submitted_at).length >= t.max_attempts) throw new Error('limit');
    const a = { id: 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), test_id: t.id, student_id: s.id, started_at: new Date().toISOString(), deadline: new Date(Date.now() + t.duration_min * 60000).toISOString(), submitted_at: null, answers: {} }; all.push(a); this.write('mock_attempts', all);
    return { attempt_id: a.id, deadline: a.deadline, now: new Date().toISOString(), answers: a.answers, closed_previous: closed, test: { id: t.id, title: t.title, level: t.level, duration_min: t.duration_min, pass_pct: t.pass_pct },
      questions: this.qsOf(t.id).map(q => ({ id: q.id, section: q.section, passage: q.passage, question: q.question, options: q.options, script: q.script, audio_path: q.audio_path || null })) };
  },
  mockSave(aid, answers) { const s = this.student(); const all = this.read('mock_attempts'); const a = all.find(x => x.id === aid && x.student_id === s.id && !x.submitted_at && Date.now() <= Date.parse(x.deadline) + 120000); if (!a) return 'closed'; a.answers = answers || {}; this.write('mock_attempts', all); return 'ok'; },
  mockSubmit(aid, answers, reason = 'submit') { const s = this.student(); if (!this.read('mock_attempts').some(x => x.id === aid && x.student_id === s.id)) throw new Error('not_found'); this.mockSave(aid, answers); return this.grade(aid, reason); },
  mockLeave(aid, answers) { const s = this.student(); if (!this.read('mock_attempts').some(x => x.id === aid && x.student_id === s.id && !x.submitted_at)) return 'closed'; this.mockSave(aid, answers); this.grade(aid, 'left'); return 'ok'; },
  mockHistory() { let s; try { s = this.student(); } catch { return []; } const ts = this.read('mock_tests'); return this.read('mock_attempts').filter(a => a.student_id === s.id && a.submitted_at).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)).map(a => { const t = ts.find(x => x.id === a.test_id) || {}; return { attempt_id: a.id, test_id: a.test_id, title: t.title, level: t.level, pass_pct: t.pass_pct, started_at: a.started_at, submitted_at: a.submitted_at, score: a.score, total: a.total, answered: a.answered, end_reason: a.end_reason }; }); },
  mockReview(aid) { const s = this.student(); if (!this.read('mock_attempts').some(x => x.id === aid && x.student_id === s.id && x.submitted_at)) throw new Error('not_found'); return this.review(aid); },
};

// ------------------------------------------------------------------ preview for portal logins (director / teachers)
// A director or teacher sees the student site as a student would: every level, every material and every
// mock test (hidden ones marked). Tests are graded in the browser; nothing is saved anywhere.
let PREVIEW = null;
const SEC_RANK = { vocab: 1, grammar: 2, reading: 3, listening: 4 };
const Preview = {
  async load(user, d) {
    const [{ data: prof }, mats, tests] = await Promise.all([
      sb.from('profiles').select('name, role').eq('id', user.id).maybeSingle(),
      sb.from('materials').select('id, title, level, kind, chapter, description, file_path, file_name, size_bytes, url, published, sort_order').order('sort_order'),
      sb.from('mock_tests').select('id, title, level, category, description, duration_min, pass_pct, max_attempts, published, show_answers, sort_order, created_at, mock_questions(count)')]);
    if (mats.error) throw mats.error; if (tests.error) throw tests.error;
    const lvRank = (l) => ({ all: 0, N5: 1, N4: 2, N3: 3 }[l] ?? 9);
    const materials = (mats.data || []).sort((a, b) => (lvRank(a.level) - lvRank(b.level)) || (num(a.sort_order) - num(b.sort_order)) || String(a.chapter || '').localeCompare(String(b.chapter || '')));
    const mocks = (tests.data || []).map(t => ({ ...t, questions: (t.mock_questions && t.mock_questions[0] ? t.mock_questions[0].count : 0), attempts: 0, best: null, last_attempt: null, hidden: !t.published }))
      .filter(t => t.questions > 0).sort((a, b) => (lvRank(a.level) - lvRank(b.level)) || (num(a.sort_order) - num(b.sort_order)));
    const counts = {}; materials.forEach(m => { counts[m.level] = (counts[m.level] || 0) + 1; });
    const role = prof ? prof.role : '';
    PREVIEW = { attempts: {}, n: 0 };
    return { linked: true, preview: true, institute: d.institute, levels: ['N5', 'N4', 'N3'], counts, materials, mocks, history: [], fee: {},
      student: { name_bn: prof ? prof.name : (user.email || ''), admission_no: role === 'admin' ? 'পরিচালক · প্রিভিউ' : role === 'teacher' ? 'শিক্ষক · প্রিভিউ' : 'স্টাফ · প্রিভিউ' } };
  },
  async start(id) {
    const [{ data: t, error: e1 }, { data: qs, error: e2 }] = await Promise.all([
      sb.from('mock_tests').select('*').eq('id', id).single(),
      sb.from('mock_questions').select('*').eq('test_id', id)]);
    if (e1) throw e1; if (e2) throw e2;
    const list = (qs || []).sort((a, b) => ((SEC_RANK[a.section] || 9) - (SEC_RANK[b.section] || 9)) || (num(a.sort_order) - num(b.sort_order)));
    const aid = 'preview-' + (++PREVIEW.n); const now = new Date();
    PREVIEW.attempts[aid] = { t, qs: list, answers: {}, started_at: now.toISOString(), deadline: new Date(now.getTime() + t.duration_min * 60000).toISOString(), result: null };
    return { attempt_id: aid, deadline: PREVIEW.attempts[aid].deadline, now: now.toISOString(), answers: {}, test: { id: t.id, title: t.title, level: t.level, duration_min: t.duration_min, pass_pct: t.pass_pct },
      questions: list.map(q => ({ id: q.id, section: q.section, passage: q.passage, question: q.question, options: q.options, script: q.script, audio_path: q.audio_path })) };
  },
  save(aid, ans) { const a = PREVIEW.attempts[aid]; if (a && !a.result) a.answers = { ...ans }; return 'ok'; },
  grade(aid, ans, reason) {
    const a = PREVIEW.attempts[aid]; if (!a) throw new Error('not_found');
    if (!a.result) {
      if (ans) a.answers = { ...ans };
      let score = 0, answered = 0; const sections = {};
      for (const q of a.qs) { const v = a.answers[q.id]; const ok = v != null && Number(v) === Number(q.correct); if (v != null) answered++; if (ok) score++;
        const s = sections[q.section] || (sections[q.section] = { score: 0, total: 0 }); s.total++; if (ok) s.score++; }
      const total = a.qs.length; const late = Date.now() > Date.parse(a.deadline) + 30000;
      a.result = { attempt_id: aid, preview: true, test: { id: a.t.id, title: a.t.title, level: a.t.level, pass_pct: a.t.pass_pct }, started_at: a.started_at, submitted_at: new Date().toISOString(),
        score, total, answered, sections, end_reason: late && reason !== 'left' ? 'timeout' : reason, passed: total > 0 && score * 100 >= a.t.pass_pct * total, show_answers: true,
        questions: a.qs.map(q => ({ id: q.id, section: q.section, passage: q.passage, question: q.question, options: q.options, script: q.script, correct: q.correct, explanation: q.explanation, mine: a.answers[q.id] ?? null })) };
    }
    return a.result;
  }
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
  async mockList() { if (DEMO) return Demo.mockList(); const { data, error } = await sb.rpc('student_mock_list'); if (error) throw error; return data || []; },
  async mockStart(id) { if (PREVIEW) return Preview.start(id); if (!DEMO) { const { data: ss } = await sb.auth.getSession(); API._token = ss.session ? ss.session.access_token : null; } if (DEMO) return Demo.mockStart(id); const { data, error } = await sb.rpc('student_mock_start', { p_test: id }); if (error) throw error; return data; },
  async mockSave(aid, ans) { if (PREVIEW) return Preview.save(aid, ans); if (DEMO) return Demo.mockSave(aid, ans); const { data, error } = await sb.rpc('student_mock_save', { p_attempt: aid, p_answers: ans }); if (error) throw error; return data; },
  async mockSubmit(aid, ans, reason = 'submit') { if (PREVIEW) return Preview.grade(aid, ans, reason); if (DEMO) return Demo.mockSubmit(aid, ans, reason); const { data, error } = await sb.rpc('student_mock_submit', { p_attempt: aid, p_answers: ans, p_reason: reason }); if (error) throw error; return data; },
  async mockLeave(aid, ans) { if (PREVIEW) { Preview.grade(aid, ans, 'left'); return 'ok'; } if (DEMO) return Demo.mockLeave(aid, ans); const { data, error } = await sb.rpc('student_mock_leave', { p_attempt: aid, p_answers: ans }); if (error) throw error; return data; },
  async mockHistory() { if (DEMO) return Demo.mockHistory(); const { data, error } = await sb.rpc('student_mock_history'); if (error) throw error; return data || []; },
  mockLeaveBeacon(aid, ans) { // keepalive request: still delivered while the tab is being hidden or closed
    if (PREVIEW) { try { Preview.grade(aid, ans, 'left'); } catch (e) {} return; }
    if (DEMO) { try { Demo.mockLeave(aid, ans); } catch (e) {} return; }
    const tok = API._token; if (!tok) return;
    try { fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/student_mock_leave', { method: 'POST', keepalive: true, headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_attempt: aid, p_answers: ans }) }).catch(() => {}); } catch (e) {}
  },
  _token: null,
  async mockReview(aid) { if (PREVIEW) return Preview.grade(aid, null, 'submit'); if (DEMO) return Demo.mockReview(aid); const { data, error } = await sb.rpc('student_mock_review', { p_attempt: aid }); if (error) throw error; return data; },
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

// an HTML book lives in private storage, which serves it as plain text; it is opened from a local copy
async function bookBlobUrl(u) { const r = await fetch(u); if (!r.ok) throw new Error('বইটি খোলা যায়নি (' + r.status + ')'); return URL.createObjectURL(new Blob([await r.text()], { type: 'text/html;charset=utf-8' })); }
function matRow(m) {
  const kind = m.kind || 'file';
  const action = m.file_path
    ? (kind === 'book' ? `<button class="btn sm" data-open="${esc(m.id)}">📖 পড়ুন</button>` : kind === 'audio' ? `<button class="btn sm" data-play="${esc(m.id)}">▶ শুনুন</button>` : kind === 'video' ? `<button class="btn sm" data-play="${esc(m.id)}">▶ দেখুন</button>` : `<button class="btn sm" data-open="${esc(m.id)}">${kind === 'pdf' ? 'পড়ুন' : 'খুলুন'}</button>`)
    : m.url ? `<a class="btn sm" href="${esc(m.url)}" target="_blank" rel="noopener">${kind === 'video' ? '▶ দেখুন' : 'খুলুন'}</a>` : '';
  return `<div class="mat" data-q="${esc(((m.title || '') + ' ' + (m.chapter || '') + ' ' + (m.description || '')).toLowerCase())}"><div class="ic ${esc(kind)}">${esc(KIND[kind] || 'ফাইল')}</div>
    <div class="bd"><b>${esc(m.title)}</b>${m.published === false ? ' <span class="hidtag">লুকানো</span>' : ''}${m.description ? `<div class="small muted">${esc(m.description)}</div>` : ''}${m.size_bytes ? `<div class="small muted">${fmtSize(m.size_bytes)}</div>` : ''}<div class="player" id="pl-${esc(m.id)}"></div></div>
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
    ${d.preview ? `<div class="pvbar"><b>👁 প্রিভিউ</b> — ছাত্ররা যা দেখে, আপনি সেটাই দেখছেন। সব লেভেল দেখা যাচ্ছে, আর <span class="hidtag">লুকানো</span> চিহ্ন দেওয়া জিনিস ছাত্ররা এখনো দেখে না। এখানে টেস্ট দিলে নম্বর কোথাও জমা হয় না। <a href="../#/mocks">পোর্টালে ফিরুন</a></div>` : ''}
    ${d.blocked ? `<div class="card lock"><h2 style="margin-top:0">🔒 বইগুলো এখনো বন্ধ</h2><p style="margin:0 0 6px">${esc(WHY[d.blocked] || '')}</p>
      ${d.blocked === 'due' ? `<p style="margin:0">মোট কোর্স ফি ${tk(fee.net)} · পরিশোধ ${tk(fee.paid)} · <b style="color:var(--red)">বাকি ${tk(fee.due)}</b></p><p class="small muted" style="margin:6px 0 0">অফিসে বা বিকাশে টাকা দেওয়ার পর অফিস রশিদ লিখলেই এই পাতা নিজে থেকে খুলে যাবে — আবার লগইন করে দেখুন।</p>` : ''}
      ${total ? `<div class="teaser">${Object.entries(counts).map(([k, n]) => `<span>${esc(LEVEL_NAME[k] || k)}: ${n}টি উপকরণ</span>`).join('')}</div>` : ''}
      ${wa ? `<p style="margin:12px 0 0"><a class="btn sm wa" href="https://wa.me/${wa}?text=${encodeURIComponent(`আসসালামু আলাইকুম। আমি ${s.name_bn || s.name_en} (${s.admission_no})। ছাত্রদের সাইট নিয়ে কথা বলতে চাই।`)}" target="_blank" rel="noopener">অফিসে WhatsApp করুন</a></p>` : ''}</div>`
    : `<div class="authtabs" style="margin:0 0 14px"><button data-ht="mat" class="${HOME_TAB !== 'mock' ? 'on' : ''}">📚 পড়ার উপকরণ (${mats.length})</button><button data-ht="mock" class="${HOME_TAB === 'mock' ? 'on' : ''}">📝 মক টেস্ট (${(d.mocks || []).length})</button></div>
      ${HOME_TAB === 'mock' ? mockListHtml(d.mocks || []) + historyHtml(d.history || []) : mats.length ? `<div class="card open" style="padding:12px 16px"><b>স্বাগতম!</b> <span class="muted">আপনার লেভেলের ${mats.length}টি উপকরণ নিচে আছে। এগুলো শুধু আপনার নিজের পড়ার জন্য — অন্য কাউকে দেবেন না।</span></div>
      <input class="search" id="q" type="search" placeholder="খুঁজুন: পাঠের নাম, অধ্যায়…" aria-label="খুঁজুন">${groups.map(levelBlock).join('')}<div class="empty" id="none" hidden>কিছু পাওয়া যায়নি</div>`
      : '<div class="card"><div class="empty">আপনার লেভেলের জন্য এখনো কোনো উপকরণ যোগ করা হয়নি। শিগগিরই যোগ হবে।</div></div>'}`}
    <p class="small muted" style="text-align:center;margin-top:24px">${esc(I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট')}${I.phone ? ' · ' + esc(I.phone) : ''}</p></div>`;
  $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  $$('[data-ht]').forEach(b => b.onclick = () => { HOME_TAB = b.dataset.ht; renderHome(d, user); });
  $$('[data-mc]').forEach(b => b.onclick = () => { MOCK_CAT_TAB = b.dataset.mc; renderHome(d, user); });
  $$('[data-start]').forEach(b => b.onclick = () => askStartMock(b.dataset.start));
  $$('[data-rev]').forEach(b => b.onclick = () => showReview(b.dataset.rev));
  const byId = (id) => mats.find(m => String(m.id) === String(id));
  $$('[data-open]').forEach(b => b.onclick = async () => {
    const m = byId(b.dataset.open); const w = window.open('', '_blank'); b.disabled = true;
    try { const u = await API.fileUrl(m.file_path); if (!u) throw new Error('ফাইল পাওয়া যায়নি'); const go = m.kind === 'book' ? await bookBlobUrl(u) : u; if (w) w.location = go; else location.href = go; } catch (e) { if (w) w.close(); toast(errMsg(e), true); }
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


// ------------------------------------------------------------------ online mock tests
const SEC = { vocab: 'শব্দ ও কানজি', grammar: 'ব্যাকরণ', reading: 'পড়া (読解)', listening: 'শোনা (聴解)' };
const ABCD = ['ক', 'খ', 'গ', 'ঘ'];
const MOCK_ERR = { limit: 'এই টেস্ট যতবার দেওয়া যায়, তা শেষ হয়ে গেছে।', locked: 'পুরো কোর্স ফি পরিশোধ হলে মক টেস্ট দেওয়া যাবে।', not_found: 'টেস্টটি এখন পাওয়া যাচ্ছে না।', busy: 'অল্প সময়ে অনেকবার শুরু করা হয়েছে, কিছুক্ষণ পরে চেষ্টা করুন।', not_linked: 'আবার লগইন করুন।' };
const mockErr = (e) => { const m = errMsg(e); const k = Object.keys(MOCK_ERR).find(x => m.includes(x)); return k ? MOCK_ERR[k] : m; };
const optsOf = (q) => Array.isArray(q.options) ? q.options : (() => { try { return JSON.parse(q.options); } catch { return []; } })();
const fmtClock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function speakJa(text, onEnd) {
  if (!('speechSynthesis' in window)) { toast('এই ব্রাউজারে শোনার সুবিধা নেই — Chrome ব্যবহার করুন', true); return false; }
  speechSynthesis.cancel();
  const clean = String(text || '').split('\n').map(l => l.replace(/^[^：:\s]{1,6}[：:]\s*/, '')).join('。');
  const u = new SpeechSynthesisUtterance(clean); u.lang = 'ja-JP'; u.rate = 0.9;
  const v = speechSynthesis.getVoices().find(x => /^ja/i.test(x.lang)); if (v) u.voice = v;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u); return !!v;
}
if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }

const localD = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; };
function historyHtml(h) {
  if (!h.length) return '';
  return `<h2 class="lvl" style="margin-top:26px">আমার ফলাফল (${h.length})</h2><div class="card" style="padding:0;overflow:hidden"><table class="hist"><tr><th>তারিখ</th><th>টেস্ট</th><th class="num">নম্বর</th><th>সঠিক · ভুল · বাদ</th><th></th></tr>${h.map(a => { const cn = attemptCounts(a); const p = a.total ? Math.round(a.score * 100 / a.total) : 0;
    return `<tr data-rev="${esc(a.attempt_id)}"><td>${localD(a.submitted_at)}</td><td>${esc(a.title)}${a.end_reason === 'left' ? ' <span class="lefttag">পাতা ছেড়েছিলেন</span>' : a.end_reason === 'timeout' ? ' <span class="small muted">(সময় শেষ)</span>' : ''}</td><td class="num"><b style="color:${p >= a.pass_pct ? 'var(--green)' : 'var(--red)'}">${a.score}/${a.total}</b><div class="small muted">${p}%</div></td><td class="small">${cn.score} · ${cn.wrong} · ${cn.blank}</td><td>›</td></tr>`; }).join('')}</table></div>`;
}
const MOCK_CAT = { full: 'পূর্ণ মক টেস্ট', kanji: 'কানজি', grammar: 'ব্যাকরণ', listening: 'শোনার অনুশীলন', other: 'অন্যান্য' };
const MOCK_CAT_ORDER = ['full', 'kanji', 'grammar', 'listening', 'other'];
let MOCK_CAT_TAB = '';
function mockCat(t) {
  if (MOCK_CAT[t.category] && t.category !== 'other') return t.category;
  const x = String(t.title || '');
  return /মক টেস্ট/.test(x) ? 'full' : /কানজি/.test(x) ? 'kanji' : /ব্যাকরণ/.test(x) ? 'grammar' : /শোনা/.test(x) ? 'listening' : 'other';
}
function mockRow(t) {
  const p = t.best != null && t.questions ? Math.round(t.best * 100 / t.questions) : null; const left = t.max_attempts ? t.max_attempts - t.attempts : null;
  return `<div class="mat"><div class="ic">${esc(t.level)}</div><div class="bd"><b>${esc(t.title)}</b>${t.hidden ? ' <span class="hidtag">লুকানো</span>' : ''}<div class="small muted">${t.questions}টি প্রশ্ন · ${t.duration_min} মিনিট · পাস ${t.pass_pct}%${left != null ? ` · আর ${Math.max(0, left)} বার দেওয়া যাবে` : ''}</div>
      ${t.attempts ? `<div class="small" style="margin-top:2px">দিয়েছেন ${t.attempts} বার · সেরা <b style="color:${p >= t.pass_pct ? 'var(--green)' : 'var(--red)'}">${t.best}/${t.questions} (${p}%)</b></div>` : ''}</div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">${left === 0 ? '' : `<button class="btn sm" data-start="${esc(t.id)}">${t.attempts ? 'আবার দিন' : 'শুরু করুন'}</button>`}${t.last_attempt ? `<button class="btn sm ghost" data-rev="${esc(t.last_attempt)}">ফলাফল</button>` : ''}</div></div>`;
}
function mockListHtml(list) {
  if (!list.length) return '<div class="card"><div class="empty">আপনার লেভেলের জন্য এখনো কোনো মক টেস্ট চালু করা হয়নি।</div></div>';
  const cats = MOCK_CAT_ORDER.filter(c => list.some(t => mockCat(t) === c));
  const cur = cats.includes(MOCK_CAT_TAB) ? MOCK_CAT_TAB : '';
  const shown = cur ? cats.filter(c => c === cur) : cats;
  const levels = [...new Set(list.map(t => t.level))];
  return `${cats.length > 1 ? `<div class="mchips"><button data-mc="" class="${!cur ? 'on' : ''}">সব (${list.length})</button>${cats.map(c => `<button data-mc="${c}" class="${cur === c ? 'on' : ''}">${MOCK_CAT[c]} (${list.filter(t => mockCat(t) === c).length})</button>`).join('')}</div>` : ''}
  ${shown.map(c => { const xs = list.filter(t => mockCat(t) === c);
    return `<div class="lvl">${MOCK_CAT[c]}</div>${levels.length > 1 ? levels.map(l => { const ys = xs.filter(t => t.level === l); return ys.length ? `<div class="chap">${esc(l)}</div><div class="mlist">${ys.map(mockRow).join('')}</div>` : ''; }).join('') : `<div class="mlist">${xs.map(mockRow).join('')}</div>`}`; }).join('')}`;
}

function confirmOverlay(text, ok = 'হ্যাঁ') {
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'ovl';
    el.innerHTML = `<div class="card" style="max-width:360px"><p style="margin:0 0 14px;line-height:1.6">${esc(text)}</p><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn ghost" data-a="no">না</button><button class="btn" data-a="yes">${esc(ok)}</button></div></div>`;
    el.onclick = (e) => { const a = e.target.dataset.a; if (!a) return; el.remove(); res(a === 'yes'); };
    document.body.appendChild(el);
  });
}

let EXAM = null;
const END_REASON = { submit: 'নিজে জমা দিয়েছেন', timeout: 'সময় শেষ হয়ে জমা হয়েছে', left: 'পরীক্ষার পাতা ছেড়ে যাওয়ায় জমা হয়েছে' };
const EXAM_RULES = 'পরীক্ষা শুরু হলে:\n• অন্য অ্যাপ বা ট্যাবে গেলে, ফোন লক করলে, বা পাতা বন্ধ/রিফ্রেশ করলে পরীক্ষা সঙ্গে সঙ্গে জমা হয়ে শেষ হয়ে যাবে।\n• তখন পর্যন্ত যা উত্তর দিয়েছেন, সেটাই গোনা হবে; বাকিগুলো "উত্তর দেননি" ধরা হবে।\n• ফোনে কল এলেও পরীক্ষা শেষ হয়ে যেতে পারে — চুপচাপ জায়গায় বসে দিন।\n• প্রতিবার শুরু করা একটা নতুন চেষ্টা হিসেবে গোনা হয়, আর শিক্ষক সব চেষ্টা দেখতে পান।';
async function askStartMock(id) {
  if (!(await confirmOverlay(PREVIEW ? EXAM_RULES + '\n\n(প্রিভিউ: ছাত্রের মতোই চলবে, তবে নম্বর কোথাও জমা হবে না।)' : EXAM_RULES, 'বুঝেছি, শুরু করুন'))) return;
  startMock(id);
}
async function startMock(id) {
  $('#app').innerHTML = '<div class="boot">টেস্ট লোড হচ্ছে…</div>';
  try { const d = await API.mockStart(id); if (d.closed_previous) toast('আগের অসমাপ্ত পরীক্ষাটি জমা হয়ে গেছে — "আমার ফলাফল"-এ দেখুন'); renderExam(d); }
  catch (e) { toast(mockErr(e), true); start(); }
}
function renderExam(d) {
  const qs = d.questions || []; const answers = { ...(d.answers || {}) };
  const offset = Date.parse(d.now) - Date.now(); const deadline = Date.parse(d.deadline);
  EXAM = { id: d.attempt_id, answers, done: false };
  document.title = d.test.title;
  let html = ''; let sec = null, pas = null, n = 0;
  for (const q of qs) {
    if (q.section !== sec) { sec = q.section; pas = null; html += `<div class="lvl">${esc(SEC[sec] || sec)}</div>`; }
    if (q.passage && q.passage !== pas) { pas = q.passage; html += `<div class="card passage">${esc(q.passage)}</div>`; }
    n++; const o = optsOf(q);
    html += `<div class="q card" id="q-${esc(q.id)}"><div class="qt"><b>${n}.</b> <span>${esc(q.question)}</span></div>
      ${q.section === 'listening' ? `<div style="margin:8px 0"><button type="button" class="btn sm" data-listen="${esc(q.id)}">🔊 শুনুন</button></div>` : ''}
      ${o.map((op, i) => `<label class="opt ${String(answers[q.id]) === String(i) ? 'sel' : ''}"><input type="radio" name="a-${esc(q.id)}" value="${i}" ${String(answers[q.id]) === String(i) ? 'checked' : ''}><span class="ab">${ABCD[i]}</span><span>${esc(op)}</span></label>`).join('')}</div>`;
  }
  $('#app').innerHTML = `<div class="xbar"><div class="xin"><div style="min-width:0"><b class="xt">${esc(d.test.title)}</b><small id="xcount"></small></div><span class="timer" id="xtimer"></span><button class="btn sm gold" id="xsub">জমা দিন</button></div></div>
    <div class="st" style="padding-top:8px"><div class="warnline">⚠️ এই পাতা ছেড়ে গেলে (অন্য অ্যাপ/ট্যাব, ফোন লক, রিফ্রেশ) পরীক্ষা সঙ্গে সঙ্গে জমা হয়ে যাবে।</div>${html}
    <button class="btn" id="xsub2" style="width:100%;justify-content:center;margin-top:16px">জমা দিন</button></div>`;
  const count = () => { const a = qs.filter(q => answers[q.id] != null).length; const el = $('#xcount'); if (el) el.textContent = ` · উত্তর দিয়েছেন ${a}/${qs.length}`; return a; };
  count();
  let saveT = null; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { if (!EXAM.done) API.mockSave(EXAM.id, answers).catch(() => {}); }, 1200); };
  $$('.opt input').forEach(inp => inp.onchange = () => {
    const qid = inp.name.slice(2); answers[qid] = Number(inp.value);
    $$(`input[name="${CSS.escape(inp.name)}"]`).forEach(x => x.closest('.opt').classList.toggle('sel', x.checked));
    count(); save();
  });
  $$('[data-listen]').forEach(b => b.onclick = async () => {
    const q = qs.find(x => String(x.id) === b.dataset.listen); b.disabled = true;
    try {
      if (q.audio_path) { const u = await API.fileUrl(q.audio_path); let au = b.parentElement.querySelector('audio'); if (!au) { au = document.createElement('audio'); au.controls = true; au.style.cssText = 'width:100%;margin-top:6px'; b.parentElement.appendChild(au); } au.src = u; au.play().catch(() => {}); }
      else if (!speakJa(q.script)) toast('জাপানি ভয়েস পাওয়া যায়নি। ফোনের Settings → Text-to-speech-এ জাপানি ভাষা যোগ করুন।', true);
    } catch (e) { toast(errMsg(e), true); }
    setTimeout(() => { b.disabled = false; }, 1200);
  });
  // ---- leaving the page ends the exam (anti-cheating)
  let blurT = null, warnEl = null;
  const stopWatch = () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', onHide); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); clearTimeout(blurT); if (warnEl) warnEl.remove(); };
  const endNow = (reason) => { EXAM.done = true; clearInterval(tick); clearTimeout(saveT); window.onbeforeunload = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); stopWatch(); };
  const leave = () => {
    if (EXAM.done) return; endNow('left');
    API.mockLeaveBeacon(EXAM.id, answers);                 // reaches the server even if the page is closing
    $('#app').innerHTML = '<div class="boot">আপনি পরীক্ষার পাতা ছেড়ে গিয়েছিলেন — পরীক্ষা জমা হয়ে গেছে।</div>';
    const showIt = async () => { if (document.hidden) return; document.removeEventListener('visibilitychange', showIt);
      try { await API.mockLeave(EXAM.id, answers).catch(() => {}); renderResult(await API.mockReview(EXAM.id)); } catch (e) { toast(mockErr(e), true); HOME_TAB = 'mock'; start(); } };
    if (document.hidden) document.addEventListener('visibilitychange', showIt); else showIt();
  };
  function onVis() { if (document.hidden) leave(); }
  function onHide() { leave(); }
  function onBlur() {   // a window switch on a computer: 5 seconds to come back
    if (EXAM.done || warnEl) return;
    warnEl = document.createElement('div'); warnEl.className = 'ovl'; warnEl.innerHTML = '<div class="card" style="max-width:340px;text-align:center"><b style="color:var(--red)">পরীক্ষার পাতায় ফিরে আসুন!</b><p style="margin:8px 0 0">৫ সেকেন্ডের মধ্যে না ফিরলে পরীক্ষা জমা হয়ে যাবে।</p></div>';
    document.body.appendChild(warnEl); blurT = setTimeout(leave, 5000);
  }
  function onFocus() { clearTimeout(blurT); if (warnEl) { warnEl.remove(); warnEl = null; } }
  document.addEventListener('visibilitychange', onVis); window.addEventListener('pagehide', onHide); window.addEventListener('blur', onBlur); window.addEventListener('focus', onFocus);
  const finish = async (auto) => {
    if (EXAM.done) return;
    if (!auto) { const left = qs.length - count(); if (!(await confirmOverlay(left ? `${left}টি প্রশ্নের উত্তর দেওয়া হয়নি। তবুও জমা দেবেন?` : 'জমা দিলে আর উত্তর বদলানো যাবে না। জমা দেবেন?', 'জমা দিন'))) return; if (EXAM.done) return; }
    endNow(auto ? 'timeout' : 'submit');
    $('#app').innerHTML = `<div class="boot">${auto ? 'সময় শেষ — জমা হচ্ছে…' : 'জমা হচ্ছে…'}</div>`;
    let tries = 0;
    const go = async () => { try { renderResult(await API.mockSubmit(EXAM.id, answers, auto ? 'timeout' : 'submit')); }
      catch (e) { if (++tries < 4) return setTimeout(go, 2500); $('#app').innerHTML = `<div class="st"><div class="card lock"><b>জমা দেওয়া যায়নি</b><p>${esc(mockErr(e))}</p><p class="small muted">আপনার উত্তর সেভ করা আছে। ইন্টারনেট ঠিক হলে "আবার চেষ্টা" চাপুন।</p><button class="btn" id="retry">আবার চেষ্টা</button></div></div>`; $('#retry').onclick = () => { tries = 0; $('#app').innerHTML = '<div class="boot">জমা হচ্ছে…</div>'; go(); }; } };
    go();
  };
  const tick = setInterval(() => { const left = deadline - (Date.now() + offset); const el = $('#xtimer'); if (!el) return clearInterval(tick); el.textContent = '⏱ ' + fmtClock(left); el.classList.toggle('low', left < 5 * 60000); if (left <= 0) finish(true); }, 1000);
  $('#xtimer').textContent = '⏱ ' + fmtClock(deadline - (Date.now() + offset));
  $('#xsub').onclick = () => finish(false); $('#xsub2').onclick = () => finish(false);
  window.onbeforeunload = (e) => { if (EXAM && !EXAM.done) { e.preventDefault(); e.returnValue = ''; } };
}

function attemptCounts(r) {
  const total = Number(r.total) || 0, score = Number(r.score) || 0;
  const answered = r.answered != null ? Number(r.answered) : (r.questions || []).filter(q => q.mine != null).length;
  return { score, wrong: Math.max(0, answered - score), blank: Math.max(0, total - answered), total };
}
const minsBetween = (a, b) => { const m = Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000)); return m < 1 ? '১ মিনিটের কম' : m + ' মিনিট'; };

function renderResult(r) {
  EXAM = null; window.onbeforeunload = null;
  const p = r.total ? Math.round(r.score * 100 / r.total) : 0; const secs = r.sections || {}; const cn = attemptCounts(r);
  let rev = ''; let sec = null, pas = null, n = 0;
  for (const q of r.questions || []) {
    if (q.section !== sec) { sec = q.section; pas = null; rev += `<div class="lvl">${esc(SEC[sec] || sec)}</div>`; }
    if (q.passage && q.passage !== pas) { pas = q.passage; rev += `<div class="card passage">${esc(q.passage)}</div>`; }
    n++; const o = optsOf(q); const mine = q.mine == null ? null : Number(q.mine); const ok = mine === Number(q.correct);
    rev += `<div class="q card ${ok ? 'qok' : 'qbad'}"><div class="qt"><b>${n}.</b> <span>${esc(q.question)}</span> <span class="small" style="color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:700">${ok ? '✓ সঠিক' : mine == null ? '— উত্তর দেননি' : '✗ ভুল'}</span></div>
      ${o.map((op, i) => `<div class="opt ${i === Number(q.correct) ? 'right' : i === mine ? 'wrong' : ''}"><span class="ab">${ABCD[i]}</span><span>${esc(op)}</span>${i === Number(q.correct) ? ' <b>✓</b>' : i === mine ? ' <b>✗</b>' : ''}</div>`).join('')}
      ${q.section === 'listening' && q.script ? `<details class="small" style="margin-top:6px"><summary>শোনার লেখা দেখুন</summary><div style="white-space:pre-line;margin-top:4px">${esc(q.script)}</div><button type="button" class="btn sm ghost" data-say="${esc(q.id)}" style="margin-top:6px">🔊 আবার শুনুন</button></details>` : ''}
      ${q.explanation ? `<div class="small expl">💡 ${esc(q.explanation)}</div>` : ''}</div>`;
  }
  $('#app').innerHTML = `<div class="st">
    <div class="card ${r.passed ? 'open' : 'lock'}" style="text-align:center;padding:20px"><div class="small muted">${esc(r.test.title)}</div>
      <div style="font:800 40px 'Noto Serif Bengali';color:${r.passed ? 'var(--green)' : 'var(--red)'};margin:6px 0">${r.score}/${r.total}</div>
      <div><b>${p}%</b> · ${r.passed ? '🎉 পাস' : `পাস করতে ${r.test.pass_pct}% লাগে — আবার চেষ্টা করুন`}</div>
      <div class="cnt"><span class="c-ok">✓ সঠিক <b>${cn.score}</b></span><span class="c-bad">✗ ভুল <b>${cn.wrong}</b></span><span class="c-bl">— উত্তর দেননি <b>${cn.blank}</b></span></div>
      <div class="small muted" style="margin-top:6px">${r.end_reason ? esc(END_REASON[r.end_reason] || '') + ' · ' : ''}${r.started_at && r.submitted_at ? 'সময় লেগেছে ' + minsBetween(r.started_at, r.submitted_at) : ''}</div></div>
    ${r.end_reason === 'left' ? '<div class="card lock" style="padding:12px 16px"><b>পরীক্ষার পাতা ছেড়ে যাওয়ায় পরীক্ষা শেষ হয়েছে।</b> <span class="muted">শিক্ষক এটা দেখতে পান। পরের বার শেষ পর্যন্ত পাতায় থাকুন।</span></div>' : ''}
    <div class="card"><h2 style="margin-top:0">ভাগ অনুযায়ী</h2><table style="width:100%"><tbody>${['vocab', 'grammar', 'reading', 'listening'].filter(s => secs[s]).map(s => { const x = secs[s]; const sp = x.total ? Math.round(x.score * 100 / x.total) : 0; return `<tr><td>${SEC[s]}</td><td class="num"><b>${x.score}/${x.total}</b></td><td style="width:40%"><div class="bar"><span style="width:${sp}%;background:${sp >= r.test.pass_pct ? 'var(--green)' : 'var(--red)'}"></span></div></td></tr>`; }).join('')}</tbody></table>
      <p class="small muted" style="margin:8px 0 0">${r.preview ? 'প্রিভিউ — এই নম্বর কোথাও জমা হয়নি।' : 'এই নম্বর আপনার শিক্ষকের কাছেও চলে গেছে।'}</p></div>
    <div class="row" style="gap:8px;margin:12px 0"><button class="btn" id="back">‹ সব মক টেস্ট</button></div>
    ${r.show_answers ? `<h2 style="font:800 18px 'Noto Serif Bengali';color:var(--navy)">উত্তর মিলিয়ে দেখুন</h2>${rev}` : '<p class="muted">এই টেস্টের সঠিক উত্তর দেখানো হয় না।</p>'}
    <button class="btn" id="back2" style="width:100%;justify-content:center;margin-top:16px">‹ সব মক টেস্ট</button></div>`;
  const back = () => { HOME_TAB = 'mock'; start(); };
  $('#back').onclick = back; $('#back2').onclick = back;
  $$('[data-say]').forEach(b => b.onclick = () => { const q = (r.questions || []).find(x => String(x.id) === b.dataset.say); speakJa(q.script); });
  scrollTo(0, 0);
}
async function showReview(aid) {
  $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>';
  try { renderResult(await API.mockReview(aid)); } catch (e) { toast(mockErr(e), true); start(); }
}

let HOME_TAB = 'mat';
async function start() {
  $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>'; PREVIEW = null;
  try {
    const user = await API.session();
    if (!user) return renderAuth();
    const d = await API.me();
    if (!d) return renderAuth();
    if (!d.linked && d.staff && !DEMO) return renderHome(await Preview.load(user, d), user);
    if (!d.linked) return renderLink(d, user);
    if (!d.blocked) { try { [d.mocks, d.history] = await Promise.all([API.mockList(), API.mockHistory()]); } catch (e) { d.mocks = d.mocks || []; d.history = []; console.warn(e); } }
    renderHome(d, user);
  } catch (e) {
    $('#app').innerHTML = shellCard(`<h1>সমস্যা হয়েছে</h1><p>${esc(errMsg(e))}</p><div class="row" style="gap:8px"><button class="btn" id="rt">আবার চেষ্টা</button><button class="btn ghost" id="lo">লগআউট</button></div>`);
    $('#rt').onclick = start; $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  }
}

if (sb) sb.auth.onAuthStateChange((ev, session) => { if (session) API._token = session.access_token; if (ev === 'PASSWORD_RECOVERY') renderNewPassword(); });
if (!DEMO && /type=recovery/.test(location.hash)) setTimeout(() => { if (!$('#npf')) start(); }, 5000); // the recovery event above shows the new-password form
else start();
