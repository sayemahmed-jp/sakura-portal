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
  // ---- demo study days (same rules as student_checkin / streak_of)
  linkedId() { const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); return s ? s.id : null; },
  streak() { const sid = this.linkedId(); if (!sid) return null; return streakFrom(this.read('student_days').filter(x => x.student_id === sid).map(x => x.day)); },
  checkin(kind) { const sid = this.linkedId(); if (!sid) return null; const rows = this.read('student_days'); const day = bdToday(); if (!rows.some(x => x.student_id === sid && x.day === day)) { rows.push({ student_id: sid, day, kind }); this.write('student_days', rows); } return this.streak(); },
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
  mockHistory() { let s; try { s = this.student(); } catch { return []; } const ts = this.read('mock_tests'); return this.read('mock_attempts').filter(a => a.student_id === s.id && a.submitted_at).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)).map(a => { const t = ts.find(x => x.id === a.test_id) || {}; return { attempt_id: a.id, test_id: a.test_id, title: t.title, level: t.level, category: t.category, pass_pct: t.pass_pct, started_at: a.started_at, submitted_at: a.submitted_at, score: a.score, total: a.total, answered: a.answered, end_reason: a.end_reason, sections: a.sections || {} }; }); },
  account() {
    const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) return null;
    const st = (() => { try { return JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); } catch { return {}; } })();
    const pays = this.read('payments').filter(p => p.student_id === s.id).sort((a, b) => String(b.paid_on).localeCompare(String(a.paid_on)));
    const paid = pays.filter(p => p.purpose !== 'processing').reduce((a, p) => a + num(p.amount), 0); const ppaid = pays.filter(p => p.purpose === 'processing').reduce((a, p) => a + num(p.amount), 0);
    const net = Math.max(0, num(s.total_fee) - num(s.discount));
    return { institute: { bn: st.institute_bn || 'সাকুরা জাপানিজ ইনস্টিটিউট', en: st.institute_en || 'Sakura Japanese Institute', ja: st.institute_ja || 'さくら日本語学院', phone: st.phone || '', whatsapp: st.whatsapp || '', email: st.email || '', address: st.address || '' },
      student: { name_bn: s.name_bn, name_en: s.name_en, admission_no: s.admission_no, package: s.package, batch: s.batch },
      fee: { total: num(s.total_fee), discount: num(s.discount), net, paid, due: Math.max(0, net - paid), next_due_date: s.next_due_date || null },
      processing: { fee: num(s.processing_fee), paid: ppaid, due: Math.max(0, num(s.processing_fee) - ppaid) },
      payments: pays.map(p => ({ id: p.id, receipt_no: p.receipt_no, paid_on: p.paid_on, amount: num(p.amount), method: p.method, trx_id: p.trx_id || '', purpose: p.purpose })) };
  },
  notices() {
    const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) return [];
    const lv = this.levels(s); const t = bdToday();
    return this.read('notices').filter(n => n.published !== false && (!n.ends_on || n.ends_on >= t) && (n.level === 'all' || lv.includes(n.level)) && (n.batch === 'all' || n.batch === s.batch))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)));
  },
  japan() {
    const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) return null;
    const st = (() => { try { return JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); } catch { return {}; } })(); const sch = this.read('jp_schools');
    return { stage: s.japan_stage || 'none', target_school: s.target_school || '', intake: s.intake || '', rules: { passport_months: num(st.alert_passport_months) || 6, fresh_days: num(st.alert_fresh_days) || 90 },
      applications: this.read('applications').filter(a => a.student_id === s.id).map(a => { const c = sch.find(x => x.id === a.school_id) || {}; return { id: a.id, school_ja: c.name_ja, school_en: c.name_en, prefecture: c.prefecture, city: c.city, intake: a.intake, status: a.status, deadline_on: a.deadline_on, submitted_on: a.submitted_on, interview_on: a.interview_on, result_on: a.result_on, depart_on: a.depart_on, school_fee: a.school_fee }; }),
      documents: this.read('documents').filter(d => d.student_id === s.id).map(d => ({ doc_type: d.doc_type, status: d.status, expires_on: d.expires_on, issued_on: d.issued_on, updated_at: d.updated_at })) };
  },
  leaderboard(lvArg) {
    const uid = this.uid(); const me = uid && this.read('students').find(x => x.auth_user_id === uid); const lv = lvArg || (me && me.current_level) || 'N5';
    const t = bdToday(); const d0 = new Date(t + 'T00:00:00Z'); d0.setUTCDate(d0.getUTCDate() - ((d0.getUTCDay() + 1) % 7)); const ws = d0.toISOString().slice(0, 10);
    const pool = this.read('students').filter(s => s.current_level === lv && !['dropped', 'completed'].includes(s.status));
    const days = this.read('student_days'); const att = this.read('mock_attempts').filter(a => a.submitted_at && a.total);
    const rows = pool.map(s => { const my = att.filter(a => a.student_id === s.id && new Date(Date.parse(a.submitted_at) + 6 * 3600000).toISOString().slice(0, 10) >= ws);
      return { id: s.id, name: String(s.name_bn || s.name_en || '').trim().replace(/^((মোঃ|মোঃ|মো:|মো\.|মোহাম্মদ|মুহাম্মদ|মোহাম্মাদ|মোছাঃ|মোসাঃ|মোছা:|মোসাম্মৎ|মোছাম্মৎ|Md\.?|Mst\.?|Mohammad|Muhammad|Mohammed)\s+)+/i, '').split(/\s+/)[0], days: days.filter(x => x.student_id === s.id && x.day >= ws && x.day <= t).length, mocks: my.length, best: my.length ? Math.max(...my.map(a => Math.round(a.score * 100 / a.total))) : null }; });
    const reg = rows.filter(r => r.days || r.mocks).sort((a, b) => b.days - a.days || b.mocks - a.mocks || a.name.localeCompare(b.name)).slice(0, 10);
    const best = rows.filter(r => r.best != null).sort((a, b) => b.best - a.best || b.mocks - a.mocks || a.name.localeCompare(b.name)).slice(0, 10);
    const mine = me && rows.find(r => r.id === me.id);
    return { level: lv, week_start: ws, today: t, students: pool.length, regular: reg.map(r => ({ name: r.name, days: r.days, mocks: r.mocks, me: !!me && r.id === me.id })), best: best.map(r => ({ name: r.name, pct: r.best, mocks: r.mocks, me: !!me && r.id === me.id })),
      me: mine ? { days: mine.days, mocks: mine.mocks, best: mine.best, rank: rows.filter(x => x.days > mine.days || (x.days === mine.days && x.mocks > mine.mocks)).length + 1 } : null };
  },
  attendance() {
    const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) return [];
    const ses = this.read('sessions');
    return this.read('attendance').filter(a => a.student_id === s.id).map(a => { const x = ses.find(z => z.id === a.session_id); return x && { date: x.class_date, status: a.status, level: x.level, topic: x.topic, hours: num(x.hours), class_no: x.class_no }; }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  },
  mistakes() {
    let s; try { s = this.student(); } catch { return []; }
    const fixed = this.read('student_fixed').filter(f => f.student_id === s.id); const tests = this.read('mock_tests');
    const att = this.read('mock_attempts').filter(a => a.student_id === s.id && a.submitted_at).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    const out = [];
    for (const q of this.read('mock_questions')) {
      const t = tests.find(x => x.id === q.test_id); if (!t || t.show_answers === false) continue;
      const mine = att.filter(a => a.test_id === q.test_id); if (!mine.length) continue;
      const v = mine[0].answers[q.id]; if (v != null && String(v) === String(q.correct)) continue;
      const f = fixed.find(x => x.question_id === q.id); if (f && f.fixed_at > mine[0].submitted_at) continue;
      out.push({ id: q.id, test_title: t.title, level: t.level, section: q.section, passage: q.passage, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation, script: q.script, audio_path: q.audio_path || null,
        mine: v == null ? null : Number(v), times_wrong: mine.filter(a => String(a.answers[q.id]) !== String(q.correct)).length, last_at: mine[0].submitted_at });
    }
    return out.sort((a, b) => b.last_at.localeCompare(a.last_at));
  },
  mistakeFixed(ids) { const s = this.student(); const rows = this.read('student_fixed').filter(f => !(f.student_id === s.id && ids.includes(f.question_id))); ids.forEach(id => rows.push({ student_id: s.id, question_id: id, fixed_at: new Date().toISOString() })); this.write('student_fixed', rows); return ids.length; },
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
  async streak() { if (PREVIEW) return streakFrom(PREVIEW.days || []); if (DEMO) return Demo.streak(); const { data, error } = await sb.rpc('student_streak'); if (error) throw error; return data; },
  async checkin(kind = 'daily') { if (PREVIEW) { const t = bdToday(); PREVIEW.days = PREVIEW.days || []; if (!PREVIEW.days.includes(t)) PREVIEW.days.push(t); return streakFrom(PREVIEW.days); } if (DEMO) return Demo.checkin(kind); const { data, error } = await sb.rpc('student_checkin', { p_kind: kind }); if (error) throw error; return data; },
  async mistakes() { if (PREVIEW) return []; if (DEMO) return Demo.mistakes(); const { data, error } = await sb.rpc('student_mistakes'); if (error) throw error; return data || []; },
  async mistakeFixed(ids) { if (PREVIEW || !ids.length) return 0; if (DEMO) return Demo.mistakeFixed(ids); const { data, error } = await sb.rpc('student_mistake_fixed', { p_ids: ids }); if (error) throw error; return data; },
  async examDates() { if (DEMO) { try { const st = JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); return { jlpt_date: st.jlpt_date || null, nat_date: st.nat_date || null }; } catch { return {}; } } const { data, error } = await sb.rpc('student_exam_dates'); if (error) throw error; return data || {}; },
  async notices() { if (DEMO) return Demo.notices(); const { data, error } = await sb.rpc('student_notices'); if (error) throw error; return data || []; },
  async japan() { if (PREVIEW) return null; if (DEMO) return Demo.japan(); const { data, error } = await sb.rpc('student_japan'); if (error) throw error; return data; },
  async leaderboard(lv) { if (DEMO) return Demo.leaderboard(lv); const { data, error } = await sb.rpc('student_leaderboard', { p_level: lv || null }); if (error) throw error; return data; },
  async attendance() { if (PREVIEW) return []; if (DEMO) return Demo.attendance(); const { data, error } = await sb.rpc('student_attendance'); if (error) throw error; return data || []; },
  async account() { if (PREVIEW) return null; if (DEMO) return Demo.account(); const { data, error } = await sb.rpc('student_account'); if (error) throw error; return data; },
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



// ------------------------------------------------------------------ my progress (আমার উন্নতি)
const SEC_TIP = {
  vocab: 'শব্দ আর কানজিতে জোর দিন: প্রতিদিন "আজকের পড়া" আর ফ্ল্যাশকার্ড করুন, কানজি টেস্টগুলো দিন।',
  grammar: 'ব্যাকরণে জোর দিন: ব্যাকরণ টেস্টগুলো দিন, ভুল প্রশ্নের ব্যাখ্যা মন দিয়ে পড়ুন, আর বইয়ের ব্যাকরণ অংশ আবার দেখুন।',
  reading: 'পড়ায় জোর দিন: পূর্ণ মক টেস্টের পড়ার লেখা ধীরে পড়ুন, প্রশ্নের উত্তর লেখার কোন লাইনে আছে খুঁজে বের করার অভ্যাস করুন।',
  listening: 'শোনায় জোর দিন: বইয়ের সংলাপগুলো 🔊 চেপে বারবার শুনুন, আর শোনার অনুশীলনের টেস্ট দিন।' };
const pctOf = (a) => a.total ? Math.round(a.score * 100 / a.total) : 0;
function progressHtml(h) {
  const xs = (h || []).filter(a => a.total).slice().sort((a, b) => String(a.submitted_at).localeCompare(String(b.submitted_at)));
  if (!xs.length) return '';
  const ps = xs.map(pctOf); const avg = Math.round(ps.reduce((a, b) => a + b, 0) / ps.length); const best = Math.max(...ps);
  const passed = xs.filter(a => pctOf(a) >= (a.pass_pct || 60)).length;
  // trend: last 3 against the 3 before
  let trend = '';
  if (ps.length >= 4) { const k = Math.min(3, Math.floor(ps.length / 2)); const m = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const diff = Math.round(m(ps.slice(-k)) - m(ps.slice(-2 * k, -k)));
    trend = diff > 0 ? `<span class="tr up">↑ আগের চেয়ে ${BN_NUM(diff)}% ভালো</span>` : diff < 0 ? `<span class="tr down">↓ আগের চেয়ে ${BN_NUM(-diff)}% কম</span>` : '<span class="tr">আগের মতোই</span>'; }
  // chart of the last 20 attempts
  const last = xs.slice(-20); const W = 320, H = 130, L = 26, R = 8, T = 10, B = 18;
  const x = (i) => last.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (last.length - 1); const y = (p) => T + (100 - p) * (H - T - B) / 100;
  const passLine = Math.round(last.reduce((a, b) => a + (b.pass_pct || 60), 0) / last.length);
  const pts = last.map((a, i) => `${x(i).toFixed(1)},${y(pctOf(a)).toFixed(1)}`).join(' ');
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="pchart" role="img" aria-label="মক টেস্টের নম্বর, শেষ ${BN_NUM(last.length)}টি">
    ${[0, 50, 100].map(p => `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" class="g"/><text x="${L - 4}" y="${y(p) + 3.5}" text-anchor="end">${BN_NUM(p)}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(passLine)}" y2="${y(passLine)}" class="pass"/><text x="${W - R}" y="${y(passLine) - 3}" text-anchor="end" class="pt">পাস ${BN_NUM(passLine)}%</text>
    ${last.length > 1 ? `<polyline points="${pts}" class="ln"/>` : ''}
    ${last.map((a, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(pctOf(a)).toFixed(1)}" r="3.6" class="${pctOf(a) >= (a.pass_pct || 60) ? 'ok' : 'bad'}"><title>${esc(a.title)} · ${pctOf(a)}%</title></circle>`).join('')}
    <text x="${L}" y="${H - 3}">পুরনো</text><text x="${W - R}" y="${H - 3}" text-anchor="end">নতুন</text></svg>`;
  // sections over the last 10 attempts that have them
  const recent = xs.filter(a => a.sections && Object.keys(a.sections).length).slice(-10); const acc = {};
  recent.forEach(a => Object.entries(a.sections).forEach(([k, v]) => { const t = acc[k] || (acc[k] = { s: 0, t: 0 }); t.s += Number(v.score) || 0; t.t += Number(v.total) || 0; }));
  const secs = ['vocab', 'grammar', 'reading', 'listening'].filter(k => acc[k] && acc[k].t).map(k => ({ k, p: Math.round(acc[k].s * 100 / acc[k].t), t: acc[k].t }));
  const weak = secs.filter(z => z.t >= 3).sort((a, b) => a.p - b.p)[0];
  return `<div class="card prog"><div class="row" style="justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:16px">📈 আমার উন্নতি</b>${trend}</div>
    <div class="fcstat"><div><b>${BN_NUM(xs.length)}</b><span>টেস্ট দিয়েছেন</span></div><div><b>${BN_NUM(avg)}%</b><span>গড়</span></div><div><b>${BN_NUM(best)}%</b><span>সেরা</span></div><div><b>${BN_NUM(passed)}</b><span>পাস</span></div></div>
    ${svg}
    ${secs.length ? `<div class="dsec">ভাগ অনুযায়ী (শেষ ${BN_NUM(recent.length)}টি টেস্ট)</div>${secs.map(z => `<div class="psec ${weak && weak.k === z.k ? 'weak' : ''}"><span>${SEC[z.k]}</span><div class="bar"><span style="width:${z.p}%;background:${z.p >= 60 ? 'var(--green)' : z.p >= 40 ? 'var(--gold)' : 'var(--red)'}"></span></div><b>${BN_NUM(z.p)}%</b></div>`).join('')}
    ${weak && weak.p < 80 ? `<div class="tip">💡 <b>সবচেয়ে দুর্বল: ${SEC[weak.k]}।</b> ${SEC_TIP[weak.k]}</div>` : secs.length ? '<div class="tip">💡 সব ভাগেই ভালো করছেন, এভাবেই চালিয়ে যান!</div>' : ''}` : ''}
  </div>`;
}


// ------------------------------------------------------------------ mistake notebook (ভুলের খাতা)
let MK = null;   // { mode: 'list' | 'practice', q: [...], i, pick, right, fixed: [] }
function mistakesCardHtml(d) {
  const m = d.mistakes || []; if (!m.length) return (d.history || []).length ? '<div class="card mk"><b>📒 ভুলের খাতা</b><div class="small muted" style="margin-top:4px">খাতা খালি — সব ভুল ঠিক করে ফেলেছেন! 🎉</div></div>' : '';
  const by = {}; m.forEach(x => { by[x.section] = (by[x.section] || 0) + 1; });
  return `<div class="card mk"><div class="row" style="justify-content:space-between;gap:8px"><b>📒 ভুলের খাতা <span class="cnt1">${BN_NUM(m.length)}</span></b><button class="linkbtn" id="mklist">সব দেখুন</button></div>
    <div class="small muted" style="margin:4px 0 8px">মক টেস্টে যেগুলো ভুল হয়েছে বা উত্তর দেননি। অনুশীলনে ঠিক উত্তর দিলে খাতা থেকে সরে যাবে।</div>
    <div class="teaser" style="margin:0 0 10px">${Object.entries(by).map(([k, n]) => `<span>${SEC[k] || k}: ${BN_NUM(n)}</span>`).join('')}</div>
    <button class="btn" id="mkgo" style="width:100%;justify-content:center">ভুলগুলো আবার অনুশীলন করুন (${BN_NUM(Math.min(10, m.length))}টি)</button></div>`;
}
function mkQuestionHtml(x, n, opts) {
  const o = optsOf(x);
  return `${x.passage ? `<div class="card passage" style="margin:0 0 8px">${esc(x.passage)}</div>` : ''}
    <div class="qt"><b>${n}.</b> <span style="white-space:pre-line">${esc(x.question)}</span></div>
    ${x.section === 'listening' ? `<div style="margin:8px 0"><button type="button" class="btn sm" data-mkl="${esc(x.id)}">🔊 শুনুন</button></div>` : ''}
    ${o.map((op, i) => opts.render(op, i)).join('')}`;
}
function mistakesViewHtml(d) {
  const m = d.mistakes || [];
  if (MK.mode === 'list') {
    return `<div class="row" style="justify-content:space-between;margin:0 0 10px"><b style="font-size:17px">📒 ভুলের খাতা (${BN_NUM(m.length)})</b><button class="btn sm ghost" id="mkclose">‹ ফিরে যান</button></div>
      ${m.length ? m.map((x, i) => `<div class="q card">${mkQuestionHtml(x, i + 1, { render: (op, j) => `<div class="opt ${j === Number(x.correct) ? 'right' : j === x.mine ? 'wrong' : ''}"><span class="ab">${ABCD[j]}</span><span>${esc(op)}</span>${j === Number(x.correct) ? ' <b>✓</b>' : j === x.mine ? ' <b>✗</b>' : ''}</div>` })}
        <div class="small muted" style="margin-top:6px">${esc(x.test_title)} · ${SEC[x.section] || ''} · ${x.mine == null ? 'উত্তর দেননি' : 'ভুল'}${x.times_wrong > 1 ? ` · ${BN_NUM(x.times_wrong)} বার ভুল` : ''}</div>
        ${x.explanation ? `<div class="small expl">💡 ${esc(x.explanation)}</div>` : ''}</div>`).join('') : '<div class="card"><div class="empty">খাতা খালি 🎉</div></div>'}
      ${m.length ? '<button class="btn" id="mkgo" style="width:100%;justify-content:center;margin-top:12px">অনুশীলন শুরু করুন</button>' : ''}`;
  }
  const x = MK.q[MK.i];
  if (!x) return `<div class="card" style="text-align:center"><div style="font-size:40px">${MK.right === MK.q.length ? '🎉' : '💪'}</div><b style="font-size:18px">${BN_NUM(MK.q.length)}টির মধ্যে ${BN_NUM(MK.right)}টি ঠিক</b>
    <p class="muted" style="margin:6px 0 0">${MK.right ? `ঠিক হওয়া ${BN_NUM(MK.right)}টি প্রশ্ন খাতা থেকে সরে গেছে।` : 'ব্যাখ্যাগুলো আরেকবার পড়ে নিন, পরে আবার চেষ্টা করুন।'}${(d.mistakes || []).length ? ` খাতায় এখনো ${BN_NUM(d.mistakes.length)}টি আছে।` : ''}</p>
    <button class="btn" id="mkclose" style="width:100%;justify-content:center;margin-top:14px">ঠিক আছে</button></div>`;
  const pick = MK.pick; const ok = pick != null && pick === Number(x.correct);
  return `<div class="row" style="justify-content:space-between;margin:0 0 8px"><span class="small muted">ভুলের খাতা · ${BN_NUM(MK.i + 1)}/${BN_NUM(MK.q.length)} · ${SEC[x.section] || ''}</span><button class="linkbtn" id="mkclose">থামুন</button></div>
    <div class="q card">${mkQuestionHtml(x, MK.i + 1, { render: (op, j) => pick == null ? `<button type="button" class="opt" data-mkp="${j}"><span class="ab">${ABCD[j]}</span><span>${esc(op)}</span></button>` : `<div class="opt ${j === Number(x.correct) ? 'right' : j === pick ? 'wrong' : ''}"><span class="ab">${ABCD[j]}</span><span>${esc(op)}</span>${j === Number(x.correct) ? ' <b>✓</b>' : j === pick ? ' <b>✗</b>' : ''}</div>` })}
      ${pick == null ? '' : `<div class="small expl" style="margin-top:8px"><b style="color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? '✓ ঠিক! খাতা থেকে সরে গেল।' : '✗ এখনো ভুল — ঠিক উত্তর সবুজ রঙে।'}</b> ${esc(x.explanation || '')}</div>
      ${x.section === 'listening' && x.script ? `<details class="small" style="margin-top:6px"><summary>শোনার লেখা দেখুন</summary><div style="white-space:pre-line;margin-top:4px">${esc(x.script)}</div></details>` : ''}
      <button class="btn" id="mknext" style="width:100%;justify-content:center;margin-top:12px">${MK.i + 1 < MK.q.length ? 'পরের প্রশ্ন ›' : 'শেষ'}</button>`}</div>`;
}
function bindMistakes(d, user) {
  const re = () => { renderHome(d, user); };
  const go = $('#mkgo'); if (go) go.onclick = () => { const m = (d.mistakes || []).slice(); for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; } MK = { mode: 'practice', q: m.slice(0, 10), i: 0, pick: null, right: 0 }; re(); const t = $('.authtabs'); if (t) t.scrollIntoView({ block: 'start' }); };
  const li = $('#mklist'); if (li) li.onclick = () => { MK = { mode: 'list' }; re(); const t = $('.authtabs'); if (t) t.scrollIntoView({ block: 'start' }); };
  const cl = $('#mkclose'); if (cl) cl.onclick = () => { MK = null; re(); };
  $$('[data-mkp]').forEach(b => b.onclick = async () => {
    const x = MK.q[MK.i]; MK.pick = Number(b.dataset.mkp);
    if (MK.pick === Number(x.correct)) { MK.right++; d.mistakes = (d.mistakes || []).filter(z => z.id !== x.id); API.mistakeFixed([x.id]).catch(e => toast(errMsg(e), true)); }
    re();
  });
  const nx = $('#mknext'); if (nx) nx.onclick = () => { MK.i++; MK.pick = null; if (!MK.q[MK.i] && MK.q.length >= 3) API.checkin('daily').then(s => { d.streak = s; }).catch(() => {}); re(); };
  $$('[data-mkl]').forEach(b => b.onclick = async () => {
    const all = MK.mode === 'list' ? d.mistakes : MK.q; const x = all.find(z => String(z.id) === b.dataset.mkl); if (!x) return; b.disabled = true;
    try { if (x.audio_path) { const u = await API.fileUrl(x.audio_path); let au = b.parentElement.querySelector('audio'); if (!au) { au = document.createElement('audio'); au.controls = true; au.style.cssText = 'width:100%;margin-top:6px'; b.parentElement.appendChild(au); } au.src = u; au.play().catch(() => {}); } else if (!speakJa(x.script)) toast('জাপানি ভয়েস পাওয়া যায়নি।', true); }
    catch (e) { toast(errMsg(e), true); }
    setTimeout(() => { b.disabled = false; }, 1200);
  });
}


// ------------------------------------------------------------------ exam countdown and weekly plan (JLPT কাউন্টডাউন)
let CD_OPEN = false;
const BOOK_LESSONS = { N5: 24, N4: 24, N3: 20 };   // さくら日本語 N5: kana 2 + lessons 22; N4: 24 lessons
function firstSunday(y, m) { const d = new Date(Date.UTC(y, m, 1)); while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
function nextJlptGuess(today) { const y = Number(today.slice(0, 4)); return [firstSunday(y, 6), firstSunday(y, 11), firstSunday(y + 1, 6)].find(d => d >= today); }
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const bnDate = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return `${BN_NUM(d.getUTCDate())} ${BN_MONTH[d.getUTCMonth()]} ${BN_NUM(d.getUTCFullYear())}`; };
function weekStart(today) { const d = new Date(today + 'T00:00:00Z'); const back = (d.getUTCDay() + 1) % 7; d.setUTCDate(d.getUTCDate() - back); return d.toISOString().slice(0, 10); }  // weeks start on Saturday (Bangladesh)
function examPlan(left, lv) {
  const weeks = Math.max(1, Math.ceil(left / 7)); const lessons = BOOK_LESSONS[lv] || 22;
  if (left <= 0) return { phase: 'আজ পরীক্ষা!', note: 'শান্ত থাকুন, সময় দেখে উত্তর দিন। শুভকামনা! 🌸', items: [] };
  if (left <= 7) return { phase: 'শেষ সপ্তাহ', note: 'নতুন কিছু শিখবেন না — যা শিখেছেন সেটা ঝালিয়ে নিন আর ভালো করে ঘুমান।', items: [['mock', 1, 'একটা পূর্ণ মক টেস্ট সময় ধরে দিন'], ['mk', 0, 'ভুলের খাতার প্রশ্নগুলো আরেকবার দেখুন'], ['day', 5, '৫ দিন "আজকের পড়া" বা ফ্ল্যাশকার্ড'], ['m', 0, 'অ্যাডমিট কার্ড, ছবি, পেন্সিল-রাবার, ঘড়ি গুছিয়ে রাখুন']] };
  if (left <= 28) return { phase: 'মক টেস্টের সময়', note: `আর ${BN_NUM(weeks)} সপ্তাহ। এখন আসল পরীক্ষার মতো করে প্র্যাকটিস করুন, দুর্বল ভাগে জোর দিন।`, items: [['mock', 3, 'সপ্তাহে ৩টা পূর্ণ মক টেস্ট (সময় ধরে)'], ['mk', 0, 'প্রতিটা টেস্টের পর ভুলের খাতা অনুশীলন'], ['day', 6, '৬ দিন "আজকের পড়া" বা ফ্ল্যাশকার্ড'], ['m', 0, '"আমার উন্নতি"-তে দুর্বল ভাগটা দেখে সেটার টেস্ট দিন']] };
  if (left <= 84) return { phase: 'রিভিশনের সময়', note: `আর ${BN_NUM(weeks)} সপ্তাহ। বইয়ের বাকি পাঠ শেষ করুন, আর পুরনো পাঠ ঝালিয়ে নিন।`, items: [['m', 0, 'বইয়ের বাকি পাঠ থেকে ২টা পাঠ শেষ/রিভিশন'], ['mock', 2, '২টা টেস্ট (কানজি বা ব্যাকরণ), মাসে অন্তত ২টা পূর্ণ মক'], ['day', 5, '৫ দিন "আজকের পড়া" বা ফ্ল্যাশকার্ড'], ['mk', 0, 'ভুলের খাতা খালি করার চেষ্টা']] };
  const pace = Math.max(1, Math.ceil(lessons / Math.max(1, weeks - 12)));
  return { phase: 'শেখার সময়', note: `আর ${BN_NUM(weeks)} সপ্তাহ — হাতে ভালো সময় আছে। নিয়মিত পড়লে বই আরামে শেষ হবে: সপ্তাহে ${BN_NUM(pace)}টা পাঠ।`, items: [['m', 0, `বইয়ের ${BN_NUM(pace)}টা নতুন পাঠ (শব্দ, ব্যাকরণ, অনুশীলন)`], ['day', 5, '৫ দিন "আজকের পড়া" বা ফ্ল্যাশকার্ড'], ['mock', 1, 'শেষ করা পাঠের কানজি বা ব্যাকরণ টেস্ট ১টা']] };
}
function countdownHtml(d) {
  const ex = d.exams || {}; const today = bdToday();
  const lv = ['N5', 'N4', 'N3'].includes((d.student || {}).current_level) ? d.student.current_level : (d.levels || [])[0] || 'N5';
  const set = ex.jlpt_date && ex.jlpt_date >= today; const date = set ? ex.jlpt_date : nextJlptGuess(today); const left = daysBetween(today, date);
  const nat = ex.nat_date && ex.nat_date >= today ? ex.nat_date : null;
  const p = examPlan(left, lv);
  // this week's progress
  const ws = weekStart(today); const st = d.streak || { days: [] };
  const daysThisWeek = (st.days || []).filter(x => x >= ws && x <= today).length;
  const mocksThisWeek = (d.history || []).filter(a => a.submitted_at && new Date(Date.parse(a.submitted_at) + 6 * 3600000).toISOString().slice(0, 10) >= ws).length;
  const key = 'sakura_week_' + ((d.student || {}).admission_no || 'p') + '_' + ws; let man = {}; try { man = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* none */ }
  const row = (it, i) => { const [kind, n, text] = it; let done, extra = '';
    if (kind === 'day') { done = daysThisWeek >= n; extra = ` <span class="small muted">(${BN_NUM(daysThisWeek)}/${BN_NUM(n)})</span>`; }
    else if (kind === 'mock') { done = mocksThisWeek >= n; extra = ` <span class="small muted">(${BN_NUM(mocksThisWeek)}/${BN_NUM(n)})</span>`; }
    else if (kind === 'mk') { done = !(d.mistakes || []).length && (d.history || []).length > 0; }
    else done = !!man[i];
    return `<label class="wk ${done ? 'ok' : ''}">${kind === 'm' ? `<input type="checkbox" data-wk="${i}" ${done ? 'checked' : ''}>` : `<span class="auto">${done ? '✓' : '○'}</span>`}<span>${esc(text)}${extra}</span></label>`; };
  return `<div class="card cd">
    <div class="cdh" id="cdtog" role="button" tabindex="0" aria-expanded="${CD_OPEN}"><div class="cdn"><b>${BN_NUM(Math.max(0, left))}</b><span>দিন বাকি</span></div>
      <div style="min-width:0;flex:1"><b>🎯 JLPT ${esc(lv)}</b><div class="small muted">${bnDate(date)}${set ? '' : ' (আনুমানিক — অফিসে জেনে নিন)'}</div><div class="small" style="margin-top:2px"><b style="color:var(--navy)">${esc(p.phase)}</b>${nat ? ` · NAT-TEST: আর ${BN_NUM(daysBetween(today, nat))} দিন` : ''}</div></div><span class="chev">${CD_OPEN ? '▲' : '▼'}</span></div>
    ${CD_OPEN ? `<p class="small" style="margin:10px 0 6px;line-height:1.7">${esc(p.note)}</p>${p.items.length ? `<div class="dsec">এই সপ্তাহের কাজ (শনি–শুক্র)</div>${p.items.map(row).join('')}<div class="small muted" style="margin-top:6px">✓/○ চিহ্নগুলো নিজে থেকে মেলে; বাকিগুলোতে নিজে টিক দিন।</div>` : ''}` : ''}
  </div>`;
}
function bindCountdown(d, user) {
  const t = $('#cdtog'); if (t) { const f = () => { CD_OPEN = !CD_OPEN; renderHome(d, user); }; t.onclick = f; t.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; }
  $$('[data-wk]').forEach(c => c.onchange = () => {
    const key = 'sakura_week_' + ((d.student || {}).admission_no || 'p') + '_' + weekStart(bdToday()); let man = {}; try { man = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* none */ }
    man[c.dataset.wk] = c.checked; try { localStorage.setItem(key, JSON.stringify(man)); } catch { /* not kept */ } renderHome(d, user);
  });
}


// ------------------------------------------------------------------ my page (আমার পাতা): account, attendance, Japan
const METHOD = { cash: 'ক্যাশ', bkash: 'বিকাশ', nagad: 'নগদ', bank: 'ব্যাংক' };
const PURPOSE = { course_fee: 'কোর্স ফি', installment: 'কিস্তি', admission: 'ভর্তি ফি', processing: 'জাপান প্রসেসিং ফি', other: 'অন্যান্য' };
function amountWords(n) { // English amount in words, Indian grouping (as on the office receipt)
  n = Math.round(num(n)); if (n === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
  const three = (x) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const parts = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (n) parts.push(three(n));
  return parts.join(' ');
}
function printStudentReceipt(acc, p) {
  const w = window.open('', '_blank'); if (!w) return toast('রশিদ খোলা যায়নি — পপ-আপ চালু করুন', true);
  const I = acc.institute || {}; const s = acc.student || {}; const proc = p.purpose === 'processing'; const f = proc ? acc.processing : acc.fee;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt ${esc(p.receipt_no)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Serif+Bengali:wght@800&family=Shippori+Mincho+B1:wght@700;800&display=swap">
  <style>@page{size:A4;margin:12mm}body{font-family:'Hind Siliguri',sans-serif;color:#26231E;margin:0;padding:10px}.box{border:1.5px solid #A3843A;max-width:760px;margin:0 auto}
  .hd{display:flex;align-items:center;gap:12px;background:#1B2945;color:#fff;padding:14px 18px;border-bottom:4px solid #A3843A}.km{width:50px;height:50px;border-radius:50%;background:#FBF8F1;border:2px solid #C9A95C;display:grid;place-items:center;flex:none}
  .t1{font:800 18px 'Shippori Mincho B1'}.t2{font-size:12px;color:#E2C987;letter-spacing:3px}.ct{margin-left:auto;text-align:right;font-size:11.5px;line-height:1.5}
  table{width:100%;border-collapse:collapse;font-size:13.5px}td,th{border:1px solid #D8CDB9;padding:7px 10px;text-align:left}th{background:#F6F0E4;width:36%;font-weight:600}
  .pb{position:fixed;bottom:14px;right:14px;background:#1B2945;color:#fff;border:none;padding:9px 16px;border-radius:6px;font:inherit;cursor:pointer}@media print{.pb{display:none}}@media(max-width:560px){.ct{display:none}}</style></head><body>
  <button class="pb" onclick="window.print()">প্রিন্ট / PDF হিসেবে রাখুন</button>
  <div class="box"><div class="hd"><span class="km">${KAMON}</span><div><div class="t1">${esc(I.en || 'Sakura Japanese Institute')}</div><div style="font:800 14px 'Noto Serif Bengali'">${esc(I.bn || '')}</div><div class="t2">${esc(I.ja || 'さくら日本語学院')}</div></div>
  <div class="ct">${esc(I.phone || '')}${I.whatsapp ? ' · WhatsApp ' + esc(I.whatsapp) : ''}<br>${esc(I.email || '')}<br>${esc(I.address || '')}</div></div>
  <div style="padding:14px 18px"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px;gap:10px;flex-wrap:wrap"><div><div style="font:700 11px 'Shippori Mincho B1';letter-spacing:3px;color:#A3843A">MONEY RECEIPT</div><div style="font:800 20px 'Noto Serif Bengali'">ফি-র রশিদ</div></div>
  <div style="text-align:right;font-size:13px"><span style="background:#C8372B;color:#fff;padding:2px 10px;border-radius:4px;font-weight:700">ছাত্র কপি</span><br>রশিদ নং: <b>${esc(p.receipt_no)}</b> · তারিখ: <b>${fmtD(p.paid_on)}</b></div></div>
  <table><tr><th>ছাত্র/ছাত্রীর নাম</th><td>${esc(s.name_bn || '')} ${s.name_en ? '(' + esc(s.name_en) + ')' : ''}</td></tr><tr><th>ভর্তি নম্বর</th><td>${esc(s.admission_no || '')}</td></tr>
  <tr><th>কোর্স / ব্যাচ</th><td>${esc(s.package || '')}${s.batch && BATCH[s.batch] ? ' · ' + esc(BATCH[s.batch]) : ''}</td></tr><tr><th>বাবদ</th><td>${esc(PURPOSE[p.purpose] || p.purpose)}</td></tr>
  <tr><th>মাধ্যম</th><td>${esc(METHOD[p.method] || p.method)}${p.trx_id ? ' · TrxID: ' + esc(p.trx_id) : ''}</td></tr>
  <tr><th>টাকার পরিমাণ</th><td><b style="font-size:17px;color:#C8372B">${tk(p.amount)}</b><br><span style="font-size:12px">In words: Taka ${amountWords(p.amount)} only</span></td></tr>
  <tr><th>${proc ? 'প্রসেসিং ফি' : 'মোট ফি'} · মোট পরিশোধিত · বকেয়া (আজ পর্যন্ত)</th><td>${tk(proc ? f.fee : f.net)} · ${tk(f.paid)} · <b>${tk(f.due)}</b></td></tr></table>
  <p style="font-size:11.5px;color:#6E665A;margin:12px 0 0">এটি ছাত্রদের সাইট থেকে নেওয়া রশিদের কপি। অফিসের সই করা মূল রশিদ যত্নে রাখুন।</p></div></div></body></html>`);
  w.document.close();
}

// ---- my attendance (আমার হাজিরা)
const ATT_ST = { present: ['উপস্থিত', 'p'], late: ['দেরিতে', 'l'], absent: ['অনুপস্থিত', 'a'], leave: ['ছুটি', 'v'] };
let ATT_MONTH = '';
function bindAttMonth(d, user) { $$('[data-attm]').forEach(b => b.onclick = () => { ATT_MONTH = b.dataset.attm; $('#attbox').innerHTML = attendanceHtml(d.att, true); bindAttMonth(d, user); }); }
function attendanceHtml(rows, inner) {
  rows = rows || [];
  if (!rows.length) return '<div class="card"><div class="empty">এখনো কোনো ক্লাসের হাজিরা নেওয়া হয়নি।</div></div>';
  const came = rows.filter(r => r.status === 'present' || r.status === 'late'); const pct = Math.round(came.length * 100 / rows.length);
  const hours = came.reduce((a, r) => a + num(r.hours), 0); const late = rows.filter(r => r.status === 'late').length;
  const months = [...new Set(rows.map(r => String(r.date).slice(0, 7)))].sort();
  if (!months.includes(ATT_MONTH)) ATT_MONTH = months[months.length - 1];
  const mi = months.indexOf(ATT_MONTH); const [y, m] = ATT_MONTH.split('-').map(Number);
  const mrows = rows.filter(r => String(r.date).startsWith(ATT_MONTH)); const byDay = {}; mrows.forEach(r => { byDay[Number(String(r.date).slice(8, 10))] = r; });
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mc = mrows.filter(r => r.status === 'present' || r.status === 'late').length;
  const cells = [...Array(first).fill('<span></span>'), ...Array.from({ length: days }, (_, i) => { const r = byDay[i + 1]; return `<span class="cal ${r ? 'c-' + ATT_ST[r.status][1] : ''}" title="${r ? esc(ATT_ST[r.status][0]) : ''}">${BN_NUM(i + 1)}</span>`; })];
  const month = `<div class="card attm"><div class="row" style="justify-content:space-between;align-items:center"><button class="btn sm ghost" data-attm="${months[mi - 1] || ''}" ${mi > 0 ? '' : 'disabled'}>‹</button><b>${BN_MONTH[m - 1]} ${BN_NUM(y)}</b><button class="btn sm ghost" data-attm="${months[mi + 1] || ''}" ${mi < months.length - 1 ? '' : 'disabled'}>›</button></div>
    <div class="small muted" style="text-align:center;margin:4px 0 8px">এই মাসে ${BN_NUM(mrows.length)}টি ক্লাসের মধ্যে ${BN_NUM(mc)}টিতে এসেছেন</div>
    <div class="calg">${['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'].map(w => `<span class="wd">${w}</span>`).join('')}${cells.join('')}</div>
    <div class="legend">${Object.values(ATT_ST).map(([l, c]) => `<span><i class="c-${c}"></i>${l}</span>`).join('')}</div>
    ${mrows.length ? `<div style="margin-top:10px">${mrows.map(r => `<div class="attr"><span class="dot2 c-${ATT_ST[r.status][1]}"></span><span style="flex:none;width:70px">${fmtD(r.date).slice(0, 5)}</span><span style="flex:1;min-width:0">${esc(r.topic || r.level + ' ক্লাস')}</span><span class="small muted">${esc(ATT_ST[r.status][0])}</span></div>`).join('')}</div>` : ''}</div>`;
  if (inner) return month;
  return `<div class="card acct"><div class="row" style="justify-content:space-between;align-items:baseline"><b style="font-size:16px">মোট উপস্থিতি</b><span class="pill ${pct >= 80 ? 'ok' : pct >= 60 ? 'warn' : 'bad'}">${BN_NUM(pct)}%</span></div>
    <div class="bar" style="margin:10px 0 6px;height:10px"><span style="width:${pct}%;background:${pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--gold)' : 'var(--red)'}"></span></div>
    <div class="fcstat"><div><b>${BN_NUM(came.length)}/${BN_NUM(rows.length)}</b><span>ক্লাসে এসেছেন</span></div><div><b>${BN_NUM(late)}</b><span>দেরিতে</span></div><div><b>${BN_NUM(Math.round(hours))}</b><span>মোট ঘণ্টা</span></div></div>
    ${pct < 80 ? '<div class="tip">⚠️ উপস্থিতি ৮০%-এর নিচে। জাপানে ভর্তি আর ভিসার আবেদনে ক্লাসের উপস্থিতি দেখা হয় — নিয়মিত ক্লাসে আসুন।</div>' : '<div class="tip">👍 উপস্থিতি ভালো আছে, এভাবেই চালিয়ে যান।</div>'}</div>
    <div id="attbox">${month}</div>`;
}


// ---- my Japan file (জাপান আবেদন)
const JSTAGES = [['none', 'শুরু হয়নি'], ['docs', 'কাগজ জোগাড়'], ['school', 'স্কুল বাছাই'], ['applied', 'আবেদন জমা'], ['coe', 'COE পেয়েছে'], ['visa', 'ভিসা পেয়েছে'], ['departed', 'জাপানে গেছে']];
const APP_ST = { preparing: 'কাগজ তৈরি হচ্ছে', submitted: 'স্কুলে আবেদন জমা', interview: 'ইন্টারভিউ', accepted: 'স্কুল নিয়েছে', coe_applied: 'COE-র আবেদন হয়েছে', coe_granted: 'COE পেয়েছে', visa: 'ভিসা পেয়েছে', departed: 'জাপানে গেছে', rejected: 'স্কুল নেয়নি', coe_denied: 'COE পায়নি', withdrawn: 'বাদ দেওয়া হয়েছে' };
const APP_FLOW = ['preparing', 'submitted', 'interview', 'accepted', 'coe_applied', 'coe_granted', 'visa', 'departed'];
const DOC_TYPES = [['photo', 'পাসপোর্ট সাইজ ছবি'], ['passport', 'পাসপোর্ট'], ['nid', 'NID / জন্ম নিবন্ধন'], ['ssc', 'SSC সনদ ও মার্কশিট'], ['hsc', 'HSC সনদ ও মার্কশিট'], ['degree', 'স্নাতক / ডিপ্লোমা সনদ'], ['jlpt', 'JLPT / NAT সনদ'], ['study_hours', 'স্টাডি-আওয়ার সার্টিফিকেট'], ['sponsor', 'স্পনসরের আয়ের প্রমাণ'], ['bank', 'ব্যাংক স্টেটমেন্ট / সলভেন্সি'], ['relation', 'স্পনসরের সাথে সম্পর্কের প্রমাণ'], ['other', 'অন্যান্য']];
const REQUIRED_DOCS = ['photo', 'passport', 'nid', 'ssc', 'hsc', 'study_hours', 'sponsor', 'bank', 'relation'];
function japanHtml(j) {
  if (!j) return '<div class="card"><div class="empty">তথ্য পাওয়া যায়নি।</div></div>';
  const apps = j.applications || [], docs = j.documents || []; const today = bdToday();
  if (j.stage === 'none' && !apps.length && !docs.length) return `<div class="card acct"><b style="font-size:16px">🇯🇵 জাপানে পড়তে যাওয়া</b><p style="margin:8px 0 0;line-height:1.7">আপনার জাপান আবেদনের কাজ এখনো শুরু হয়নি। জাপানের ভাষাস্কুলে ভর্তি হতে চাইলে অফিসে কথা বলুন — কাজ শুরু হলে এখানে প্রতিটা ধাপ আর কোন কাগজ লাগবে দেখতে পাবেন।</p></div>`;
  const si = Math.max(0, JSTAGES.findIndex(([k]) => k === j.stage));
  const stepper = `<div class="card acct"><b style="font-size:16px">আমার জাপান যাত্রা</b>${j.target_school || j.intake ? `<div class="small muted" style="margin-top:2px">${esc([j.target_school, j.intake && j.intake + ' সেশন'].filter(Boolean).join(' · '))}</div>` : ''}
    <div class="jsteps">${JSTAGES.slice(1).map(([k, l], i) => `<div class="js ${i + 1 < si ? 'done' : i + 1 === si ? 'cur' : ''}"><span>${i + 1 < si ? '✓' : BN_NUM(i + 1)}</span><small>${l}</small></div>`).join('')}</div></div>`;
  const dt = (lbl, v) => v ? `<div><span class="muted">${lbl}:</span> <b>${fmtD(v)}</b>${v >= today ? ` <span class="small muted">(আর ${BN_NUM(daysBetween(today, v))} দিন)</span>` : ''}</div>` : '';
  const appCards = apps.map(a => { const fi = APP_FLOW.indexOf(a.status); const closed = fi < 0;
    return `<div class="card acct"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px"><div style="min-width:0"><b>${esc(a.school_ja || a.school_en || 'স্কুল')}</b>${a.school_en && a.school_ja ? `<div class="small muted">${esc(a.school_en)}</div>` : ''}<div class="small muted">${esc([a.prefecture, a.city].filter(Boolean).join(', '))}${a.intake ? ' · ' + esc(a.intake) + ' সেশন' : ''}</div></div>
      <span class="pill ${closed ? 'bad' : fi >= 5 ? 'ok' : 'warn'}">${esc(APP_ST[a.status] || a.status)}</span></div>
      ${closed ? '' : `<div class="aflow">${APP_FLOW.map((k, i) => `<i class="${i < fi ? 'done' : i === fi ? 'cur' : ''}" title="${esc(APP_ST[k])}"></i>`).join('')}</div>`}
      <div class="adates small">${dt('আবেদনের শেষ তারিখ', a.status === 'preparing' ? a.deadline_on : null)}${dt('আবেদন জমা', a.submitted_on)}${dt('ইন্টারভিউ', a.interview_on)}${dt('COE-র ফল', a.result_on)}${dt('জাপান যাত্রা', a.depart_on)}</div></div>`; }).join('');
  const byType = Object.fromEntries(docs.map(d => [d.doc_type, d]));
  const types = [...REQUIRED_DOCS, ...docs.map(d => d.doc_type).filter(t => !REQUIRED_DOCS.includes(t))];
  const warn = (t, d) => {
    if (!d) return '';
    if (t === 'passport' && d.expires_on) { const m = daysBetween(today, d.expires_on) / 30.4; if (m < 0) return 'মেয়াদ শেষ — নতুন পাসপোর্ট লাগবে'; if (m < (j.rules || {}).passport_months) return `মেয়াদ শেষ হবে ${fmtD(d.expires_on)} — নবায়ন করুন`; }
    if ((t === 'bank' || t === 'sponsor') && d.issued_on && daysBetween(d.issued_on, today) > ((j.rules || {}).fresh_days || 90)) return `কাগজটা পুরনো (${fmtD(d.issued_on)}) — নতুন করে আনতে হবে`;
    return '';
  };
  let need = 0;
  const rows = types.map(t => { const d = byType[t]; const st = d ? d.status : 'missing'; const w = warn(t, d); if (st === 'missing' || w) need++;
    const lbl = (DOC_TYPES.find(([k]) => k === t) || [t, t])[1];
    return `<div class="doc ${w ? 'w' : st}"><span class="ds">${st === 'verified' && !w ? '✓' : st === 'received' && !w ? '◐' : '!'}</span><div style="min-width:0;flex:1"><b>${esc(lbl)}</b>${REQUIRED_DOCS.includes(t) ? '' : ' <span class="small muted">(ঐচ্ছিক)</span>'}
      <div class="small ${w || st === 'missing' ? 'red' : 'muted'}">${w ? '⚠️ ' + esc(w) : st === 'missing' ? 'এখনো জমা দেননি — অফিসে দিন' : st === 'received' ? 'জমা হয়েছে, অফিস যাচাই করছে' : 'যাচাই হয়েছে'}</div></div></div>`; }).join('');
  return `${stepper}
    ${apps.length ? `<h2 class="lvl" style="margin-top:18px">স্কুলে আবেদন (${BN_NUM(apps.length)})</h2>${appCards}` : ''}
    <h2 class="lvl" style="margin-top:18px">কাগজপত্র ${need ? `<span class="pill bad" style="font-size:12px;vertical-align:middle">${BN_NUM(need)}টি বাকি</span>` : '<span class="pill ok" style="font-size:12px;vertical-align:middle">সব ঠিক আছে ✓</span>'}</h2>
    <div class="card" style="padding:4px 14px">${rows}</div>
    <p class="small muted" style="margin-top:8px">কাগজ জমা দিতে বা কিছু বুঝতে না পারলে অফিসে যোগাযোগ করুন।</p>`;
}


// ------------------------------------------------------------------ badges (ব্যাজ) — worked out from what the student has done
function fcLearned(d, deck) {
  let n = 0; for (const lv of ['N5', 'N4', 'N3']) { try { const st = JSON.parse(localStorage.getItem(`sakura_fc_${(d.student || {}).admission_no || 'preview'}_${lv}_${deck}`) || '{}'); n += Object.values(st).filter(x => x.b >= 3).length; } catch { /* none */ } }
  return n;
}
function badgeList(d) {
  const st = d.streak || {}; const h = (d.history || []).filter(a => a.total); const pct = (a) => Math.round(a.score * 100 / a.total);
  const passes = h.filter(a => pct(a) >= (a.pass_pct || 60)); const best = h.length ? Math.max(...h.map(pct)) : 0;
  const kanji = fcLearned(d, 'kanji'), words = fcLearned(d, 'words');
  const B = (id, icon, name, desc, have, need) => ({ id, icon, name, desc, have: Math.min(have, need), need, done: have >= need });
  return [
    B('day1', '🌱', 'প্রথম পা', 'প্রথম দিন পড়া শেষ করুন', st.total || 0, 1),
    B('streak7', '🔥', '৭ দিন টানা', 'টানা ৭ দিন পড়ুন', st.best || 0, 7),
    B('streak30', '🌋', '৩০ দিন টানা', 'টানা ৩০ দিন পড়ুন', st.best || 0, 30),
    B('days50', '📚', '৫০ দিনের পড়ুয়া', 'মোট ৫০ দিন পড়ুন', st.total || 0, 50),
    B('mock1', '📝', 'প্রথম মক টেস্ট', 'একটা মক টেস্ট শেষ করুন', h.length, 1),
    B('pass1', '🎯', 'প্রথম পাস', 'কোনো মক টেস্টে পাস করুন', passes.length, 1),
    B('fullpass', '🏅', 'পূর্ণ মক পাস', 'একটা পূর্ণ মক টেস্টে পাস করুন', passes.filter(a => mockCat(a) === 'full').length, 1),
    B('score90', '💯', '৯০% ক্লাব', 'কোনো টেস্টে ৯০% বা বেশি পান', best >= 90 ? 1 : 0, 1),
    B('mocks20', '🏃', '২০টা টেস্ট', 'মোট ২০টা মক টেস্ট দিন', h.length, 20),
    B('words100', '🗂️', '১০০ শব্দ', 'ফ্ল্যাশকার্ডে ১০০টা শব্দ ভালোভাবে শিখুন', words, 100),
    B('kanji50', '🈴', '৫০ কানজি', 'ফ্ল্যাশকার্ডে ৫০টা কানজি ভালোভাবে শিখুন', kanji, 50),
    B('clean', '🧹', 'ভুলের খাতা খালি', 'অন্তত ৩টা টেস্টের পর ভুলের খাতা খালি করুন', h.length >= 3 && !(d.mistakes || []).length ? 1 : 0, 1),
  ];
}
function badgesHtml(d) {
  const bs = badgeList(d); const n = bs.filter(b => b.done).length;
  return `<div class="card acct"><div class="row" style="justify-content:space-between;align-items:baseline"><b style="font-size:16px">🏅 আমার ব্যাজ</b><span class="pill ${n ? 'ok' : 'warn'}">${BN_NUM(n)}/${BN_NUM(bs.length)}</span></div>
    <div class="small muted" style="margin-top:4px">পড়া, মক টেস্ট আর ফ্ল্যাশকার্ড করে ব্যাজ জিতুন।</div></div>
    <div class="bdg">${bs.map(b => `<div class="bd ${b.done ? 'on' : ''}"><div class="bi">${b.icon}</div><b>${esc(b.name)}</b><span>${b.done ? '✓ পেয়েছেন' : esc(b.desc)}</span>${b.done || b.need === 1 ? '' : `<div class="bar" style="height:5px;margin-top:6px"><span style="width:${Math.round(b.have * 100 / b.need)}%;background:var(--gold)"></span></div><small>${BN_NUM(b.have)}/${BN_NUM(b.need)}</small>`}</div>`).join('')}</div>`;
}
function checkNewBadges(d) {
  if (d.preview || !d.student) return;
  const key = 'sakura_badges_' + d.student.admission_no; let seen; try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch { seen = null; }
  const got = badgeList(d).filter(b => b.done);
  if (seen) { const fresh = got.filter(b => !seen.includes(b.id)); if (fresh.length) setTimeout(() => toast(`🎉 নতুন ব্যাজ: ${fresh.map(b => b.icon + ' ' + b.name).join(', ')}`), 600); }
  try { localStorage.setItem(key, JSON.stringify(got.map(b => b.id))); } catch { /* not kept */ }
}

let ME_TAB = 'acct';
async function renderMe(d, user) {
  $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>'; scrollTo(0, 0);
  const tabs = [['acct', '💳 হিসাব'], ['att', '📅 হাজিরা'], ['jp', '🇯🇵 জাপান'], ['bdg', '🏅 ব্যাজ']];
  let body = '';
  try {
    if (ME_TAB === 'acct') {
      const a = await API.account(); d.account = a;
      if (!a) body = '<div class="card"><div class="empty">হিসাব পাওয়া যায়নি।</div></div>';
      else {
        const f = a.fee; const pct = f.net ? Math.min(100, Math.round(f.paid * 100 / f.net)) : 100; const late = f.due > 0 && f.next_due_date && f.next_due_date < bdToday();
        body = `<div class="card acct"><div class="row" style="justify-content:space-between;align-items:baseline"><b style="font-size:16px">কোর্স ফি</b>${f.due ? `<span class="pill ${late ? 'bad' : 'warn'}">বাকি ${tk(f.due)}</span>` : '<span class="pill ok">সব পরিশোধ ✓</span>'}</div>
          <div class="bar" style="margin:10px 0 6px;height:10px"><span style="width:${pct}%;background:var(--green)"></span></div>
          <div class="fcstat"><div><b>${tk(f.net)}</b><span>মোট ফি${f.discount ? ` (ছাড় ${tk(f.discount)})` : ''}</span></div><div><b>${tk(f.paid)}</b><span>পরিশোধ</span></div><div><b style="color:${f.due ? 'var(--red)' : 'var(--green)'}">${tk(f.due)}</b><span>বাকি</span></div></div>
          ${f.due && f.next_due_date ? `<div class="tip">${late ? '⚠️ পরের কিস্তির তারিখ পেরিয়ে গেছে' : '📅 পরের কিস্তি'}: <b>${fmtD(f.next_due_date)}</b>${late ? ' — দয়া করে তাড়াতাড়ি অফিসে যোগাযোগ করুন।' : ''}</div>` : ''}
          ${f.due ? '<div class="small muted" style="margin-top:8px">অফিসে বা বিকাশে টাকা দেওয়ার পর অফিস রশিদ লিখলেই এখানে দেখাবে।</div>' : ''}</div>
          ${a.processing && a.processing.fee ? `<div class="card acct"><div class="row" style="justify-content:space-between;align-items:baseline"><b style="font-size:16px">🇯🇵 জাপান প্রসেসিং ফি</b>${a.processing.due ? `<span class="pill warn">বাকি ${tk(a.processing.due)}</span>` : '<span class="pill ok">সব পরিশোধ ✓</span>'}</div>
            <div class="small" style="margin-top:6px">মোট ${tk(a.processing.fee)} · পরিশোধ ${tk(a.processing.paid)}</div></div>` : ''}
          <h2 class="lvl" style="margin-top:20px">টাকা দেওয়ার তালিকা (${BN_NUM(a.payments.length)})</h2>
          ${a.payments.length ? `<div class="card" style="padding:0;overflow:hidden"><table class="hist"><tr><th>তারিখ</th><th>বাবদ</th><th class="num">টাকা</th><th></th></tr>${a.payments.map(p => `<tr><td>${fmtD(p.paid_on)}<div class="small muted">${esc(p.receipt_no)}</div></td><td>${esc(PURPOSE[p.purpose] || p.purpose)}<div class="small muted">${esc(METHOD[p.method] || p.method)}</div></td><td class="num"><b>${tk(p.amount)}</b></td><td><button class="btn sm ghost" data-rcpt="${esc(p.id)}">রশিদ</button></td></tr>`).join('')}</table></div>` : '<div class="card"><div class="empty">এখনো কোনো টাকা দেওয়ার রেকর্ড নেই।</div></div>'}`;
      }
    }
    if (ME_TAB === 'bdg') { body = badgesHtml(d); }
    if (ME_TAB === 'jp') { body = japanHtml(await API.japan()); }
    if (ME_TAB === 'att') { const rows = await API.attendance(); d.att = rows; body = attendanceHtml(rows); }
  } catch (e) { body = `<div class="card"><div class="empty">${esc(errMsg(e))}</div></div>`; }
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">👤 আমার পাতা</b><button class="btn sm ghost" id="meback">‹ ফিরে যান</button></div>
    ${tabs.length > 1 ? `<div class="authtabs" style="margin:0 0 14px">${tabs.map(([k, l]) => `<button data-me="${k}" class="${ME_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}${body}</div>`;
  $('#meback').onclick = () => renderHome(d, user);
  $$('[data-me]').forEach(b => b.onclick = () => { ME_TAB = b.dataset.me; renderMe(d, user); });
  $$('[data-attm]').forEach(b => b.onclick = () => { ATT_MONTH = b.dataset.attm; const box = $('#attbox'); if (box) box.innerHTML = attendanceHtml(d.att, true); bindAttMonth(d, user); });
  $$('[data-rcpt]').forEach(b => b.onclick = () => { const p = d.account.payments.find(x => String(x.id) === b.dataset.rcpt); if (p) printStudentReceipt(d.account, p); });
}


// ------------------------------------------------------------------ notice board (নোটিশ)
let NT_OPEN = {};
const ntSeenKey = (d) => 'sakura_seen_notices_' + ((d.student || {}).admission_no || 'p');
function ntSeen(d) { try { return JSON.parse(localStorage.getItem(ntSeenKey(d)) || '[]'); } catch { return []; } }
function ntMarkSeen(d, ids) { const s = new Set(ntSeen(d)); ids.forEach(i => s.add(String(i))); try { localStorage.setItem(ntSeenKey(d), JSON.stringify([...s].slice(-200))); } catch { /* not kept */ } }
const ntWhen = (iso) => { const d = new Date(iso); return `${BN_NUM(d.getDate())} ${BN_MONTH[d.getMonth()]}`; };
function noticeRow(d, n, seen) {
  const open = !!NT_OPEN[n.id]; const isNew = !seen.includes(String(n.id));
  return `<div class="nt ${open ? 'open' : ''}" data-nt="${esc(n.id)}" role="button" tabindex="0" aria-expanded="${open}">
    <div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><b>${n.pinned ? '📌 ' : ''}${esc(n.title)}</b>${isNew ? ' <span class="newtag">নতুন</span>' : ''}<div class="small muted">${ntWhen(n.created_at)}${n.author ? ' · ' + esc(n.author) : ''}</div></div><span class="chev">${open ? '▲' : '▼'}</span></div>
    ${open && n.body ? `<div class="ntb">${esc(n.body)}</div>` : ''}</div>`;
}
function noticesHtml(d) {
  const ns = d.notices || []; if (!ns.length) return '';
  const seen = ntSeen(d); const unread = ns.filter(n => !seen.includes(String(n.id))).length;
  const show = ns.filter(n => n.pinned || !seen.includes(String(n.id))).slice(0, 3); const list = show.length ? show : ns.slice(0, 1);
  return `<div class="card ntc"><div class="row" style="justify-content:space-between;align-items:baseline"><b>📢 নোটিশ${unread ? ` <span class="cnt1">${BN_NUM(unread)} নতুন</span>` : ''}</b>${ns.length > list.length ? `<button class="linkbtn" id="ntall">সব নোটিশ (${BN_NUM(ns.length)})</button>` : ''}</div>
    ${list.map(n => noticeRow(d, n, seen)).join('')}</div>`;
}
function bindNotices(d, user, rerender) {
  $$('[data-nt]').forEach(el => { const f = () => { const id = el.dataset.nt; NT_OPEN[id] = !NT_OPEN[id]; if (NT_OPEN[id]) ntMarkSeen(d, [id]); rerender(); }; el.onclick = f; el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; });
  const all = $('#ntall'); if (all) all.onclick = () => renderNotices(d, user);
}
function renderNotices(d, user) {
  const ns = d.notices || []; const seen = ntSeen(d);
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">📢 সব নোটিশ</b><button class="btn sm ghost" id="ntback">‹ ফিরে যান</button></div>
    <div class="card ntc">${ns.length ? ns.map(n => noticeRow(d, n, seen)).join('') : '<div class="empty">কোনো নোটিশ নেই</div>'}</div></div>`;
  scrollTo(0, 0);
  $('#ntback').onclick = () => renderHome(d, user);
  bindNotices(d, user, () => renderNotices(d, user));
}


// ------------------------------------------------------------------ weekly leaderboard (সাপ্তাহিক র‍্যাঙ্কিং)
let LB_OPEN = false, LB_TAB = 'regular';
const MEDAL = ['🥇', '🥈', '🥉'];
function leaderboardHtml(d) {
  const L = d.lb; if (!L) return '';
  const me = L.me; const top = (L.regular || [])[0];
  const head = me ? (me.days || me.mocks ? `আপনি এই সপ্তাহে <b>${BN_NUM(me.rank)} নম্বরে</b> · ${BN_NUM(me.days)} দিন পড়েছেন` : 'এই সপ্তাহে এখনো পড়া শুরু করেননি — আজই শুরু করুন!') : `${esc(L.level)} · ${BN_NUM(L.students)} জন ছাত্র`;
  const list = LB_TAB === 'best' ? L.best : L.regular;
  return `<div class="card lb"><div class="lbh" id="lbtog" role="button" tabindex="0" aria-expanded="${LB_OPEN}"><div style="min-width:0;flex:1"><b>🏆 এই সপ্তাহের সেরা (${esc(L.level)})</b><div class="small muted">${head}</div></div>${top && !LB_OPEN ? `<span class="small">${MEDAL[0]} ${esc(top.name)}</span>` : ''}<span class="chev">${LB_OPEN ? '▲' : '▼'}</span></div>
    ${LB_OPEN ? `<div class="mchips" style="margin:10px 0 6px"><button data-lbt="regular" class="${LB_TAB === 'regular' ? 'on' : ''}">সবচেয়ে নিয়মিত</button><button data-lbt="best" class="${LB_TAB === 'best' ? 'on' : ''}">মক টেস্টে সেরা</button>${d.preview ? ['N5', 'N4', 'N3'].map(l => `<button data-lbl="${l}" class="${L.level === l ? 'on' : ''}">${l}</button>`).join('') : ''}</div>
      ${list.length ? list.map((r, i) => `<div class="lbr ${r.me ? 'me' : ''}"><span class="rk">${MEDAL[i] || BN_NUM(i + 1)}</span><span style="flex:1;min-width:0">${esc(r.name || '—')}${r.me ? ' <span class="small">(আপনি)</span>' : ''}</span><b>${LB_TAB === 'best' ? BN_NUM(r.pct) + '%' : BN_NUM(r.days) + ' দিন'}</b><span class="small muted" style="width:62px;text-align:right">${BN_NUM(r.mocks)}টি টেস্ট</span></div>`).join('') : `<div class="empty" style="padding:12px">${LB_TAB === 'best' ? 'এই সপ্তাহে এখনো কেউ মক টেস্ট দেয়নি — প্রথম হোন!' : 'এই সপ্তাহে এখনো কেউ পড়েনি — প্রথম হোন!'}</div>`}
      <div class="small muted" style="margin-top:8px">প্রতি শনিবার নতুন সপ্তাহ শুরু হয়। "আজকের পড়া", ফ্ল্যাশকার্ড বা মক টেস্ট — যেকোনোটা করলে সেদিন গোনা হয়। শুধু নামের প্রথম অংশ দেখানো হয়।</div>` : ''}</div>`;
}
function bindLeaderboard(d, user) {
  const t = $('#lbtog'); if (t) { const f = () => { LB_OPEN = !LB_OPEN; renderHome(d, user); }; t.onclick = f; t.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; }
  $$('[data-lbt]').forEach(b => b.onclick = () => { LB_TAB = b.dataset.lbt; renderHome(d, user); });
  $$('[data-lbl]').forEach(b => b.onclick = async () => { try { d.lb = await API.leaderboard(b.dataset.lbl); renderHome(d, user); } catch (e) { toast(errMsg(e), true); } });
}

// ------------------------------------------------------------------ daily study (আজকের পড়া) and streak
const bdToday = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);   // Bangladesh date
const dayNo = () => Math.floor((Date.now() + 6 * 3600000) / 86400000);
function streakFrom(days) {   // the same counting as streak_of() in the database
  const set = [...new Set(days)].sort(); const today = bdToday(); const d2n = (d) => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);
  let best = 0, run = 0, prev = null, cur = 0;
  for (const d of set) { const n = d2n(d); run = prev != null && n === prev + 1 ? run + 1 : 1; prev = n; best = Math.max(best, run); if (n >= d2n(today) - 1) cur = run; }
  return { streak: cur, best, today: set.includes(today), today_date: today, days: set.filter(d => d2n(d) > d2n(today) - 14), total: set.length };
}
const BN_NUM = (n) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const BN_MONTH = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
let DAILY_LV = ''; let DAILY_OPEN = null; let DAILY_PICK = null;
function dailyFor(lv) {
  const D = (window.SAKURA_DAILY || {})[lv]; if (!D) return null; const n = dayNo();
  const words = Array.from({ length: 5 }, (_, i) => D.words[(n * 5 + i) % D.words.length]);
  const kanji = D.kanji[n % D.kanji.length]; const g = D.grammar[n % D.grammar.length];
  const order = [0, 1, 2, 3].sort((a, b) => ((a * 7 + n) % 5) - ((b * 7 + n) % 5));   // the same order all day
  return { words, kanji, grammar: { q: g[0], opts: order.map(i => g[1][i]), correct: order.indexOf(0), expl: g[2] } };
}
function streakHtml(st) {
  if (!st) return '';
  const today = bdToday(); const d2 = (k) => new Date(Date.parse(today + 'T00:00:00Z') - k * 86400000).toISOString().slice(0, 10);
  const dots = Array.from({ length: 7 }, (_, i) => d2(6 - i)).map(d => `<span class="dot ${st.days.includes(d) ? 'on' : ''} ${d === today ? 'td' : ''}" title="${d}"></span>`).join('');
  return `<div class="streak"><div class="fire ${st.streak ? '' : 'off'}">🔥</div><div style="min-width:0"><b>${st.streak ? `টানা ${BN_NUM(st.streak)} দিন পড়েছেন` : 'আজ থেকে টানা পড়া শুরু করুন'}</b><div class="small muted">${st.today ? 'আজকের পড়া হয়ে গেছে ✓' : st.streak ? 'আজ পড়লে টানা হিসাব চলতে থাকবে' : 'প্রতিদিন "আজকের পড়া" শেষ করলে দিন গোনা হবে'}${st.best > 1 ? ` · সবচেয়ে বেশি ${BN_NUM(st.best)} দিন` : ''}</div></div><div class="dots" aria-label="গত ৭ দিন">${dots}</div></div>`;
}
function dailyHtml(d) {
  const lvs = (d.levels || []).filter(l => (window.SAKURA_DAILY || {})[l]); if (!lvs.length) return '';
  if (!lvs.includes(DAILY_LV)) DAILY_LV = lvs.includes((d.student || {}).current_level) ? d.student.current_level : lvs[0];
  const x = dailyFor(DAILY_LV); if (!x) return '';
  const st = d.streak || null; const done = st && st.today; const open = DAILY_OPEN == null ? !done : DAILY_OPEN;
  const t = new Date(Date.now() + 6 * 3600000); const dateBn = `${BN_NUM(t.getUTCDate())} ${BN_MONTH[t.getUTCMonth()]}`;
  const say = (j) => `<button type="button" class="say" data-sayj="${esc(j)}" aria-label="শুনুন">🔊</button>`;
  const pick = DAILY_PICK && DAILY_PICK.day === dayNo() && DAILY_PICK.lv === DAILY_LV ? DAILY_PICK.i : null;
  const g = x.grammar;
  return `<div class="card daily ${done ? 'done' : ''}">
    <div class="dhd" id="dtog" role="button" tabindex="0" aria-expanded="${open}"><div><b>📅 আজকের পড়া</b> <span class="small muted">${dateBn}</span></div>
      <div class="row" style="gap:6px">${lvs.length > 1 ? lvs.map(l => `<button type="button" class="lvchip ${l === DAILY_LV ? 'on' : ''}" data-dlv="${l}">${l}</button>`).join('') : `<span class="lvchip on">${DAILY_LV}</span>`}<span class="chev">${open ? '▲' : '▼'}</span></div></div>
    ${open ? `<div class="dsec">৫টি শব্দ</div>
    ${x.words.map(w => `<div class="dw"><div style="min-width:0"><span class="jp">${esc(w[0])}</span> <span class="rd">${esc(w[1])}</span><div class="small muted">${esc(w[2])}</div></div>${say(w[1])}</div>`).join('')}
    <div class="dsec">আজকের কানজি</div>
    <div class="dk"><div class="kbig">${esc(x.kanji[0])}</div><div><span class="jp">${esc(x.kanji[1])}</span> <span class="rd">${esc(x.kanji[2])}</span><div class="small muted">${esc(x.kanji[3])}</div></div>${say(x.kanji[2])}</div>
    <div class="dsec">আজকের ব্যাকরণ</div>
    <div class="dg"><div class="jp" style="white-space:pre-line">${esc(g.q)}</div>
      <div class="dgo">${g.opts.map((o, i) => `<button type="button" class="opt ${pick == null ? '' : i === g.correct ? 'right' : i === pick ? 'wrong' : ''}" data-dg="${i}" ${pick == null ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>
      ${pick == null ? '<div class="small muted" style="margin-top:6px">ঠিক উত্তরটা বেছে নিন</div>' : `<div class="small expl">${pick === g.correct ? '✓ ঠিক! ' : '✗ ঠিক উত্তর: ' + esc(g.opts[g.correct]) + '। '}${esc(g.expl)}</div>`}</div>
    ${done ? '<div class="ddone">✓ আজকের পড়া শেষ। কাল নতুন শব্দ আসবে।</div>' : `<button class="btn" id="ddone" style="width:100%;justify-content:center;margin-top:14px">আজকের পড়া শেষ করেছি ✓</button>`}` : ''}
  </div>`;
}
function bindDaily(d, user) {
  const tog = $('#dtog'); if (tog) { const flip = (e) => { if (e.target.closest('[data-dlv]')) return; DAILY_OPEN = !(DAILY_OPEN == null ? !(d.streak && d.streak.today) : DAILY_OPEN); renderHome(d, user); }; tog.onclick = flip; tog.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(e); } }; }
  $$('[data-dlv]').forEach(b => b.onclick = (e) => { e.stopPropagation(); DAILY_LV = b.dataset.dlv; DAILY_OPEN = true; renderHome(d, user); });
  $$('[data-sayj]').forEach(b => b.onclick = () => { if (!speakJa(b.dataset.sayj)) toast('জাপানি ভয়েস পাওয়া যায়নি। ফোনের Settings → Text-to-speech-এ জাপানি ভাষা যোগ করুন।', true); });
  $$('[data-dg]').forEach(b => b.onclick = () => { DAILY_PICK = { day: dayNo(), lv: DAILY_LV, i: Number(b.dataset.dg) }; renderHome(d, user); });
  const done = $('#ddone'); if (done) done.onclick = async () => {
    done.disabled = true;
    try { d.streak = await API.checkin('daily'); DAILY_OPEN = false; renderHome(d, user); toast(d.streak && d.streak.streak > 1 ? `দারুণ! টানা ${BN_NUM(d.streak.streak)} দিন 🔥` : 'দারুণ! কাল আবার আসবেন 🔥'); }
    catch (e) { done.disabled = false; toast(errMsg(e), true); }
  };
}


// ------------------------------------------------------------------ flashcards (ফ্ল্যাশকার্ড) — Leitner boxes, kept on this device
const FC_GAP = [0, 1, 3, 7, 14, 30];          // days until a card comes back, by box
const FC_NEW_PER_DAY = 10, FC_SESSION = 15;
let FC_LV = '', FC_DECK = 'words', FC = null;  // FC = the running session
const fcKey = (d) => `sakura_fc_${(d.student || {}).admission_no || 'preview'}_${FC_LV}_${FC_DECK}`;
function fcLoad(d) { try { return JSON.parse(localStorage.getItem(fcKey(d)) || '{}'); } catch { return {}; } }
function fcSave(d, st) { try { localStorage.setItem(fcKey(d), JSON.stringify(st)); } catch { /* storage full or blocked: progress just isn't kept */ } }
function fcCards() {
  const D = (window.SAKURA_DAILY || {})[FC_LV]; if (!D) return [];
  return FC_DECK === 'kanji' ? D.kanji.map(k => ({ id: k[0], front: k[0], word: k[1], reading: k[2], meaning: k[3] }))
    : D.words.map(w => ({ id: w[0], front: w[0], word: w[0], reading: w[1], meaning: w[2], sentence: w[3] }));
}
function fcStats(d) {
  const st = fcLoad(d); const cards = fcCards(); const t = bdToday();
  const seen = cards.filter(c => st[c.id]); const learned = seen.filter(c => st[c.id].b >= 3).length;
  const due = seen.filter(c => st[c.id].due <= t).length;
  const newToday = Object.values(st).filter(x => x.first === t).length;
  return { total: cards.length, seen: seen.length, learned, due, newLeft: Math.max(0, Math.min(FC_NEW_PER_DAY - newToday, cards.length - seen.length)) };
}
function fcHomeHtml(d) {
  const lvs = (d.levels || []).filter(l => (window.SAKURA_DAILY || {})[l]);
  if (!lvs.length) return '<div class="card"><div class="empty">আপনার লেভেলের ফ্ল্যাশকার্ড এখনো নেই।</div></div>';
  if (!lvs.includes(FC_LV)) FC_LV = lvs.includes((d.student || {}).current_level) ? d.student.current_level : lvs[0];
  if (FC) return fcCardHtml(d);
  const x = fcStats(d); const pct = x.total ? Math.round(x.learned * 100 / x.total) : 0; const go = x.due + x.newLeft;
  return `<div class="card fc">
    <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><div class="mchips" style="margin:0">${lvs.map(l => `<button data-fclv="${l}" class="${l === FC_LV ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="mchips" style="margin:0"><button data-fcdeck="words" class="${FC_DECK === 'words' ? 'on' : ''}">শব্দ</button><button data-fcdeck="kanji" class="${FC_DECK === 'kanji' ? 'on' : ''}">কানজি</button></div></div>
    <div class="fcstat"><div><b>${BN_NUM(x.learned)}</b><span>শেখা হয়েছে</span></div><div><b>${BN_NUM(x.due)}</b><span>আজ আবার দেখার</span></div><div><b>${BN_NUM(x.newLeft)}</b><span>আজকের নতুন</span></div></div>
    <div class="bar" style="margin:4px 0 2px"><span style="width:${pct}%;background:var(--green)"></span></div>
    <div class="small muted">${FC_LV} ${FC_DECK === 'kanji' ? 'কানজি' : 'শব্দ'}: মোট ${BN_NUM(x.total)}টির মধ্যে ${BN_NUM(x.learned)}টি ভালোভাবে শেখা (${BN_NUM(pct)}%)</div>
    ${go ? `<button class="btn" id="fcgo" style="width:100%;justify-content:center;margin-top:14px">শুরু করুন (${BN_NUM(Math.min(go, FC_SESSION))}টি কার্ড)</button>` : `<div class="ddone" style="margin-top:14px">✓ আজকের কার্ড শেষ। কাল আবার আসুন!</div><button class="btn ghost" id="fcmore" style="width:100%;justify-content:center;margin-top:8px">তবুও আরও অনুশীলন করব</button>`}
    <details class="small muted" style="margin-top:12px"><summary>কীভাবে কাজ করে?</summary><p style="margin:6px 0 0;line-height:1.7">কার্ড দেখে মনে মনে উত্তর ভাবুন, তারপর উল্টে মিলিয়ে নিন। "জানি" চাপলে কার্ডটা কয়েক দিন পরে আবার আসবে (১ → ৩ → ৭ → ১৪ → ৩০ দিন)। "জানি না" চাপলে আজই আবার আসবে। প্রতিদিন ${BN_NUM(FC_NEW_PER_DAY)}টি নতুন কার্ড যোগ হয়। আপনার হিসাব এই ফোন/কম্পিউটারেই রাখা থাকে।</p></details>
  </div>`;
}
function fcStart(d, extra) {
  const st = fcLoad(d); const t = bdToday(); const cards = fcCards();
  const due = cards.filter(c => st[c.id] && st[c.id].due <= t).sort((a, b) => st[a.id].b - st[b.id].b);
  const x = fcStats(d); const fresh = cards.filter(c => !st[c.id]).slice(0, extra ? 5 : x.newLeft);
  let q = [...due, ...fresh];
  if (extra && !q.length) q = cards.filter(c => st[c.id]).sort((a, b) => st[a.id].b - st[b.id].b).slice(0, 10);
  q = q.slice(0, FC_SESSION);
  FC = { q, i: 0, flip: false, know: 0, again: 0, total: q.length };
}
function fcCardHtml(d) {
  const c = FC.q[FC.i];
  if (!c) return `<div class="card fc" style="text-align:center"><div style="font-size:40px">🎉</div><b style="font-size:18px">এই দফা শেষ!</b>
    <p class="muted" style="margin:6px 0 0">জানা ছিল ${BN_NUM(FC.know)}টি · আবার দেখতে হয়েছে ${BN_NUM(FC.again)} বার</p>
    <button class="btn" id="fcback" style="width:100%;justify-content:center;margin-top:14px">ঠিক আছে</button></div>`;
  const left = FC.q.length - FC.i;
  return `<div class="card fc"><div class="row" style="justify-content:space-between"><span class="small muted">${FC_LV} · ${FC_DECK === 'kanji' ? 'কানজি' : 'শব্দ'} · বাকি ${BN_NUM(left)}</span><button class="linkbtn" id="fcstop">থামুন</button></div>
    <div class="fccard ${FC.flip ? 'flip' : ''}" id="fcflip" role="button" tabindex="0">
      <div class="fcfront ${FC_DECK === 'kanji' ? 'k' : ''}">${esc(c.front)}</div>
      ${FC.flip ? `<div class="fcback"><div class="jp" style="font-size:19px">${esc(c.word)} <span class="rd">${esc(c.reading)}</span> <button type="button" class="say" data-sayj="${esc(c.reading)}" aria-label="শুনুন">🔊</button></div><div style="font-size:17px;font-weight:600;margin-top:4px">${esc(c.meaning)}</div>${c.sentence ? `<div class="jp small muted" style="margin-top:6px;font-size:14.5px">${esc(c.sentence)}</div>` : ''}</div>` : '<div class="small muted" style="margin-top:14px">মনে মনে উচ্চারণ আর অর্থ ভাবুন, তারপর চাপুন</div>'}
    </div>
    ${FC.flip ? `<div class="fcbtns"><button class="btn ghost" id="fcno">✗ জানি না</button><button class="btn" id="fcyes">✓ জানি</button></div>` : `<button class="btn" id="fcshow" style="width:100%;justify-content:center;margin-top:12px">উল্টে দেখুন</button>`}
  </div>`;
}
function bindFc(d, user) {
  const re = () => renderHome(d, user);
  $$('[data-fclv]').forEach(b => b.onclick = () => { FC_LV = b.dataset.fclv; FC = null; re(); });
  $$('[data-fcdeck]').forEach(b => b.onclick = () => { FC_DECK = b.dataset.fcdeck; FC = null; re(); });
  const go = $('#fcgo'); if (go) go.onclick = () => { fcStart(d, false); re(); };
  const more = $('#fcmore'); if (more) more.onclick = () => { fcStart(d, true); if (!FC.q.length) { FC = null; toast('এখনো কোনো কার্ড নেই'); } re(); };
  const show = () => { if (FC && !FC.flip) { FC.flip = true; re(); } };
  const fl = $('#fcflip'); if (fl) { fl.onclick = (e) => { if (!e.target.closest('[data-sayj]')) show(); }; fl.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } }; }
  const sh = $('#fcshow'); if (sh) sh.onclick = show;
  const answer = (know) => {
    const st = fcLoad(d); const c = FC.q[FC.i]; const t = bdToday(); const cur = st[c.id] || { b: 0, first: t };
    if (know) { cur.b = Math.min(FC_GAP.length - 1, cur.b + 1); FC.know++; } else { cur.b = 0; FC.again++; FC.q.splice(Math.min(FC.q.length, FC.i + 4), 0, c); }
    cur.due = new Date(Date.parse(t + 'T00:00:00Z') + FC_GAP[cur.b] * 86400000).toISOString().slice(0, 10);
    st[c.id] = cur; fcSave(d, st); FC.i++; FC.flip = false;
    if (!FC.q[FC.i] && FC.know + FC.again >= 5) API.checkin('daily').then(s => { d.streak = s; }).catch(() => {});
    re();
  };
  const y = $('#fcyes'); if (y) y.onclick = () => answer(true);
  const n = $('#fcno'); if (n) n.onclick = () => answer(false);
  const st = $('#fcstop'); if (st) st.onclick = () => { FC = null; re(); };
  const bk = $('#fcback'); if (bk) bk.onclick = () => { FC = null; re(); };
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
    <div class="phd"><div class="sw"><span class="kamon">${KAMON}</span><div style="min-width:0"><b>${esc(s.name_bn || s.name_en)}</b><small>${esc(s.admission_no)} · ${esc((d.levels || []).join(', '))}${s.batch && BATCH[s.batch] ? ' · ' + esc(BATCH[s.batch]) : ''}</small></div></div><div class="row" style="gap:6px;flex:none">${d.preview ? '' : '<button class="out" id="mepg">👤 আমার পাতা</button>'}<button class="out" id="lo">লগআউট</button></div></div>
    ${d.preview ? `<div class="pvbar"><b>👁 প্রিভিউ</b> — ছাত্ররা যা দেখে, আপনি সেটাই দেখছেন। সব লেভেল দেখা যাচ্ছে, আর <span class="hidtag">লুকানো</span> চিহ্ন দেওয়া জিনিস ছাত্ররা এখনো দেখে না। এখানে টেস্ট দিলে নম্বর কোথাও জমা হয় না। <a href="../#/mocks">পোর্টালে ফিরুন</a></div>` : ''}
    ${noticesHtml(d)}
    ${d.blocked ? `<div class="card lock"><h2 style="margin-top:0">🔒 বইগুলো এখনো বন্ধ</h2><p style="margin:0 0 6px">${esc(WHY[d.blocked] || '')}</p>
      ${d.blocked === 'due' ? `<p style="margin:0">মোট কোর্স ফি ${tk(fee.net)} · পরিশোধ ${tk(fee.paid)} · <b style="color:var(--red)">বাকি ${tk(fee.due)}</b></p><p class="small muted" style="margin:6px 0 0">অফিসে বা বিকাশে টাকা দেওয়ার পর অফিস রশিদ লিখলেই এই পাতা নিজে থেকে খুলে যাবে — আবার লগইন করে দেখুন।</p>` : ''}
      ${total ? `<div class="teaser">${Object.entries(counts).map(([k, n]) => `<span>${esc(LEVEL_NAME[k] || k)}: ${n}টি উপকরণ</span>`).join('')}</div>` : ''}
      ${wa ? `<p style="margin:12px 0 0"><a class="btn sm wa" href="https://wa.me/${wa}?text=${encodeURIComponent(`আসসালামু আলাইকুম। আমি ${s.name_bn || s.name_en} (${s.admission_no})। ছাত্রদের সাইট নিয়ে কথা বলতে চাই।`)}" target="_blank" rel="noopener">অফিসে WhatsApp করুন</a></p>` : ''}</div>`
    : `${streakHtml(d.streak)}${d.preview ? '' : `<button class="bdlink" id="bdgo">🏅 আমার ব্যাজ: ${BN_NUM(badgeList(d).filter(b => b.done).length)}/${BN_NUM(badgeList(d).length)} ›</button>`}${countdownHtml(d)}${dailyHtml(d)}${leaderboardHtml(d)}<div class="authtabs" style="margin:0 0 14px"><button data-ht="mat" class="${HOME_TAB === 'mat' ? 'on' : ''}">📚 উপকরণ (${mats.length})</button><button data-ht="fc" class="${HOME_TAB === 'fc' ? 'on' : ''}">🃏 ফ্ল্যাশকার্ড</button><button data-ht="mock" class="${HOME_TAB === 'mock' ? 'on' : ''}">📝 মক টেস্ট (${(d.mocks || []).length})</button></div>
      ${HOME_TAB === 'fc' ? fcHomeHtml(d) : HOME_TAB === 'mock' ? (MK ? mistakesViewHtml(d) : progressHtml(d.history) + mistakesCardHtml(d) + mockListHtml(d.mocks || []) + historyHtml(d.history || [])) : mats.length ? `<div class="card open" style="padding:12px 16px"><b>স্বাগতম!</b> <span class="muted">আপনার লেভেলের ${mats.length}টি উপকরণ নিচে আছে। এগুলো শুধু আপনার নিজের পড়ার জন্য — অন্য কাউকে দেবেন না।</span></div>
      <input class="search" id="q" type="search" placeholder="খুঁজুন: পাঠের নাম, অধ্যায়…" aria-label="খুঁজুন">${groups.map(levelBlock).join('')}<div class="empty" id="none" hidden>কিছু পাওয়া যায়নি</div>`
      : '<div class="card"><div class="empty">আপনার লেভেলের জন্য এখনো কোনো উপকরণ যোগ করা হয়নি। শিগগিরই যোগ হবে।</div></div>'}`}
    <p class="small muted" style="text-align:center;margin-top:24px">${esc(I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট')}${I.phone ? ' · ' + esc(I.phone) : ''}</p></div>`;
  $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  const mp = $('#mepg'); if (mp) mp.onclick = () => renderMe(d, user);
  $$('[data-ht]').forEach(b => b.onclick = () => { HOME_TAB = b.dataset.ht; renderHome(d, user); });
  $$('[data-mc]').forEach(b => b.onclick = () => { MOCK_CAT_TAB = b.dataset.mc; renderHome(d, user); });
  bindDaily(d, user);
  bindFc(d, user);
  bindMistakes(d, user);
  bindCountdown(d, user);
  bindLeaderboard(d, user);
  const bg = $('#bdgo'); if (bg) bg.onclick = () => { ME_TAB = 'bdg'; renderMe(d, user); };
  checkNewBadges(d);
  bindNotices(d, user, () => renderHome(d, user));
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
  if (r.submitted_at && Date.now() - Date.parse(r.submitted_at) < 10 * 60000) API.checkin('mock').catch(() => {});
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
    if (!d.linked && d.staff && !DEMO) { const p = await Preview.load(user, d); p.streak = await API.streak(); try { p.exams = await API.examDates(); } catch (e) { p.exams = {}; } try { p.notices = await API.notices(); } catch (e) { p.notices = []; } try { p.lb = await API.leaderboard('N5'); } catch (e) { p.lb = null; } return renderHome(p, user); }
    if (!d.linked) return renderLink(d, user);
    if (!d.blocked) { try { [d.mocks, d.history] = await Promise.all([API.mockList(), API.mockHistory()]); } catch (e) { d.mocks = d.mocks || []; d.history = []; console.warn(e); } }
    if (!d.blocked) { try { d.streak = await API.streak(); } catch (e) { d.streak = null; console.warn(e); } }
    if (!d.blocked) { try { d.mistakes = await API.mistakes(); } catch (e) { d.mistakes = []; console.warn(e); } }
    try { d.exams = await API.examDates(); } catch (e) { d.exams = {}; console.warn(e); }
    try { d.notices = await API.notices(); } catch (e) { d.notices = []; console.warn(e); }
    if (!d.blocked) { try { d.lb = await API.leaderboard(); } catch (e) { d.lb = null; console.warn(e); } }
    renderHome(d, user);
  } catch (e) {
    $('#app').innerHTML = shellCard(`<h1>সমস্যা হয়েছে</h1><p>${esc(errMsg(e))}</p><div class="row" style="gap:8px"><button class="btn" id="rt">আবার চেষ্টা</button><button class="btn ghost" id="lo">লগআউট</button></div>`);
    $('#rt').onclick = start; $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  }
}

if (sb) sb.auth.onAuthStateChange((ev, session) => { if (session) API._token = session.access_token; if (ev === 'PASSWORD_RECOVERY') renderNewPassword(); });
if (!DEMO && /type=recovery/.test(location.hash)) setTimeout(() => { if (!$('#npf')) start(); }, 5000); // the recovery event above shows the new-password form
else start();
