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
// furigana written as {漢字|かんじ} shows as small reading above the kanji
const fx = (s) => esc(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
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
  homework() {
    const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) return [];
    const lv = this.levels(s); const subs = this.read('homework_submissions');
    return this.read('homework').filter(h => h.published !== false && (h.level === 'all' || lv.includes(h.level)) && (h.batch === 'all' || h.batch === s.batch))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map(h => { const x = subs.find(z => z.homework_id === h.id && z.student_id === s.id); return { id: h.id, title: h.title, body: h.body, level: h.level, due_on: h.due_on, max_marks: h.max_marks, author: h.author, created_at: h.created_at, sub: x ? { id: x.id, note: x.note, files: x.files, status: x.status, marks: x.marks, feedback: x.feedback, submitted_at: x.submitted_at, checked_at: x.checked_at } : null }; });
  },
  homeworkSubmit(hid, note, files) {
    const sid = this.linkedId(); if (!sid) throw new Error('not_linked'); const rows = this.read('homework_submissions'); const i = rows.findIndex(x => x.homework_id === hid && x.student_id === sid);
    if (i >= 0 && rows[i].status === 'checked') throw new Error('checked');
    const row = { ...(i >= 0 ? rows[i] : { id: 'hs-' + Date.now(), homework_id: hid, student_id: sid, feedback: '' }), note, files, status: 'submitted', marks: null, submitted_at: new Date().toISOString() };
    if (i >= 0) rows[i] = row; else rows.push(row); this.write('homework_submissions', rows); return this.homework();
  },
  async uploadHw(path, blob) { const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); }); const files = JSON.parse(localStorage.getItem('sakura_demo_files') || '{}'); files[path] = data; localStorage.setItem('sakura_demo_files', JSON.stringify(files)); return path; },
  qa() {
    const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) return null; const lv = this.levels(s); const all = this.read('student_questions');
    return { mine: all.filter(q => q.student_id === s.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), shared: all.filter(q => q.shared && q.status === 'answered' && lv.includes(q.level) && q.student_id !== s.id) };
  },
  ask(topic, body) { const sid = this.linkedId(); if (!sid) throw new Error('not_linked'); const s = this.read('students').find(x => x.id === sid); const rows = this.read('student_questions');
    rows.push({ id: 'q-' + Date.now(), student_id: sid, level: s.current_level || 'N5', topic, body, status: 'open', answer: '', shared: false, created_at: new Date().toISOString() }); this.write('student_questions', rows); return this.qa(); },
  referrals() { const sid = this.linkedId(); if (!sid) return null; const rows = this.read('students'); const i = rows.findIndex(x => x.id === sid); if (!rows[i].ref_code) { rows[i].ref_code = 'DEMO' + String(i + 10); this.write('students', rows); }
    const st = (() => { try { return JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); } catch { return {}; } })();
    return { code: rows[i].ref_code, reward: st.ref_reward || '', list: [...new Map(JSON.parse(localStorage.getItem('sakura_demo_inquiries') || '[]').concat(this.read('inquiries')).map(q => [q.id, q])).values()].filter(q => q.referred_by === sid || (q.ref && q.ref === rows[i].ref_code)).map(q => ({ name: (q.name || '').split(' ')[0], status: q.status, on: q.created_on })) }; },
  feedback() { const sid = this.linkedId(); if (!sid) return null; const per = bdToday().slice(0, 7); const f = this.read('class_feedback').find(x => x.student_id === sid && x.period === per); return { period: per, mine: f || null }; },
  feedbackSave(F) { const sid = this.linkedId(); if (!sid) throw new Error('not_linked'); const s = this.read('students').find(x => x.id === sid); const per = bdToday().slice(0, 7); const rows = this.read('class_feedback'); const i = rows.findIndex(x => x.student_id === sid && x.period === per);
    const row = { ...(i >= 0 ? rows[i] : { id: 'fb-' + Date.now(), student_id: sid, period: per, created_at: new Date().toISOString() }), level: s.current_level || '', batch: s.batch || '', overall: F.overall, explain: F.explain, pace: F.pace, homework: F.homework, liked: F.liked.trim(), improve: F.improve.trim(), updated_at: new Date().toISOString() };
    if (i >= 0) rows[i] = row; else rows.push(row); this.write('class_feedback', rows); return this.feedback(); },
  payproofs() { const sid = this.linkedId(); if (!sid) return null; const st = (() => { try { return JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); } catch { return {}; } })(); const pays = this.read('payments');
    return { numbers: { bkash: st.pay_bkash || '', nagad: st.pay_nagad || '', bank: st.pay_bank || '' }, list: this.read('pay_proofs').filter(p => p.student_id === sid).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map(p => ({ ...p, has_file: !!p.file_path, receipt_no: (pays.find(x => x.id === p.payment_id) || {}).receipt_no || null })) }; },
  payproofSubmit(method, amount, trx, sender, paid_on, file, note) { const sid = this.linkedId(); if (!sid) throw new Error('not_linked'); const rows = this.read('pay_proofs');
    if (rows.filter(r => r.student_id === sid && r.status === 'pending').length >= 3) throw new Error('busy');
    if (trx && (rows.some(r => (r.trx_id || '').toUpperCase() === trx && r.status !== 'rejected') || this.read('payments').some(p => (p.trx_id || '').trim().toUpperCase() === trx))) throw new Error('dup_trx');
    rows.push({ id: 'pp-' + Date.now(), student_id: sid, method, amount, trx_id: trx, sender, paid_on, file_path: file || null, note, status: 'pending', reply: '', created_at: new Date().toISOString() }); this.write('pay_proofs', rows); return this.payproofs(); },
  docs() { const sid = this.linkedId(); return this.read('documents').filter(x => x.student_id === sid).map(x => ({ doc_type: x.doc_type, status: x.status, file_path: x.file_path || null, feedback: x.feedback || '', expires_on: x.expires_on, issued_on: x.issued_on, updated_at: x.updated_at, student_upload_at: x.student_upload_at })); },
  docUpload(type, path, exp, iss) { const sid = this.linkedId(); if (!sid) throw new Error('not_linked'); const rows = this.read('documents'); const i = rows.findIndex(x => x.student_id === sid && x.doc_type === type); const now = new Date().toISOString();
    if (i >= 0 && rows[i].status === 'verified') throw new Error('verified');
    const row = { ...(i >= 0 ? rows[i] : { id: 'doc-' + Date.now(), student_id: sid, doc_type: type, note: '' }), status: 'received', file_path: path, feedback: '', student_upload_at: now, updated_at: now };
    if (exp) row.expires_on = exp; if (iss) row.issued_on = iss; if (i >= 0) rows[i] = row; else rows.push(row); this.write('documents', rows); return this.docs(); },
  docRequests() { const sid = this.linkedId(); return this.read('doc_requests').filter(r => r.student_id === sid).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); },
  docRequest(kind, purpose, note) { const sid = this.linkedId(); if (!sid) throw new Error('not_linked'); const rows = this.read('doc_requests'); if (rows.filter(r => r.student_id === sid && r.status === 'pending').length >= 3) throw new Error('busy');
    rows.push({ id: 'dr-' + Date.now(), student_id: sid, kind, purpose, note, status: 'pending', reply: '', created_at: new Date().toISOString() }); this.write('doc_requests', rows); return this.docRequests(); },
  videoViews() { const sid = this.linkedId(); return this.read('video_views').filter(v => v.student_id === sid).map(v => ({ id: v.material_id, done: v.done, last_at: v.last_at })); },
  videoSeen(mid, done) { const sid = this.linkedId(); if (!sid) return null; const rows = this.read('video_views'); const i = rows.findIndex(v => v.student_id === sid && v.material_id === mid); const now = new Date().toISOString();
    if (i >= 0) { rows[i].last_at = now; rows[i].done = rows[i].done || !!done; if (!done) rows[i].times++; } else rows.push({ student_id: sid, material_id: mid, first_at: now, last_at: now, times: 1, done: !!done });
    this.write('video_views', rows); if (done) this.checkin('daily'); return this.videoViews(); },
  routine() {
    const uid = this.uid(); const s = uid && this.read('students').find(x => x.auth_user_id === uid); if (!s) return null;
    const st = (() => { try { return JSON.parse(localStorage.getItem('sakura_demo_settings') || '{}'); } catch { return {}; } })();
    const t = bdToday(); const end = isoPlus(t, 45); const lv = s.current_level;
    return { today: t, level: lv, batch: s.batch, class_days: Array.isArray(st.class_days) && st.class_days.length ? st.class_days : [0, 1, 2, 3, 4, 6], online_link: st.online_link || '', times: { morning: st.time_morning || '', evening: st.time_evening || '' },
      holidays: this.read('holidays').filter(h => h.on_date >= t && h.on_date <= end && (h.batch === 'all' || h.batch === s.batch)).sort((a, b) => a.on_date.localeCompare(b.on_date)).map(h => ({ date: h.on_date, title: h.title, batch: h.batch })),
      plans: this.read('class_plans').filter(p => p.class_date >= t && p.class_date <= end && p.level === lv && (p.batch === 'all' || p.batch === s.batch)).sort((a, b) => a.class_date.localeCompare(b.class_date)).map(p => ({ date: p.class_date, topic: p.topic, note: p.note, online_link: p.online_link })),
      recent: this.read('sessions').filter(x => x.level === lv && x.batch === s.batch && x.class_date <= t).sort((a, b) => b.class_date.localeCompare(a.class_date)).slice(0, 8).map(x => ({ date: x.class_date, topic: x.topic, class_no: x.class_no })) };
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
    PREVIEW = { attempts: {}, n: 0, director: role === 'admin' };
    return { linked: true, preview: true, institute: d.institute, levels: ['N5', 'N4', 'N3'], counts, materials, mocks, history: [], fee: {},
      student: { name_bn: prof ? prof.name : (user.email || ''), admission_no: role === 'admin' ? 'পরিচালক · প্রিভিউ' : role === 'deputy' ? 'উপ-পরিচালক · প্রিভিউ' : role === 'teacher' ? 'শিক্ষক · প্রিভিউ' : 'স্টাফ · প্রিভিউ' } };
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
      try { const dn = new Set(JSON.parse(localStorage.getItem('sakura_preview_done') || '[]')); dn.add(a.t.id); localStorage.setItem('sakura_preview_done', JSON.stringify([...dn])); } catch (_) {}
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
  async homework() { if (PREVIEW) return []; if (DEMO) return Demo.homework(); const { data, error } = await sb.rpc('student_homework'); if (error) throw error; return data || []; },
  async homeworkSubmit(hid, note, files) { if (DEMO) return Demo.homeworkSubmit(hid, note, files); const { data, error } = await sb.rpc('student_homework_submit', { p_homework: hid, p_note: note, p_files: files }); if (error) throw error; return data || []; },
  async myStudentId() { if (DEMO) return Demo.linkedId(); const { data, error } = await sb.rpc('my_student_id'); if (error) throw error; return data; },
  async uploadHw(path, blob) { if (DEMO) return Demo.uploadHw(path, blob); const { error } = await sb.storage.from('homework').upload(path, blob, { upsert: false, contentType: blob.type || undefined }); if (error) throw error; return path; },
  async hwUrl(path) { if (DEMO) return Demo.fileUrl(path); const { data, error } = await sb.storage.from('homework').createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; },
  async hwRemove(path) { if (DEMO) return; await sb.storage.from('homework').remove([path]).catch(() => {}); },
  async qa() { if (DEMO) return Demo.qa(); const { data, error } = await sb.rpc('student_qa'); if (error) throw error; return data; },
  async ask(topic, body) { if (DEMO) return Demo.ask(topic, body); const { data, error } = await sb.rpc('student_ask', { p_topic: topic, p_body: body }); if (error) throw error; return data; },
  async referrals() { if (PREVIEW) return null; if (DEMO) return Demo.referrals(); const { data, error } = await sb.rpc('student_referrals'); if (error) throw error; return data; },
  async feedback() { if (PREVIEW) return null; if (DEMO) return Demo.feedback(); const { data, error } = await sb.rpc('student_feedback'); if (error) throw error; return data; },
  async feedbackSave(F) { if (DEMO) return Demo.feedbackSave(F); const { data, error } = await sb.rpc('student_feedback_save', { p_overall: F.overall, p_explain: F.explain, p_pace: F.pace, p_homework: F.homework, p_liked: F.liked, p_improve: F.improve }); if (error) throw error; return data; },
  async payproofs() { if (PREVIEW) return null; if (DEMO) return Demo.payproofs(); const { data, error } = await sb.rpc('student_payproofs'); if (error) throw error; return data; },
  async payproofSubmit(m, a, t, snd, dt, f, n) { if (DEMO) return Demo.payproofSubmit(m, a, t, snd, dt, f, n); const { data, error } = await sb.rpc('student_payproof_submit', { p_method: m, p_amount: a, p_trx: t, p_sender: snd, p_paid_on: dt, p_file: f || '', p_note: n }); if (error) throw error; return data; },
  async uploadProof(path, blob) { if (DEMO) return Demo.uploadHw(path, blob); const { error } = await sb.storage.from('payproof').upload(path, blob, { upsert: false, contentType: blob.type || undefined }); if (error) throw error; return path; },
  async docs() { if (PREVIEW) return []; if (DEMO) return Demo.docs(); const { data, error } = await sb.rpc('student_docs'); if (error) throw error; return data || []; },
  async docUpload(t, p, e, i) { if (DEMO) return Demo.docUpload(t, p, e, i); const { data, error } = await sb.rpc('student_doc_upload', { p_type: t, p_path: p, p_expires: e, p_issued: i }); if (error) throw error; return data || []; },
  async uploadDoc(path, blob) { if (DEMO) return Demo.uploadHw(path, blob); const { error } = await sb.storage.from('documents').upload(path, blob, { upsert: false, contentType: blob.type || undefined }); if (error) throw error; return path; },
  async docFileUrl(path) { if (DEMO) return Demo.fileUrl(path); const { data, error } = await sb.storage.from('documents').createSignedUrl(path, 600); if (error) throw error; return data.signedUrl; },
  async docRequests() { if (PREVIEW) return []; if (DEMO) return Demo.docRequests(); const { data, error } = await sb.rpc('student_doc_requests'); if (error) throw error; return data || []; },
  async docRequest(kind, purpose, note) { if (DEMO) return Demo.docRequest(kind, purpose, note); const { data, error } = await sb.rpc('student_doc_request', { p_kind: kind, p_purpose: purpose, p_note: note }); if (error) throw error; return data || []; },
  async videoViews() { if (PREVIEW) return []; if (DEMO) return Demo.videoViews(); const { data, error } = await sb.rpc('student_video_views'); if (error) throw error; return data || []; },
  async videoSeen(id, done = false) { if (PREVIEW) return null; if (DEMO) return Demo.videoSeen(id, done); const { data, error } = await sb.rpc('student_video_seen', { p_material: id, p_done: !!done }); if (error) throw error; return data; },
  async routine() { if (DEMO) return Demo.routine(); const { data, error } = await sb.rpc('student_routine'); if (error) throw error; return data; },
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

// ---- language: বাংলা / English (the switch itself lives in i18n.js)

// ---- "আমি": profile card, a small progress dashboard, light / dark look
const meOpen = () => { try { return JSON.parse(localStorage.getItem('sakura_me_open') || '{}'); } catch (_) { return {}; } };
function stThemeSmall() { const dk = document.documentElement.dataset.theme === 'dark'; return `<span class="thwrap"><button type="button" class="thsm" data-sttheme="${dk ? 'light' : 'dark'}" aria-label="${dk ? 'হালকা রং' : 'গাঢ় রং'}" title="${dk ? 'হালকা রং' : 'গাঢ় রং'}">${dk ? '☀️' : '🌙'}</button></span>`; }
function stThemeHtml() { const dk = document.documentElement.dataset.theme === 'dark'; return `<div class="langsw"><button type="button" data-sttheme="light" class="${dk ? '' : 'on'}">☀️ হালকা</button><button type="button" data-sttheme="dark" class="${dk ? 'on' : ''}">🌙 গাঢ়</button></div>`; }
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-sttheme]'); if (!b) return; const t = b.dataset.sttheme; document.documentElement.dataset.theme = t; try { localStorage.setItem('sakura_st_theme', t); } catch (_) {} b.parentElement.outerHTML = b.classList.contains('thsm') ? stThemeSmall() : stThemeHtml(); const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = t === 'dark' ? '#0D1322' : '#1B2945'; });
function meCardHtml(d, s) {
  const nm = s.name_bn || s.name_en || ''; const st = d.streak || {};
  return `<div class="mecard"><div class="mav">${esc((nm.trim()[0] || '?').toUpperCase())}</div><div class="mtx"><b>${esc(nm)}</b><span>${esc(s.admission_no || '')}</span><div class="mtags">${(d.levels || []).map(l => `<i>${esc(l)}</i>`).join('')}${s.batch && BATCH[s.batch] ? `<i class="b">${esc(BATCH[s.batch])}</i>` : ''}</div></div>${st.streak ? `<div class="mfire" title="টানা পড়ার দিন"><b>${BN_NUM(st.streak)}</b><span>🔥 দিন</span></div>` : ''}</div>`;
}
function sparkSt(vals, cls) {
  if (vals.length < 2) return '';
  const w = 100, h = 30, max = Math.max(...vals, 1), min = Math.min(...vals, 0), step = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - 3 - ((v - min) / ((max - min) || 1)) * (h - 7)]);
  const dd = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  return `<svg class="msp ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${dd} L${w} ${h} L0 ${h}Z" class="a"/><path d="${dd}" class="l"/></svg>`;
}
function meStatsHtml(d) {
  const st = d.streak || {}; const days = new Set(st.days || []); const t = bdToday();
  const last14 = Array.from({ length: 14 }, (_, i) => { const x = new Date(t + 'T00:00:00'); x.setDate(x.getDate() - (13 - i)); return x.toISOString().slice(0, 10); });
  const wk = last14.slice(-7).filter(x => days.has(x)).length;
  const hs = (d.history || []).filter(a => a.total).slice().reverse(); const ps = hs.map(a => Math.round(a.score * 100 / a.total));
  const avg5 = ps.length ? Math.round(ps.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, ps.length)) : null;
  return `<div class="mstats">
    <div class="mst"><span class="k">🔥 এই সপ্তাহে পড়েছেন</span><b>${BN_NUM(wk)}<small>/৭ দিন</small></b><div class="mdays">${last14.map(x => `<i class="${days.has(x) ? 'on' : ''} ${x === t ? 'td' : ''}"></i>`).join('')}</div><span class="s">শেষ ১৪ দিন</span></div>
    <div class="mst"><span class="k">📝 মক টেস্টের গড়</span><b>${avg5 == null ? '—' : BN_NUM(avg5) + '<small>%</small>'}</b>${sparkSt(ps.slice(-10), avg5 != null && avg5 >= 60 ? 'ok' : 'bad')}<span class="s">${ps.length ? `শেষ ${BN_NUM(Math.min(5, ps.length))}টির গড় · মোট ${BN_NUM(ps.length)}টি` : 'এখনো টেস্ট দেননি'}</span></div>
    <div class="mst" id="statt"><span class="k">📅 হাজিরা</span><b>…</b><span class="s">লোড হচ্ছে</span></div>
  </div>`;
}
async function fillAttStat(d) {
  try { const rows = d.att || await API.attendance(); d.att = rows; const el = $('#statt'); if (!el) return;
    if (!rows.length) { el.innerHTML = '<span class="k">📅 হাজিরা</span><b>—</b><span class="s">এখনো হাজিরা নেই</span>'; return; }
    const ok = (r) => r.status === 'present' || r.status === 'late'; const pct = Math.round(rows.filter(ok).length * 100 / rows.length);
    const last = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-10);
    el.innerHTML = `<span class="k">📅 হাজিরা</span><b class="${pct >= 80 ? 'g' : 'r'}">${BN_NUM(pct)}<small>%</small></b><div class="mdays">${last.map(r => `<i class="${ok(r) ? 'on' : 'off'}" title="${esc(String(r.date))}"></i>`).join('')}</div><span class="s">${pct >= 80 ? 'দারুণ! ৮০%-এর ওপরে' : 'সার্টিফিকেটের জন্য ৮০% লাগে'}</span>`;
  } catch (e) { const el = $('#statt'); if (el) el.remove(); }
}
function langSwitchHtml() { const en = window.SK_LANG === 'en'; return `<div class="langsw" data-noi18n><button type="button" data-lang="bn" class="${en ? '' : 'on'}">বাংলা</button><button type="button" data-lang="en" class="${en ? 'on' : ''}">English</button></div>`; }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b && window.setLang && b.dataset.lang !== window.SK_LANG) window.setLang(b.dataset.lang); });
function renderAuth(mode = 'in', note = '', turned = false) {
  document.title = 'ছাত্রদের সাইট · সাকুরা';
  const up = mode === 'up'; const glow = (html) => `<span class="glow">${html}</span>`;
  $('#app').innerHTML = shellCard(`
    ${langSwitchHtml()}
    <h1 class="ahead">${up ? 'Start your first page<br>with <em>Sakura</em>' : mode === 'reset' ? 'Reset password' : 'Welcome <em>back</em>'}</h1>
    <p class="asub">${up ? 'সাকুরার সাথে আপনার প্রথম পাতা শুরু করুন — ভর্তি হওয়া ছাত্র-ছাত্রীদের জন্য' : mode === 'reset' ? 'ইমেইলে পাসওয়ার্ড বদলানোর লিংক পাঠানো হবে' : 'আবার স্বাগতম — আপনার পড়া, টেস্ট আর আইডি কার্ড এখানে'}</p>
    ${DEMO ? '<div class="demo-bar">ডেমো মোড: যেকোনো ইমেইল দিয়ে ঢুকে দেখুন। পোর্টালের ডেমো তথ্য ব্যবহার হবে।</div>' : ''}
    <form id="af" autocomplete="on">
      <label class="f">ইমেইল${glow('<input name="email" type="email" required autocomplete="username" inputmode="email" placeholder="you@example.com">')}</label>
      ${mode === 'reset' ? '' : `<label class="f">পাসওয়ার্ড${up ? ' (অন্তত ৮ অক্ষর)' : ''}${glow(`<input name="password" type="password" required minlength="${up ? 8 : 1}" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="••••••••">`)}</label>`}
      ${up ? `<label class="f">আবার পাসওয়ার্ড${glow('<input name="password2" type="password" required minlength="8" autocomplete="new-password" placeholder="••••••••">')}</label>` : ''}
      <button class="btn abtn" type="submit">${up ? 'অ্যাকাউন্ট খুলুন' : mode === 'reset' ? 'রিসেট লিংক পাঠান' : 'লগইন'}</button>
      <div class="msg ${note && note.startsWith('!') ? 'err' : 'ok'}" id="am">${esc(note.replace(/^!/, ''))}</div>
      ${mode === 'in' && !DEMO ? '<p class="aline"><button type="button" class="linkbtn" id="fg">পাসওয়ার্ড ভুলে গেছেন?</button></p>' : ''}
    </form>
    <p class="aswap">${up ? 'আগেই অ্যাকাউন্ট আছে? <button type="button" class="linkbtn" data-m="in">লগইন করুন</button>' : mode === 'reset' ? '<button type="button" class="linkbtn" data-m="in">← লগইনে ফিরে যান</button>' : 'নতুন? <button type="button" class="linkbtn up" data-m="up">নতুন অ্যাকাউন্ট খুলুন</button>'}</p>
    <p class="small muted astaff">স্টাফ? <a href="../">স্টাফ পোর্টালে যান</a></p>`);
  const lg = $('.login'); lg.classList.add(up ? 'auth-up' : 'auth-in'); if (turned) lg.querySelector('.card').classList.add('turn-in');
  $$('[data-m]').forEach(b => b.onclick = () => {
    const to = b.dataset.m; const card = $('.login .card');
    if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches || (to !== 'up' && mode !== 'up')) return renderAuth(to);
    card.classList.add('turn-out'); lg.classList.add(to === 'up' ? 'go-up' : 'go-in'); setTimeout(() => renderAuth(to, '', true), 360);
  });

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
  return `${x.passage ? `<div class="card passage" style="margin:0 0 8px">${fx(x.passage)}</div>` : ''}
    <div class="qt"><b>${n}.</b> <span style="white-space:pre-line">${fx(x.question)}</span></div>
    ${x.section === 'listening' ? `<div style="margin:8px 0"><button type="button" class="btn sm" data-mkl="${esc(x.id)}">🔊 শুনুন</button></div>` : ''}
    ${o.map((op, i) => opts.render(op, i)).join('')}`;
}
function mistakesViewHtml(d) {
  const m = d.mistakes || [];
  if (MK.mode === 'list') {
    return `<div class="row" style="justify-content:space-between;margin:0 0 10px"><b style="font-size:17px">📒 ভুলের খাতা (${BN_NUM(m.length)})</b><button class="btn sm ghost" id="mkclose">‹ ফিরে যান</button></div>
      ${m.length ? m.map((x, i) => `<div class="q card">${mkQuestionHtml(x, i + 1, { render: (op, j) => `<div class="opt ${j === Number(x.correct) ? 'right' : j === x.mine ? 'wrong' : ''}"><span class="ab">${ABCD[j]}</span><span>${fx(op)}</span>${j === Number(x.correct) ? ' <b>✓</b>' : j === x.mine ? ' <b>✗</b>' : ''}</div>` })}
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
    <div class="q card">${mkQuestionHtml(x, MK.i + 1, { render: (op, j) => pick == null ? `<button type="button" class="opt" data-mkp="${j}"><span class="ab">${ABCD[j]}</span><span>${fx(op)}</span></button>` : `<div class="opt ${j === Number(x.correct) ? 'right' : j === pick ? 'wrong' : ''}"><span class="ab">${ABCD[j]}</span><span>${fx(op)}</span>${j === Number(x.correct) ? ' <b>✓</b>' : j === pick ? ' <b>✗</b>' : ''}</div>` })}
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
    <div class="calg">${(window.SK_LANG === 'en' ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ']).map(w => `<span class="wd">${w}</span>`).join('')}${cells.join('')}</div>
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

// ---- payment proof (টাকা পাঠানোর প্রমাণ: বিকাশ / নগদ / ব্যাংক)
let PF = { open: false, method: 'bkash', file: null };
const PP_ST = { pending: ['warn', '⏳ অফিস মিলিয়ে দেখছে'], approved: ['ok', '✅ জমা হয়েছে'], rejected: ['bad', '✕ মেলেনি'] };
function payProofHtml(d, f) {
  const P = d.pp; if (!P) return ''; const N = P.numbers || {}; const has = { bkash: N.bkash, nagad: N.nagad, bank: N.bank };
  const methods = Object.keys(has).filter(k => has[k]); if (!methods.length && !P.list.length) return '';
  if (!methods.includes(PF.method)) PF.method = methods[0] || 'bkash';
  const pend = P.list.filter(x => x.status === 'pending').length; const today = bdToday();
  const list = P.list.length ? `<div style="margin-top:10px">${P.list.slice(0, 6).map(x => `<div class="attr" style="align-items:flex-start;padding:8px 0"><span style="flex:1;min-width:0"><b>${tk(x.amount)}</b> · ${esc(METHOD[x.method] || x.method)} <span class="small muted">${fmtD(x.paid_on)}${x.trx_id ? ' · ' + esc(x.trx_id) : ''}</span>${x.receipt_no ? `<div class="small muted">রশিদ: ${esc(x.receipt_no)}</div>` : ''}${x.reply ? `<div class="small" style="margin-top:2px">🏢 ${esc(x.reply)}</div>` : ''}</span><span class="pill ${PP_ST[x.status][0]}" style="flex:none">${PP_ST[x.status][1]}</span></div>`).join('')}</div>` : '';
  return `<div class="card acct"><div class="row" style="justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:16px">📲 বিকাশ / নগদে টাকা দিন</b>${!PF.open && methods.length ? `<button class="btn sm" id="pfopen">টাকা পাঠিয়েছি</button>` : ''}</div>
    ${methods.length ? `<div class="small" style="margin-top:6px;line-height:1.8">${has.bkash ? `বিকাশ: <b style="font-size:15px">${esc(N.bkash)}</b> <button class="linkbtn" data-cp="${esc(N.bkash)}">কপি</button><br>` : ''}${has.nagad ? `নগদ: <b style="font-size:15px">${esc(N.nagad)}</b> <button class="linkbtn" data-cp="${esc(N.nagad)}">কপি</button><br>` : ''}${has.bank ? `ব্যাংক: <b>${esc(N.bank)}</b>` : ''}</div>
      <div class="small muted">পাঠানোর পর TrxID দিয়ে এখানে জানান। অফিস মিলিয়ে দেখে রশিদ করলে উপরের বাকি টাকা কমে যাবে। <b>শুধু এই নম্বরেই পাঠান</b> — অন্য কেউ ফোন করে অন্য নম্বর দিলে বিশ্বাস করবেন না।</div>` : ''}
    ${PF.open ? `<div style="margin-top:12px;border-top:1px dashed var(--line,#ddd);padding-top:12px">
      <div class="mchips" style="margin:0 0 8px">${methods.map(k => `<button data-pfm="${k}" class="${PF.method === k ? 'on' : ''}">${esc(METHOD[k])}</button>`).join('')}</div>
      <label class="f">কত টাকা পাঠিয়েছেন<input id="pfamt" type="number" min="1" step="1" inputmode="numeric" value="${f && f.due ? f.due : ''}"></label>
      <label class="f" style="margin-top:8px">${PF.method === 'bank' ? 'রেফারেন্স / ট্রানজেকশন নম্বর (থাকলে)' : 'TrxID (মেসেজে যে কোড আসে, যেমন 9A7B6C5D4E)'}<input id="pftrx" maxlength="30" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:1px"></label>
      <label class="f" style="margin-top:8px">${PF.method === 'bank' ? 'কার নামে / কোন অ্যাকাউন্ট থেকে' : 'কোন নম্বর থেকে পাঠিয়েছেন'}<input id="pfsnd" maxlength="20" inputmode="${PF.method === 'bank' ? 'text' : 'tel'}" placeholder="${PF.method === 'bank' ? '' : '01XXXXXXXXX'}"></label>
      <label class="f" style="margin-top:8px">কবে পাঠিয়েছেন<input id="pfdate" type="date" value="${today}" max="${today}"></label>
      <label class="f" style="margin-top:8px">স্ক্রিনশট (ঐচ্ছিক, তবে দিলে দ্রুত হয়)<input id="pffile" type="file" accept="image/*,application/pdf"></label>
      <label class="f" style="margin-top:8px">নোট (ঐচ্ছিক)<input id="pfnote" maxlength="200" placeholder="যেমন: দ্বিতীয় কিস্তি"></label>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn ghost" id="pfcancel" style="flex:1;justify-content:center">বাতিল</button><button class="btn" id="pfsend" style="flex:2;justify-content:center" ${pend >= 3 ? 'disabled' : ''}>জানিয়ে দিন</button></div><div class="msg" id="pfmsg">${pend >= 3 ? '৩টি প্রমাণ যাচাইয়ের অপেক্ষায় — অফিস দেখার পর আবার দিন।' : ''}</div></div>` : ''}
    ${list}</div>`;
}
const PP_ERR = { need_trx: 'TrxID দিন (অন্তত ৬ অক্ষর)', dup_trx: 'এই TrxID আগেই জমা দেওয়া হয়েছে', bad_date: 'তারিখটা ঠিক নেই (গত ৬০ দিনের মধ্যে হতে হবে)', bad_amount: 'টাকার পরিমাণ ঠিক নেই', busy: '৩টি প্রমাণ যাচাইয়ের অপেক্ষায় — অফিস দেখার পর আবার দিন।', bad_file: 'স্ক্রিনশট আপলোড হয়নি — আবার চেষ্টা করুন' };
function bindPayProof(d, user) {
  const re = () => renderMe(d, user);
  $$('[data-cp]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.cp); toast('নম্বর কপি হয়েছে'); } catch { toast(b.dataset.cp); } });
  const o = $('#pfopen'); if (o) o.onclick = () => { PF.open = true; re(); };
  const c = $('#pfcancel'); if (c) c.onclick = () => { PF.open = false; re(); };
  $$('[data-pfm]').forEach(b => b.onclick = () => { PF.method = b.dataset.pfm; re(); });
  const send = $('#pfsend'); if (!send) return;
  send.onclick = async () => {
    const msg = $('#pfmsg'); const err = (t) => { msg.className = 'msg err'; msg.textContent = t; send.disabled = false; };
    const amt = Math.round(Number($('#pfamt').value)); const trx = $('#pftrx').value.trim().toUpperCase().replace(/\s+/g, ''); const snd = $('#pfsnd').value.trim(); const dt = $('#pfdate').value; let file = ($('#pffile').files || [])[0];
    if (!(amt > 0)) return err('কত টাকা পাঠিয়েছেন লিখুন');
    if (PF.method !== 'bank' && trx.length < 6) return err('TrxID দিন — টাকা পাঠানোর পর মেসেজে যে কোড আসে');
    if (PF.method === 'bank' && !trx && !file) return err('রেফারেন্স নম্বর বা জমার রশিদের ছবি দিন');
    send.disabled = true; msg.className = 'msg ok'; msg.textContent = 'পাঠানো হচ্ছে…';
    try {
      let path = '';
      if (file) { if (file.type.startsWith('image/')) file = await compressImage(file); if (file.size > 5 * 1048576) return err('ফাইল ৫ MB-এর বেশি — ছোট ছবি দিন');
        const sid = await API.myStudentId(); if (!sid) throw new Error('not_linked'); const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        path = await API.uploadProof(`${sid}/${Date.now()}.${ext}`, file); }
      d.pp = await API.payproofSubmit(PF.method, amt, trx, snd, dt, path, $('#pfnote').value.trim());
      PF.open = false; toast('জানানো হয়েছে ✓ অফিস মিলিয়ে রশিদ করলে এখানে দেখাবে'); re();
    } catch (e) { const k = Object.keys(PP_ERR).find(x => errMsg(e).includes(x) || String(e.message || '').includes(x)); err(k ? PP_ERR[k] : errMsg(e)); }
  };
}

// ---- certificate requests (সার্টিফিকেটের আবেদন)
const REQ_KIND = { hours: ['⏱', 'স্টাডি-আওয়ার সার্টিফিকেট', 'কত ঘণ্টা জাপানি শিখেছেন — জাপানের স্কুলে আবেদনে লাগে'], transcript: ['📊', 'পরীক্ষার ফলাফল (ট্রান্সক্রিপ্ট)', 'ইনস্টিটিউটের পরীক্ষাগুলোর নম্বর'], idcard: ['🪪', 'আইডি কার্ড', 'নতুন বা হারানো কার্ডের বদলে'], other: ['✉️', 'অন্য কাগজ / চিঠি', 'নিচে লিখে জানান কী দরকার'] };
const REQ_ST = { pending: ['warn', '⏳ অফিস দেখছে'], ready: ['ok', '✅ তৈরি — অফিস থেকে নিন'], delivered: ['', '✓ নিয়েছেন'], rejected: ['bad', '✕ দেওয়া যায়নি'] };
let DR_KIND = 'hours';
function docReqHtml(d) {
  const L = d.docreq || []; const pend = L.filter(r => r.status === 'pending').length;
  return `<div class="card acct"><b style="font-size:16px">নতুন আবেদন</b><div class="small muted" style="margin:2px 0 10px">অফিস কাগজ তৈরি করলে এখানে জানিয়ে দেবে — তারপর অফিস থেকে নিয়ে যাবেন।</div>
    <div style="display:grid;gap:6px">${Object.entries(REQ_KIND).map(([k, v]) => `<label class="jgck" style="border:1px solid ${DR_KIND === k ? 'var(--navy)' : 'var(--line,#e5e5e5)'};border-radius:10px;padding:8px 10px;cursor:pointer"><input type="radio" name="drk" value="${k}" ${DR_KIND === k ? 'checked' : ''}><span><b>${v[0]} ${esc(v[1])}</b><br><span class="small muted">${esc(v[2])}</span></span></label>`).join('')}</div>
    <label class="f" style="margin-top:10px">কেন দরকার (ঐচ্ছিক)<input id="drp" maxlength="120" placeholder="যেমন: জাপানের স্কুলে আবেদন, ভিসা"></label>
    <label class="f" style="margin-top:8px">${DR_KIND === 'other' ? 'কী দরকার, বিস্তারিত লিখুন' : 'অতিরিক্ত কিছু বলার থাকলে (ঐচ্ছিক)'}<textarea id="drn" rows="3" maxlength="1000" placeholder="${DR_KIND === 'other' ? 'যেমন: ইংরেজিতে প্রত্যয়নপত্র, ২ কপি' : 'যেমন: ২ কপি লাগবে'}"></textarea></label>
    <button class="btn" id="drsend" style="width:100%;justify-content:center;margin-top:10px" ${pend >= 3 ? 'disabled' : ''}>আবেদন পাঠান</button>${pend >= 3 ? '<div class="small muted" style="margin-top:4px">৩টি আবেদন অপেক্ষায় আছে — আগে সেগুলো শেষ হোক।</div>' : ''}<div class="msg" id="drmsg"></div></div>
    ${L.length ? `<h2 class="lvl" style="margin-top:20px">আমার আবেদন (${BN_NUM(L.length)})</h2>${L.map(r => `<div class="card acct"><div class="row" style="justify-content:space-between;gap:8px;align-items:baseline"><b>${(REQ_KIND[r.kind] || ['', r.kind])[0]} ${esc((REQ_KIND[r.kind] || ['', r.kind])[1])}</b><span class="pill ${REQ_ST[r.status][0]}">${REQ_ST[r.status][1]}</span></div>
      <div class="small muted">আবেদন: ${localD(r.created_at)}${r.purpose ? ' · ' + esc(r.purpose) : ''}</div>${r.note ? `<div class="small" style="white-space:pre-line;margin-top:4px">${esc(r.note)}</div>` : ''}
      ${r.reply ? `<div class="qans" style="margin-top:8px"><b>🏢 অফিস:</b> <span style="white-space:pre-line">${esc(r.reply)}</span></div>` : ''}</div>`).join('')}` : ''}`;
}
function bindDocReq(d, user) {
  $$('[name=drk]').forEach(r => r.onchange = () => { DR_KIND = r.value; renderMe(d, user); });
  const b = $('#drsend'); if (!b) return;
  b.onclick = async () => { const msg = $('#drmsg'); const note = $('#drn').value.trim(); if (DR_KIND === 'other' && !note) { msg.className = 'msg err'; msg.textContent = 'কী দরকার লিখুন'; return; }
    b.disabled = true; try { d.docreq = await API.docRequest(DR_KIND, $('#drp').value.trim(), note); toast('আবেদন পাঠানো হয়েছে ✓ অফিস তৈরি করলে এখানে দেখবেন'); renderMe(d, user); }
    catch (e) { b.disabled = false; msg.className = 'msg err'; msg.textContent = /busy/.test(errMsg(e)) ? '৩টি আবেদন অপেক্ষায় আছে — আগে সেগুলো শেষ হোক।' : errMsg(e); } };
}

let ME_TAB = 'acct';
async function renderMe(d, user) {
  $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>'; scrollTo(0, 0);
  const tabs = [['acct', '💳 হিসাব'], ['att', '📅 হাজিরা'], ['doc', '📄 সার্টিফিকেট'], ['jp', '🇯🇵 জাপান'], ['bdg', '🏅 ব্যাজ']];
  let body = '';
  try {
    if (ME_TAB === 'acct') {
      const a = await API.account(); d.account = a; try { d.pp = await API.payproofs(); } catch (e) { d.pp = null; console.warn(e); }
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
          ${payProofHtml(d, f)}
          <h2 class="lvl" style="margin-top:20px">টাকা দেওয়ার তালিকা (${BN_NUM(a.payments.length)})</h2>
          ${a.payments.length ? `<div class="card" style="padding:0;overflow:hidden"><table class="hist"><tr><th>তারিখ</th><th>বাবদ</th><th class="num">টাকা</th><th></th></tr>${a.payments.map(p => `<tr><td>${fmtD(p.paid_on)}<div class="small muted">${esc(p.receipt_no)}</div></td><td>${esc(PURPOSE[p.purpose] || p.purpose)}<div class="small muted">${esc(METHOD[p.method] || p.method)}</div></td><td class="num"><b>${tk(p.amount)}</b></td><td><button class="btn sm ghost" data-rcpt="${esc(p.id)}">রশিদ</button></td></tr>`).join('')}</table></div>` : '<div class="card"><div class="empty">এখনো কোনো টাকা দেওয়ার রেকর্ড নেই।</div></div>'}`;
      }
    }
    if (ME_TAB === 'doc') { d.docreq = await API.docRequests(); body = docReqHtml(d); }
    if (ME_TAB === 'bdg') { body = badgesHtml(d); }
    if (ME_TAB === 'jp') { body = japanHtml(await API.japan()); }
    if (ME_TAB === 'att') { const rows = await API.attendance(); d.att = rows; body = attendanceHtml(rows); }
  } catch (e) { body = `<div class="card"><div class="empty">${esc(errMsg(e))}</div></div>`; }
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">👤 আমার পাতা</b><button class="btn sm ghost" id="meback">‹ ফিরে যান</button></div>
    ${tabs.length > 1 ? `<div class="authtabs" style="margin:0 0 14px">${tabs.map(([k, l]) => `<button data-me="${k}" class="${ME_TAB === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}${body}</div>`;
  $('#meback').onclick = () => renderHome(d, user);
  $$('[data-me]').forEach(b => b.onclick = () => { ME_TAB = b.dataset.me; renderMe(d, user); });
  if (ME_TAB === 'doc') bindDocReq(d, user);
  if (ME_TAB === 'acct') bindPayProof(d, user);
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


// ------------------------------------------------------------------ kana practice (কানা অনুশীলন): chart with stroke order, and quizzes
const KANA_ROWS = [   // [row name, [[hiragana, romaji, Bangla], …]] — '' keeps the 5-column chart in place
  ['あ', [['あ', 'a', 'আ'], ['い', 'i', 'ই'], ['う', 'u', 'উ'], ['え', 'e', 'এ'], ['お', 'o', 'ও']]],
  ['か', [['か', 'ka', 'কা'], ['き', 'ki', 'কি'], ['く', 'ku', 'কু'], ['け', 'ke', 'কে'], ['こ', 'ko', 'কো']]],
  ['さ', [['さ', 'sa', 'সা'], ['し', 'shi', 'শি'], ['す', 'su', 'সু'], ['せ', 'se', 'সে'], ['そ', 'so', 'সো']]],
  ['た', [['た', 'ta', 'তা'], ['ち', 'chi', 'চি'], ['つ', 'tsu', 'ৎসু'], ['て', 'te', 'তে'], ['と', 'to', 'তো']]],
  ['な', [['な', 'na', 'না'], ['に', 'ni', 'নি'], ['ぬ', 'nu', 'নু'], ['ね', 'ne', 'নে'], ['の', 'no', 'নো']]],
  ['は', [['は', 'ha', 'হা'], ['ひ', 'hi', 'হি'], ['ふ', 'fu', 'ফু'], ['へ', 'he', 'হে'], ['ほ', 'ho', 'হো']]],
  ['ま', [['ま', 'ma', 'মা'], ['み', 'mi', 'মি'], ['む', 'mu', 'মু'], ['め', 'me', 'মে'], ['も', 'mo', 'মো']]],
  ['や', [['や', 'ya', 'ইয়া'], '', ['ゆ', 'yu', 'ইউ'], '', ['よ', 'yo', 'ইয়ো']]],
  ['ら', [['ら', 'ra', 'রা'], ['り', 'ri', 'রি'], ['る', 'ru', 'রু'], ['れ', 're', 'রে'], ['ろ', 'ro', 'রো']]],
  ['わ', [['わ', 'wa', 'ওয়া'], '', '', '', ['を', 'wo', 'ও']]],
  ['ん', [['ん', 'n', 'ন্/ং'], '', '', '', '']],
  ['が', [['が', 'ga', 'গা'], ['ぎ', 'gi', 'গি'], ['ぐ', 'gu', 'গু'], ['げ', 'ge', 'গে'], ['ご', 'go', 'গো']], 'd'],
  ['ざ', [['ざ', 'za', 'যা'], ['じ', 'ji', 'জি'], ['ず', 'zu', 'যু'], ['ぜ', 'ze', 'যে'], ['ぞ', 'zo', 'যো']], 'd'],
  ['だ', [['だ', 'da', 'দা'], ['ぢ', 'ji', 'জি'], ['づ', 'zu', 'যু'], ['で', 'de', 'দে'], ['ど', 'do', 'দো']], 'd'],
  ['ば', [['ば', 'ba', 'বা'], ['び', 'bi', 'বি'], ['ぶ', 'bu', 'বু'], ['べ', 'be', 'বে'], ['ぼ', 'bo', 'বো']], 'd'],
  ['ぱ', [['ぱ', 'pa', 'পা'], ['ぴ', 'pi', 'পি'], ['ぷ', 'pu', 'পু'], ['ぺ', 'pe', 'পে'], ['ぽ', 'po', 'পো']], 'd'],
  ['きゃ', [['きゃ', 'kya', 'কিয়া'], ['きゅ', 'kyu', 'কিউ'], ['きょ', 'kyo', 'কিয়ো']], 'y'],
  ['しゃ', [['しゃ', 'sha', 'শা'], ['しゅ', 'shu', 'শু'], ['しょ', 'sho', 'শো']], 'y'],
  ['ちゃ', [['ちゃ', 'cha', 'চা'], ['ちゅ', 'chu', 'চু'], ['ちょ', 'cho', 'চো']], 'y'],
  ['にゃ', [['にゃ', 'nya', 'নিয়া'], ['にゅ', 'nyu', 'নিউ'], ['にょ', 'nyo', 'নিয়ো']], 'y'],
  ['ひゃ', [['ひゃ', 'hya', 'হিয়া'], ['ひゅ', 'hyu', 'হিউ'], ['ひょ', 'hyo', 'হিয়ো']], 'y'],
  ['みゃ', [['みゃ', 'mya', 'মিয়া'], ['みゅ', 'myu', 'মিউ'], ['みょ', 'myo', 'মিয়ো']], 'y'],
  ['りゃ', [['りゃ', 'rya', 'রিয়া'], ['りゅ', 'ryu', 'রিউ'], ['りょ', 'ryo', 'রিয়ো']], 'y'],
  ['ぎゃ', [['ぎゃ', 'gya', 'গিয়া'], ['ぎゅ', 'gyu', 'গিউ'], ['ぎょ', 'gyo', 'গিয়ো']], 'y'],
  ['じゃ', [['じゃ', 'ja', 'জা'], ['じゅ', 'ju', 'জু'], ['じょ', 'jo', 'জো']], 'y'],
  ['びゃ', [['びゃ', 'bya', 'বিয়া'], ['びゅ', 'byu', 'বিউ'], ['びょ', 'byo', 'বিয়ো']], 'y'],
  ['ぴゃ', [['ぴゃ', 'pya', 'পিয়া'], ['ぴゅ', 'pyu', 'পিউ'], ['ぴょ', 'pyo', 'পিয়ো']], 'y'],
];
const KANA_GROUPS = [['', 'মূল ৪৬টি'], ['d', 'が・ぱ (দাকুতেন)'], ['y', 'যুক্ত অক্ষর (ইয়োওন)']];
const toKata = (h) => h.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
let KN = { script: 'h', mode: 'chart', group: '', pick: null, quiz: null, rows: ['あ', 'か', 'さ'], qmode: 'see' };
function kanaAll(rowNames) { const out = []; KANA_ROWS.forEach(([r, cells]) => { if (rowNames && !rowNames.includes(r)) return; cells.forEach(c => { if (c) out.push(c); }); }); return out; }
const kChar = (h) => KN.script === 'k' ? toKata(h) : h;
const knKey = (d) => 'sakura_kana_' + ((d.student || {}).admission_no || 'preview');
function knStats(d) { try { return JSON.parse(localStorage.getItem(knKey(d)) || '{}'); } catch { return {}; } }
function knSave(d, st) { try { localStorage.setItem(knKey(d), JSON.stringify(st)); } catch { /* not kept */ } }
function strokeSvg(text, cls) {   // one or two characters (yōon), drawn with KanjiVG stroke paths
  const S = window.KANA_STROKES || {}; const chars = [...text]; const w = 109;
  let i = 0; const parts = chars.map((c, ci) => { const d = S[c]; if (!d) return ''; const small = 'ゃゅょャュョっッ'.includes(c) && chars.length > 1;
    const tf = `translate(${ci * w},${small ? 20 : 0}) ${small ? 'scale(.8)' : ''}`;
    return `<g transform="${tf}">${d.p.map((p, k) => `<path d="${p}" pathLength="1" class="st" style="--i:${i++}"/>`).join('')}${d.n.map((n, k) => `<text x="${n[0]}" y="${n[1]}" class="sn">${k + 1}</text>`).join('')}</g>`; }).join('');
  return `<svg viewBox="0 0 ${w * chars.length} ${w}" class="${cls}" aria-hidden="true"><g class="grid">${chars.map((c, ci) => `<rect x="${ci * w + 2}" y="2" width="${w - 4}" height="${w - 4}" rx="6"/><path d="M${ci * w + w / 2} 4V${w - 4}M${ci * w + 4} ${w / 2}H${ci * w + w - 4}"/>`).join('')}</g><g class="ghost">${chars.map((c, ci) => { const d = S[c]; const small = 'ゃゅょャュョっッ'.includes(c) && chars.length > 1; return d ? `<g transform="translate(${ci * w},${small ? 20 : 0}) ${small ? 'scale(.8)' : ''}">${d.p.map(p => `<path d="${p}"/>`).join('')}</g>` : ''; }).join('')}</g>${parts}</svg>`;
}
function kanaHtml(d) {
  const head = `<div class="row" style="justify-content:space-between;gap:8px;margin:0 0 10px;flex-wrap:wrap"><div class="mchips" style="margin:0"><button data-kns="h" class="${KN.script === 'h' ? 'on' : ''}">ひらがな</button><button data-kns="k" class="${KN.script === 'k' ? 'on' : ''}">カタカナ</button></div>
    <div class="mchips" style="margin:0"><button data-knm="chart" class="${KN.mode === 'chart' ? 'on' : ''}">📋 চার্ট</button><button data-knm="quiz" class="${KN.mode === 'quiz' ? 'on' : ''}">✏️ কুইজ</button><button data-knm="speak" class="${KN.mode === 'speak' ? 'on' : ''}">🎙 বলা</button></div></div>`;
  if (KN.mode === 'quiz') return head + kanaQuizHtml(d);
  if (KN.mode === 'speak') return head.replace(/<div class="mchips" style="margin:0"><button data-kns[\s\S]*?<\/div>/, '<div></div>') + speakHtml(d);
  const st = knStats(d);
  const cell = (c) => { if (!c) return '<span class="kcell e"></span>'; const ch = kChar(c[0]); const x = st[ch]; const lvl = x && x[1] >= 3 ? (x[0] / x[1] >= .8 ? 'g' : x[0] / x[1] >= .5 ? 'y' : 'r') : '';
    return `<button class="kcell ${KN.pick === c[0] ? 'on' : ''}" data-knp="${esc(c[0])}"><b>${esc(ch)}</b><span>${esc(c[1])}</span><small>${esc(c[2])}</small>${lvl ? `<i class="kdot ${lvl}"></i>` : ''}</button>`; };
  const rows = KANA_ROWS.filter(r => (r[2] || '') === KN.group);
  const cols = KN.group === 'y' ? 3 : 5;
  let detail = '';
  if (KN.pick) { const all = kanaAll(); const c = all.find(x => x[0] === KN.pick); const i = all.indexOf(c); const ch = kChar(c[0]);
    detail = `<div class="card kdet"><div class="row" style="justify-content:space-between"><button class="btn sm ghost" data-knp="${esc((all[i - 1] || all[all.length - 1])[0])}">‹</button><div style="text-align:center"><b style="font-size:20px">${esc(c[1])}</b> <span class="muted">· ${esc(c[2])}</span></div><button class="btn sm ghost" data-knp="${esc((all[i + 1] || all[0])[0])}">›</button></div>
      <div class="kbox" id="kbox">${strokeSvg(ch, 'ksvg play')}</div>
      <div class="row" style="justify-content:center;gap:8px"><button class="btn sm" id="knsay">🔊 শুনুন</button><button class="btn sm ghost" id="knre">✍️ আবার লেখা দেখুন</button></div>
      <div class="small muted" style="text-align:center;margin-top:6px">লাল সংখ্যা = কোন দাগ আগে। খাতায় একই ক্রমে ৫ বার লিখুন।</div></div>`; }
  return head + `<div class="mchips" style="margin:0 0 8px">${KANA_GROUPS.map(([g, l]) => `<button data-kng="${g}" class="${KN.group === g ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${detail}<div class="card kchart" style="--cols:${cols}">${rows.map(([, cells]) => cells.map(cell).join('')).join('')}</div>
    <div class="small muted" style="margin-top:6px">অক্ষরে চাপ দিলে উচ্চারণ আর লেখার ক্রম দেখাবে। কুইজে কেমন করছেন সেই অনুযায়ী কোণে রঙ: 🟢 ভালো · 🟡 মাঝারি · 🔴 আরও অনুশীলন দরকার।</div>
    <div class="small muted" style="margin-top:4px;font-size:11px">লেখার ক্রমের তথ্য: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> (CC BY-SA 3.0)</div>`;
}

// ---- speaking practice (বলার অনুশীলন): listen, record yourself, compare; Chrome can also say what it heard
let SP = { lv: '', i: null, rec: null, url: null, heard: null, busy: false, slow: false };
function spList(lv) { const D = (window.SAKURA_DAILY || {})[lv]; return D ? D.words.filter(w => w[3] && w[3].length <= 40) : []; }
const normJa = (t) => String(t || '').replace(/[\s、。！？!?「」・,.]/g, '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function lcsRatio(a, b) { a = normJa(a); b = normJa(b); if (!a || !b) return 0; const m = Array(b.length + 1).fill(0); for (let i = 1; i <= a.length; i++) { let prev = 0; for (let j = 1; j <= b.length; j++) { const t = m[j]; m[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(m[j], m[j - 1]); prev = t; } } return m[b.length] / Math.max(a.length, b.length); }
function speakHtml(d) {
  const lvs = (d.levels || []).filter(l => (window.SAKURA_DAILY || {})[l]); if (!lvs.length) return '<div class="card"><div class="empty">বাক্য পাওয়া যায়নি</div></div>';
  if (!lvs.includes(SP.lv)) SP.lv = lvs.includes((d.student || {}).current_level) ? d.student.current_level : lvs[0];
  const list = spList(SP.lv); if (SP.i == null || SP.i >= list.length) SP.i = (dayNo() * 7) % list.length; const w = list[SP.i];
  const canRec = !!(navigator.mediaDevices && window.MediaRecorder); const canHear = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const score = SP.heard != null ? lcsRatio(SP.heard, w[3]) : null;
  return `<div class="card kq"><div class="row" style="justify-content:space-between;gap:8px"><div class="mchips" style="margin:0">${lvs.map(l => `<button data-spl="${l}" class="${l === SP.lv ? 'on' : ''}">${l}</button>`).join('')}</div><span class="small muted">${BN_NUM(SP.i + 1)}/${BN_NUM(list.length)}</span></div>
    <div class="spsent">${esc(w[3])}</div><div class="small muted" style="text-align:center">শব্দ: ${esc(w[0])} (${esc(w[1])}) — ${esc(w[2])}</div>
    <div class="row" style="justify-content:center;gap:8px;margin:12px 0"><button class="btn" id="spsay">🔊 শুনুন</button><button class="btn ghost" id="spslow">🐢 ধীরে</button></div>
    <div class="sprec">${canRec ? `<button class="btn ${SP.rec ? 'recon' : 'gold'}" id="sprec" style="min-width:180px;justify-content:center">${SP.rec ? '⏹ থামান' : '🎙 আমার গলায় বলুন'}</button>` : '<div class="small muted">এই ব্রাউজারে রেকর্ড করা যায় না — Chrome ব্যবহার করুন।</div>'}
      ${SP.url ? `<audio controls src="${SP.url}" style="width:100%;margin-top:10px"></audio><div class="small muted" style="text-align:center">নিজের রেকর্ড আর 🔊 শুনুন মিলিয়ে দেখুন — কোথায় আলাদা লাগছে?</div>` : ''}
      ${SP.heard === '' && canHear ? '<div class="spheard no">ফোন কথাটা ধরতে পারেনি (ইন্টারনেট লাগে) — নিজের রেকর্ড শুনে মিলিয়ে নিন।</div>' : ''}${SP.heard ? `<div class="spheard ${score >= .7 ? 'ok' : 'no'}">${canHear ? `ফোন যা শুনল: <b>${esc(SP.heard || '—')}</b><br>${score >= .9 ? '🎉 চমৎকার! প্রায় হুবহু মিলেছে' : score >= .7 ? '👍 ভালো হয়েছে, আরেকটু পরিষ্কার করে বলুন' : '💪 আবার চেষ্টা করুন — ধীরে, স্পষ্ট করে'} (${BN_NUM(Math.round(score * 100))}%)` : ''}</div>` : ''}</div>
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn ghost" id="spprev" style="flex:1;justify-content:center">‹ আগেরটা</button><button class="btn ghost" id="spnext" style="flex:1;justify-content:center">পরেরটা ›</button></div>
    <div class="small muted" style="margin-top:8px">${canHear ? 'বলার সময় Chrome আপনার কথা শুনে লিখে দেখায় — মিলের হার শুধু অনুমান, শিক্ষকের মতামতই আসল।' : 'রেকর্ড শুধু আপনার ফোনেই থাকে, কোথাও পাঠানো হয় না।'}</div></div>`;
}
function bindSpeak(d, user) {
  const re = () => renderHome(d, user); const list = spList(SP.lv); const w = list[SP.i]; if (!w) return;
  $$('[data-spl]').forEach(b => b.onclick = () => { SP.lv = b.dataset.spl; SP.i = null; SP.url = null; SP.heard = null; re(); });
  const say = $('#spsay'); if (say) say.onclick = () => speakJa(w[3]);
  const slow = $('#spslow'); if (slow) slow.onclick = () => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w[3]); u.lang = 'ja-JP'; u.rate = .6; const v = speechSynthesis.getVoices().find(x => /^ja/i.test(x.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) { speakJa(w[3]); } };
  const mv = (k) => { SP.i = (SP.i + k + list.length) % list.length; SP.url = null; SP.heard = null; re(); };
  const pv = $('#spprev'); if (pv) pv.onclick = () => mv(-1); const nx = $('#spnext'); if (nx) nx.onclick = () => mv(1);
  const rec = $('#sprec'); if (rec) rec.onclick = async () => {
    if (SP.rec) { SP.rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks = []; const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); clearTimeout(SP.tm); if (SP.url) URL.revokeObjectURL(SP.url); SP.url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); SP.rec = null; if (SP.sr) { try { SP.sr.stop(); } catch { /* done */ } } if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) SP.heard = ''; setTimeout(re, 300); };
      SP.rec = mr; SP.heard = null; mr.start(); SP.tm = setTimeout(() => { if (SP.rec) SP.rec.stop(); }, 10000);
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) { const sr = new SR(); sr.lang = 'ja-JP'; sr.interimResults = false; sr.maxAlternatives = 1; sr.onresult = (e) => { SP.heard = e.results[0][0].transcript; }; sr.onerror = () => { if (SP.heard == null) SP.heard = ''; }; sr.onend = () => { if (SP.heard == null) SP.heard = ''; if (!SP.rec) re(); }; SP.sr = sr; try { sr.start(); } catch { /* already */ } }
      re();
    } catch (e) { SP.rec = null; toast('মাইক্রোফোন চালু করা যায়নি — ব্রাউজারে মাইকের অনুমতি দিন।', true); }
  };
}

function kanaQuizHtml(d) {
  const Q = KN.quiz;
  if (!Q) {
    const rowsAll = KANA_ROWS.map(r => r[0]);
    return `<div class="card kq"><b>কোন অক্ষরগুলো অনুশীলন করবেন?</b>
      <div class="krows">${KANA_ROWS.map(([r, , g]) => `<button data-knr="${esc(r)}" class="${KN.rows.includes(r) ? 'on' : ''} ${g ? 'x' : ''}">${esc(kChar(r))}</button>`).join('')}</div>
      <div class="row" style="gap:6px;margin:8px 0 12px;flex-wrap:wrap"><button class="linkbtn" data-knall="base">মূল ৪৬টি সব</button><button class="linkbtn" data-knall="all">সবগুলো</button><button class="linkbtn" data-knall="none">কোনোটাই না</button></div>
      <b>কীভাবে?</b><div class="mchips" style="margin:6px 0 12px"><button data-knq="see" class="${KN.qmode === 'see' ? 'on' : ''}">অক্ষর দেখে উচ্চারণ</button><button data-knq="hear" class="${KN.qmode === 'hear' ? 'on' : ''}">শুনে অক্ষর বাছাই</button></div>
      <button class="btn" id="kngo" style="width:100%;justify-content:center" ${kanaAll(KN.rows).length >= 4 ? '' : 'disabled'}>শুরু করুন (১০টি প্রশ্ন)</button>
      ${kanaAll(KN.rows).length < 4 ? '<div class="small muted" style="margin-top:6px">অন্তত দুটো সারি বেছে নিন</div>' : ''}</div>`;
  }
  const q = Q.list[Q.i];
  if (!q) { const weak = Object.entries(Q.wrong).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return `<div class="card kq" style="text-align:center"><div style="font-size:40px">${Q.right >= 9 ? '🎉' : Q.right >= 6 ? '👍' : '💪'}</div><b style="font-size:20px">${BN_NUM(Q.list.length)}টির মধ্যে ${BN_NUM(Q.right)}টি ঠিক</b>
      ${weak.length ? `<p class="muted" style="margin:8px 0 4px">এগুলো আবার দেখে নিন:</p><div class="row" style="justify-content:center;gap:8px">${weak.map(([c]) => `<button class="kchip" data-knpq="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : '<p class="muted">সব ঠিক! পরের সারিগুলো যোগ করে চেষ্টা করুন।</p>'}
      <div class="row" style="gap:8px;margin-top:14px"><button class="btn ghost" id="knset" style="flex:1;justify-content:center">অক্ষর বদলান</button><button class="btn" id="knagain" style="flex:1;justify-content:center">আবার খেলুন</button></div></div>`; }
  const ans = Q.ans;
  const opt = (o, i) => { const cls = ans == null ? '' : o === q.c ? 'right' : i === ans ? 'wrong' : '';
    return `<button class="opt kopt ${cls}" data-kna="${i}" ${ans == null ? '' : 'disabled'}>${Q.mode === 'see' ? `<b>${esc(o[1])}</b> <span class="muted">${esc(o[2])}</span>` : `<b class="kbig2">${esc(kChar(o[0]))}</b>`}</button>`; };
  return `<div class="card kq"><div class="row" style="justify-content:space-between"><span class="small muted">${BN_NUM(Q.i + 1)}/${BN_NUM(Q.list.length)} · ঠিক ${BN_NUM(Q.right)}</span><button class="linkbtn" id="knstop">থামুন</button></div>
    <div class="kqbig">${Q.mode === 'see' ? `<b>${esc(kChar(q.c[0]))}</b>` : '<button class="btn" id="knplay" style="font-size:18px">🔊 আবার শুনুন</button>'}</div>
    <div class="kopts">${q.opts.map(opt).join('')}</div>
    ${ans == null ? '' : `<div class="small expl" style="text-align:center">${q.opts[ans] === q.c ? '✓ ঠিক!' : '✗'} <b style="font-size:18px">${esc(kChar(q.c[0]))}</b> = ${esc(q.c[1])} (${esc(q.c[2])})</div><button class="btn" id="knnext" style="width:100%;justify-content:center;margin-top:10px">${Q.i + 1 < Q.list.length ? 'পরেরটা ›' : 'ফলাফল দেখুন'}</button>`}</div>`;
}
function kanaStart() {
  const pool = kanaAll(KN.rows); const pickN = (arr, n, not) => { const a = arr.filter(x => x !== not); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const list = []; let last = null;
  for (let k = 0; k < 10; k++) { let c; do { c = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && c === last); last = c;
    const opts = [c, ...pickN(pool, 3, c)]; for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    list.push({ c, opts }); }
  KN.quiz = { list, i: 0, right: 0, ans: null, wrong: {}, mode: KN.qmode };
}
function bindKana(d, user) {
  const re = () => renderHome(d, user);
  $$('[data-kns]').forEach(b => b.onclick = () => { KN.script = b.dataset.kns; KN.quiz = null; re(); });
  $$('[data-knm]').forEach(b => b.onclick = () => { KN.mode = b.dataset.knm; re(); });
  $$('[data-kng]').forEach(b => b.onclick = () => { KN.group = b.dataset.kng; KN.pick = null; re(); });
  $$('[data-knp]').forEach(b => b.onclick = () => { KN.pick = b.dataset.knp; re(); speakJa(kChar(KN.pick)); const k = $('.kdet'); if (k) k.scrollIntoView({ block: 'nearest' }); });
  const say = $('#knsay'); if (say) say.onclick = () => { if (!speakJa(kChar(KN.pick))) toast('জাপানি ভয়েস পাওয়া যায়নি। ফোনের Settings → Text-to-speech-এ জাপানি ভাষা যোগ করুন।', true); };
  const rp = $('#knre'); if (rp) rp.onclick = () => { const box = $('#kbox'); box.innerHTML = strokeSvg(kChar(KN.pick), 'ksvg play'); };
  $$('[data-knr]').forEach(b => b.onclick = () => { const r = b.dataset.knr; KN.rows = KN.rows.includes(r) ? KN.rows.filter(x => x !== r) : [...KN.rows, r]; re(); });
  $$('[data-knall]').forEach(b => b.onclick = () => { KN.rows = b.dataset.knall === 'none' ? [] : KANA_ROWS.filter(r => b.dataset.knall === 'all' || !r[2]).map(r => r[0]); re(); });
  $$('[data-knq]').forEach(b => b.onclick = () => { KN.qmode = b.dataset.knq; re(); });
  const go = $('#kngo'); if (go) go.onclick = () => { kanaStart(); re(); if (KN.quiz.mode === 'hear') speakJa(kChar(KN.quiz.list[0].c[0])); };
  const play = $('#knplay'); if (play) play.onclick = () => speakJa(kChar(KN.quiz.list[KN.quiz.i].c[0]));
  $$('[data-kna]').forEach(b => b.onclick = () => { const Q = KN.quiz; const q = Q.list[Q.i]; Q.ans = Number(b.dataset.kna); const ok = q.opts[Q.ans] === q.c; const ch = kChar(q.c[0]);
    const st = knStats(d); const x = st[ch] || [0, 0]; x[1]++; if (ok) { x[0]++; Q.right++; } else Q.wrong[ch] = (Q.wrong[ch] || 0) + 1; st[ch] = x; knSave(d, st);
    re(); if (Q.mode === 'see') speakJa(ch); });
  const nx = $('#knnext'); if (nx) nx.onclick = () => { const Q = KN.quiz; Q.i++; Q.ans = null; if (!Q.list[Q.i]) API.checkin('daily').then(s => { d.streak = s; }).catch(() => {}); re(); if (Q.list[Q.i] && Q.mode === 'hear') speakJa(kChar(Q.list[Q.i].c[0])); };
  const stp = $('#knstop'); if (stp) stp.onclick = () => { KN.quiz = null; re(); };
  const ag = $('#knagain'); if (ag) ag.onclick = () => { kanaStart(); re(); if (KN.quiz.mode === 'hear') speakJa(kChar(KN.quiz.list[0].c[0])); };
  const se = $('#knset'); if (se) se.onclick = () => { KN.quiz = null; re(); };
  $$('[data-knpq]').forEach(b => b.onclick = () => { const h = KN.script === 'k' ? b.dataset.knpq.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)) : b.dataset.knpq; KN.quiz = null; KN.mode = 'chart'; KN.pick = h; const row = KANA_ROWS.find(r => r[1].some(c => c && c[0] === h)); KN.group = row ? (row[2] || '') : ''; re(); });
}


// ------------------------------------------------------------------ homework (বাড়ির কাজ)
const HW_ERR = { checked: 'শিক্ষক এই কাজ দেখে ফেলেছেন — আর বদলানো যাবে না।', empty: 'অন্তত একটা ছবি দিন বা কিছু লিখুন।', too_many: 'সর্বোচ্চ ৮টি ফাইল দেওয়া যায়।', not_found: 'কাজটি এখন পাওয়া যাচ্ছে না।', bad_file: 'ফাইল ঠিকমতো ওঠেনি, আবার চেষ্টা করুন।' };
const hwErr = (e) => { const m = errMsg(e); const k = Object.keys(HW_ERR).find(x => m.includes(x)); return k ? HW_ERR[k] : m; };
const hwPending = (h) => !h.sub || h.sub.status === 'redo';
function hwState(h) {
  const t = bdToday();
  if (!h.sub) return h.due_on && h.due_on < t ? ['শেষ তারিখ পেরিয়ে গেছে', 'bad'] : ['জমা দেননি', 'warn'];
  if (h.sub.status === 'redo') return ['আবার করতে হবে', 'bad'];
  if (h.sub.status === 'checked') return [h.sub.marks != null ? `দেখা হয়েছে · ${BN_NUM(h.sub.marks)}${h.max_marks ? '/' + BN_NUM(h.max_marks) : ''}` : 'দেখা হয়েছে ✓', 'ok'];
  return ['জমা দিয়েছেন — দেখা বাকি', 'ok'];
}
function homeworkCardHtml(d) {
  const hw = d.homework || []; if (!hw.length) return '';
  const pend = hw.filter(hwPending); const fresh = hw.filter(h => h.sub && h.sub.status === 'checked' && h.sub.checked_at && Date.now() - Date.parse(h.sub.checked_at) < 3 * 86400000);
  if (!pend.length && !fresh.length) return `<button class="bdlink hwlink" id="hwgo">📓 বাড়ির কাজ: সব জমা হয়েছে ✓ ›</button>`;
  const next = pend.filter(h => h.due_on).sort((a, b) => a.due_on.localeCompare(b.due_on))[0];
  return `<div class="card hwc" id="hwgo" role="button" tabindex="0"><div class="row" style="justify-content:space-between;gap:8px"><b>📓 বাড়ির কাজ${pend.length ? ` <span class="cnt1">${BN_NUM(pend.length)}টি বাকি</span>` : ''}</b><span class="small" style="color:var(--navy);font-weight:700">খুলুন ›</span></div>
    <div class="small muted" style="margin-top:4px">${next ? `পরের শেষ তারিখ: <b>${fmtD(next.due_on)}</b> — ${esc(next.title)}` : pend.length ? esc(pend[0].title) : ''}${fresh.length ? `${pend.length ? '<br>' : ''}✓ শিক্ষক ${BN_NUM(fresh.length)}টি কাজ দেখেছেন — নম্বর আর মন্তব্য দেখুন` : ''}</div></div>`;
}
let HW_OPEN = null, HW_NEW = [];   // HW_NEW: files picked but not yet sent
async function compressImage(file) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file); const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', .82)); return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}
async function renderHomework(d, user) {
  scrollTo(0, 0);
  const hw = d.homework || []; const h = HW_OPEN && hw.find(x => x.id === HW_OPEN);
  if (!h) {
    $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">📓 বাড়ির কাজ</b><button class="btn sm ghost" id="hwback">‹ ফিরে যান</button></div>
      ${hw.length ? hw.map(x => { const [l, c] = hwState(x); return `<div class="card hwi" data-hwo="${esc(x.id)}" role="button" tabindex="0"><div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><b>${esc(x.title)}</b><div class="small muted">${x.due_on ? 'শেষ তারিখ ' + fmtD(x.due_on) : 'শেষ তারিখ নেই'}${x.author ? ' · ' + esc(x.author) : ''}</div></div><span class="pill ${c}">${esc(l)}</span></div></div>`; }).join('') : '<div class="card"><div class="empty">এখনো কোনো বাড়ির কাজ দেওয়া হয়নি।</div></div>'}</div>`;
    $('#hwback').onclick = () => renderHome(d, user);
    $$('[data-hwo]').forEach(el => el.onclick = () => { HW_OPEN = el.dataset.hwo; HW_NEW = []; renderHomework(d, user); });
    return;
  }
  const x = h.sub; const locked = x && x.status === 'checked'; const [l, c] = hwState(h);
  const fileList = (x && x.files) || [];
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 18px 'Noto Serif Bengali';color:var(--navy);min-width:0">${esc(h.title)}</b><button class="btn sm ghost" id="hwback">‹ সব কাজ</button></div>
    <div class="card acct"><div class="row" style="justify-content:space-between;gap:8px"><span class="small muted">${h.due_on ? 'জমার শেষ তারিখ: <b>' + fmtD(h.due_on) + '</b>' : ''}${h.max_marks ? ' · পূর্ণ নম্বর ' + BN_NUM(h.max_marks) : ''}</span><span class="pill ${c}">${esc(l)}</span></div>
      ${h.body ? `<div style="white-space:pre-line;line-height:1.75;margin-top:8px">${esc(h.body)}</div>` : ''}</div>
    ${x && (x.status === 'checked' || x.status === 'redo') && (x.feedback || x.marks != null) ? `<div class="card acct" style="border-left:4px solid ${x.status === 'redo' ? 'var(--red)' : 'var(--green)'}"><b>👩‍🏫 শিক্ষকের মন্তব্য</b>${x.marks != null ? `<div style="font:800 26px 'Noto Serif Bengali';color:var(--navy);margin:4px 0">${BN_NUM(x.marks)}${h.max_marks ? ' / ' + BN_NUM(h.max_marks) : ''}</div>` : ''}${x.feedback ? `<div style="white-space:pre-line;line-height:1.7">${esc(x.feedback)}</div>` : ''}${x.status === 'redo' ? '<div class="small" style="color:var(--red);margin-top:6px">কাজটি ঠিক করে আবার জমা দিন।</div>' : ''}</div>` : ''}
    ${fileList.length ? `<h2 class="lvl">জমা দেওয়া ফাইল</h2><div class="hwthumbs" id="hwold">${fileList.map(f => `<div class="hwt" data-path="${esc(f.path)}"><span class="small muted">লোড হচ্ছে…</span></div>`).join('')}</div>${x.note ? `<div class="small muted" style="margin-top:6px;white-space:pre-line">আপনার লেখা: ${esc(x.note)}</div>` : ''}<div class="small muted" style="margin-top:4px">জমা দিয়েছেন: ${fmtD(String(x.submitted_at).slice(0, 10))}</div>` : ''}
    ${locked ? '' : `<div class="card acct" style="margin-top:14px"><b>${x ? 'আবার জমা দিন (আগের জমার জায়গায় বসবে)' : 'জমা দিন'}</b>
      <div class="small muted" style="margin:4px 0 10px">খাতার পাতার স্পষ্ট ছবি তুলুন (সর্বোচ্চ ৮টি)। PDF-ও দেওয়া যায়।</div>
      <label class="btn ghost" style="width:100%;justify-content:center;cursor:pointer">📷 ছবি তুলুন / বেছে নিন<input type="file" id="hwfile" accept="image/*,application/pdf" multiple hidden></label>
      <div class="hwthumbs" id="hwnew" style="margin-top:8px">${HW_NEW.map((f, i) => `<div class="hwt">${f.type === 'application/pdf' ? `<span>📄 ${esc(f.name)}</span>` : `<img src="${URL.createObjectURL(f)}" alt="">`}<button class="hwx" data-hwx="${i}" aria-label="সরান">✕</button></div>`).join('')}</div>
      <label class="f" style="margin-top:10px">শিক্ষককে কিছু বলবেন? (ঐচ্ছিক)<textarea id="hwnote" rows="2" maxlength="2000">${esc(x && x.status !== 'checked' ? x.note || '' : '')}</textarea></label>
      <button class="btn" id="hwsend" style="width:100%;justify-content:center;margin-top:10px" ${HW_NEW.length || (x && x.files && x.files.length) ? '' : 'disabled'}>${x ? 'আবার জমা দিন' : 'জমা দিন'}</button><div class="msg" id="hwmsg"></div></div>`}
  </div>`;
  $('#hwback').onclick = () => { HW_OPEN = null; HW_NEW = []; renderHomework(d, user); };
  $$('#hwold .hwt').forEach(async el => { const path = el.dataset.path; try { const u = await API.hwUrl(path); el.innerHTML = /\.pdf$/i.test(path) ? `<a href="${esc(u)}" target="_blank" rel="noopener">📄 PDF খুলুন</a>` : `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt=""></a>`; } catch { el.innerHTML = '<span class="small red">খোলা যায়নি</span>'; } });
  const inp = $('#hwfile'); if (inp) inp.onchange = async () => { const picked = [...inp.files]; for (const f of picked) { if (HW_NEW.length >= 8) { toast('সর্বোচ্চ ৮টি ফাইল', true); break; } const g = await compressImage(f); if (g.size > 10 * 1048576) { toast(`${f.name} খুব বড় (১০ MB-এর বেশি)`, true); continue; } HW_NEW.push(g); } renderHomework(d, user); };
  $$('[data-hwx]').forEach(b => b.onclick = () => { HW_NEW.splice(Number(b.dataset.hwx), 1); renderHomework(d, user); });
  const send = $('#hwsend'); if (send) send.onclick = async () => {
    const msg = $('#hwmsg'); send.disabled = true;
    try {
      let files = (x && x.files) || [];
      if (HW_NEW.length) {
        const sid = await API.myStudentId(); if (!sid) throw new Error('not_linked'); const out = [];
        for (let i = 0; i < HW_NEW.length; i++) { const f = HW_NEW[i]; msg.className = 'msg ok'; msg.textContent = `আপলোড হচ্ছে ${BN_NUM(i + 1)}/${BN_NUM(HW_NEW.length)}…`;
          const ext = f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : f.type === 'image/heic' ? 'heic' : 'jpg';
          const path = `${h.id}/${sid}/${Date.now()}-${i + 1}.${ext}`; await API.uploadHw(path, f); out.push({ path, name: f.name, size: f.size, type: f.type }); }
        const old = files; files = out; old.forEach(o => API.hwRemove(o.path));
      }
      d.homework = await API.homeworkSubmit(h.id, ($('#hwnote') || {}).value || '', files);
      HW_NEW = []; toast('জমা হয়েছে ✓ শিক্ষক দেখে নম্বর দেবেন'); API.checkin('daily').then(s2 => { d.streak = s2; }).catch(() => {}); renderHomework(d, user);
    } catch (e) { send.disabled = false; msg.className = 'msg err'; msg.textContent = hwErr(e); }
  };
}


// ------------------------------------------------------------------ app install, inbox (🔔) and notifications
let _instEvt = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _instEvt = e; const c = $('#instc'); if (c) c.hidden = false; });
addEventListener('appinstalled', () => { _instEvt = null; const c = $('#instc'); if (c) c.remove(); toast('ইনস্টল হয়েছে — হোম স্ক্রিনে "সাকুরা ছাত্র" আইকন দেখুন'); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {   // a new version took over: load it once so the newest screens show
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!window.__swReloaded) { window.__swReloaded = true; location.reload(); } });
}
const instHidden = () => { try { return Number(localStorage.getItem('sakura_inst_hide') || 0) > Date.now(); } catch { return false; } };
function installCardHtml(d) {
  if (standalone() || instHidden() || d.preview) return '';
  return `<div class="card instc" id="instc"><span style="font-size:30px">📲</span><div style="flex:1;min-width:0"><b>ফোনে অ্যাপের মতো রাখুন</b><div class="small">এক চাপে খুলবে, পুরো স্ক্রিনে — প্রতিবার লিংক খুঁজতে হবে না</div></div>
    <button class="btn sm gold" id="instgo">ইনস্টল</button><button class="out" id="insthide" aria-label="বন্ধ" style="padding:4px 9px">✕</button></div>`;
}
function bindInstall() {
  const g = $('#instgo'); if (g) g.onclick = async () => {
    if (_instEvt) { _instEvt.prompt(); const r = await _instEvt.userChoice.catch(() => null); _instEvt = null; if (r && r.outcome === 'accepted') return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    confirmOverlay(ios ? 'iPhone (Safari):\n১. নিচের Share বোতাম (□↑) চাপুন\n২. "Add to Home Screen" চাপুন\n৩. ডানে উপরে "Add" চাপুন' : 'Android (Chrome):\n১. ডানে উপরে ⋮ চাপুন\n২. "Install app" বা "Add to Home screen" চাপুন\n৩. "Install" চাপুন\n\nএরপর হোম স্ক্রিনে "সাকুরা ছাত্র" আইকন থাকবে।', 'ঠিক আছে');
  };
  const h = $('#insthide'); if (h) h.onclick = () => { try { localStorage.setItem('sakura_inst_hide', String(Date.now() + 14 * 86400000)); } catch { /* not kept */ } $('#instc').remove(); };
}
const inboxKey = (d, k) => `sakura_${k}_` + ((d.student || {}).admission_no || 'p');
function inboxSet(d, k) { try { return new Set(JSON.parse(localStorage.getItem(inboxKey(d, k)) || '[]')); } catch { return new Set(); } }
function inboxSave(d, k, set) { try { localStorage.setItem(inboxKey(d, k), JSON.stringify([...set].slice(-400))); } catch { /* not kept */ } }
function inboxItems(d) {   // everything new for this student, newest first; "seen" is kept on this phone
  const out = []; const seen = inboxSet(d, 'inbox'); const nts = ntSeen(d); const qaNew = new Set(qaUnread(d).map(q => q.id));
  for (const n of d.notices || []) out.push({ key: 'n:' + n.id, icon: '📢', title: n.title || 'নতুন নোটিশ', sub: 'নোটিশ', at: n.created_at, go: 'notices', fresh: !nts.includes(String(n.id)) });
  for (const q of ((d.qa || {}).mine || [])) if (q.status === 'answered') out.push({ key: 'q:' + q.id, icon: '❓', title: 'আপনার প্রশ্নের উত্তর এসেছে', sub: (q.topic || q.body || '').slice(0, 60), at: q.answered_at, go: 'qa', fresh: qaNew.has(q.id) });
  for (const h of d.homework || []) {
    if (!h.sub && Date.now() - Date.parse(h.created_at) < 14 * 86400000) out.push({ key: 'h:' + h.id, icon: '📓', title: 'নতুন বাড়ির কাজ', sub: h.title + (h.due_on ? ' · জমা ' + fmtD(h.due_on) : ''), at: h.created_at, go: 'hw' });
    if (h.sub && (h.sub.status === 'checked' || h.sub.status === 'redo') && h.sub.checked_at) out.push({ key: 'hc:' + h.id + ':' + h.sub.checked_at, icon: h.sub.status === 'redo' ? '🔁' : '✅', title: h.sub.status === 'redo' ? 'বাড়ির কাজ আবার করতে হবে' : `বাড়ির কাজ দেখা হয়েছে${h.sub.marks != null ? ' — ' + BN_NUM(h.sub.marks) + (h.max_marks ? '/' + BN_NUM(h.max_marks) : '') : ''}`, sub: h.title, at: h.sub.checked_at, go: 'hw' });
  }
  for (const r of d.docreq || []) if (r.status === 'ready' || r.status === 'rejected') out.push({ key: 'd:' + r.id + ':' + r.status, icon: r.status === 'ready' ? '📄' : '✕', title: r.status === 'ready' ? 'আপনার কাগজ তৈরি — অফিস থেকে নিন' : 'আবেদনের কাগজ দেওয়া যায়নি', sub: (REQ_KIND[r.kind] || ['', r.kind])[1], at: r.done_at || r.created_at, go: 'doc' });
  for (const x of out) if (x.fresh === undefined) x.fresh = !seen.has(x.key);
  return out.sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 40);
}
const inboxCount = (d) => inboxItems(d).filter(x => x.fresh).length;
function bellHtml(d) { if (d.preview) return ''; const n = inboxCount(d); return `<button class="out bell" id="bellgo" aria-label="নতুন খবর">🔔${n ? `<span class="bn">${n > 9 ? '৯+' : BN_NUM(n)}</span>` : ''}</button>`; }
function setAppBadge(d) { try { const n = inboxCount(d); if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch { /* not supported */ } }
function renderInbox(d, user) {
  scrollTo(0, 0); const items = inboxItems(d);
  const can = 'Notification' in window; const perm = can ? Notification.permission : 'denied';
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">🔔 নতুন খবর</b><button class="btn sm ghost" id="ibback">‹ ফিরে যান</button></div>
    ${can && perm === 'default' ? `<div class="card acct"><b>ফোনে নোটিফিকেশন চালু করুন</b><div class="small muted" style="margin:2px 0 8px">সাইট খোলা থাকলে (বা পেছনে চালু থাকলে) নতুন নোটিশ, উত্তর বা নম্বর এলে ফোনে জানিয়ে দেবে।</div><button class="btn" id="nfon">🔔 চালু করুন</button></div>` : ''}
    ${can && perm === 'denied' ? '<div class="small muted" style="margin:0 0 10px">নোটিফিকেশন বন্ধ করা আছে — চালু করতে ব্রাউজারের সেটিংসে এই সাইটের Notifications অনুমতি দিন।</div>' : ''}
    <div class="card" style="padding:2px 14px">${items.length ? items.map((x, i) => `<button class="nfi ${x.fresh ? 'new' : ''}" data-ib="${i}"><span class="ic">${x.icon}</span><span style="flex:1;min-width:0"><b>${esc(x.title)}</b>${x.sub ? `<div class="small muted">${esc(x.sub)}</div>` : ''}<div class="small muted">${x.at ? localD(x.at) : ''}</div></span><span class="muted">›</span></button>`).join('') : '<div class="empty">এখনো কোনো খবর নেই</div>'}</div></div>`;
  const all = inboxSet(d, 'inbox'); items.forEach(x => all.add(x.key)); inboxSave(d, 'inbox', all); setAppBadge(d);
  $('#ibback').onclick = () => renderHome(d, user);
  $$('[data-ib]').forEach(b => b.onclick = () => { const x = items[b.dataset.ib];
    if (x.go === 'notices') { ntMarkSeen(d, [x.key.slice(2)]); renderNotices(d, user); } else if (x.go === 'qa') renderQA(d, user); else if (x.go === 'hw') { HW_OPEN = null; renderHomework(d, user); } else if (x.go === 'doc') { ME_TAB = 'doc'; renderMe(d, user); } });
  const on = $('#nfon'); if (on) on.onclick = async () => { const r = await Notification.requestPermission().catch(() => 'denied'); if (r === 'granted') { toast('নোটিফিকেশন চালু হয়েছে ✓'); notifyMarkAll(d); startNotifyPoll(d); } renderInbox(d, user); };
}
function notifyMarkAll(d) { const s = inboxSet(d, 'notified'); inboxItems(d).forEach(x => s.add(x.key)); inboxSave(d, 'notified', s); }
let _poll = null;
function startNotifyPoll(d) {   // while the site is open (also in the background), look for news every 10 minutes
  if (_poll || DEMO || d.preview || !('Notification' in window) || Notification.permission !== 'granted') return;
  _poll = setInterval(async () => {
    try {
      const [n, q, h, r] = await Promise.all([API.notices().catch(() => d.notices), API.qa().catch(() => d.qa), API.homework().catch(() => d.homework), API.docRequests().catch(() => d.docreq)]);
      Object.assign(d, { notices: n, qa: q, homework: h, docreq: r });
      const told = inboxSet(d, 'notified'); const fresh = inboxItems(d).filter(x => x.fresh && !told.has(x.key)); setAppBadge(d);
      const b = $('#bellgo'); if (b) { const k = inboxCount(d); b.innerHTML = '🔔' + (k ? `<span class="bn">${k > 9 ? '৯+' : BN_NUM(k)}</span>` : ''); }
      if (!fresh.length) return; fresh.forEach(x => told.add(x.key)); inboxSave(d, 'notified', told);
      if (!document.hidden) return;
      const reg = await navigator.serviceWorker.getRegistration('./');
      const opt = { body: fresh.slice(0, 3).map(x => x.icon + ' ' + x.title).join('\n') + (fresh.length > 3 ? `\n…আরও ${BN_NUM(fresh.length - 3)}টি` : ''), icon: '../icons/icon-192.png', badge: '../icons/icon-192.png', tag: 'sakura-news', lang: 'bn' };
      if (reg) reg.showNotification('সাকুরা — নতুন খবর', opt); else new Notification('সাকুরা — নতুন খবর', opt);
    } catch (e) { console.warn(e); }
  }, 10 * 60000);
}

// ------------------------------------------------------------------ the home menu: every tool as one tidy grid of tiles
function menuGridHtml(d) {
  const qn = qaUnread(d).length; const bd = d.preview ? null : badgeList(d);
  const T = [
    ['qago', '❓', 'শিক্ষককে প্রশ্ন', qn ? BN_NUM(qn) : '', true],
    ['ivgo', '🎤', 'ইন্টারভিউ', '', true],
    ['jggo', '🗾', 'জাপান গাইড', '', !!window.SAKURA_JPGUIDE],
    ['refgo', '🤝', 'বন্ধুকে আনুন', '', !d.preview],
    ['bdgo', '🏅', bd ? `ব্যাজ ${BN_NUM(bd.filter(b => b.done).length)}/${BN_NUM(bd.length)}` : 'ব্যাজ', '', !d.preview],
    ['accgo', '💳', 'ফি ও হিসাব', '', !d.preview],
    ['attgo', '📅', 'আমার হাজিরা', '', !d.preview],
    ['docgo', '📄', 'সার্টিফিকেট', '', !d.preview]
  ].filter(t => t[4]);
  return `<div class="mgrid">${T.map(([id, ic, l, n]) => `<button class="mtile" id="${id}"><span class="mi">${ic}</span><span class="ml">${l}</span>${n ? `<span class="bn">${n}</span>` : ''}</button>`).join('')}</div>`;
}

// ------------------------------------------------------------------ bring a friend (বন্ধুকে আনুন)
const REF_ST = { new: ['warn', 'নতুন'], contacted: ['warn', 'অফিস কথা বলেছে'], trial: ['ok', 'ট্রায়াল ক্লাস'], joined: ['ok', '🎉 ভর্তি হয়েছে'], lost: ['', 'আসেনি'] };
const refLink = (code) => new URL('../web/?ref=' + encodeURIComponent(code), location.href).href;
function refLinkHtml(d) { if (d.blocked || d.preview) return ''; return '<button class="bdlink reflink" id="refgo">🤝 বন্ধুকে আনুন — আপনার নিজের লিংক ›</button>'; }
async function renderRefer(d, user) {
  scrollTo(0, 0); $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>';
  let R; try { R = await API.referrals(); } catch (e) { R = null; console.warn(e); }
  const I = d.institute || {}; const link = R && R.code ? refLink(R.code) : '';
  const msg = `আসসালামু আলাইকুম! আমি ${I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট'}-এ জাপানি ভাষা শিখছি। তুমিও জাপানি শিখতে বা জাপানে পড়তে যেতে চাইলে এই লিংকে নাম আর নম্বর দাও, অফিস থেকে যোগাযোগ করবে:\n${link}`;
  const L = (R && R.list) || []; const joined = L.filter(x => x.status === 'joined').length;
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">🤝 বন্ধুকে আনুন</b><button class="btn sm ghost" id="refback">‹ ফিরে যান</button></div>
    ${!R || !R.code ? '<div class="card"><div class="empty">লিংক তৈরি করা যায়নি — একটু পরে আবার চেষ্টা করুন।</div></div>' : `
    <div class="card acct"><div class="small muted">যাদের জাপানি শেখার বা জাপানে যাওয়ার ইচ্ছা আছে, তাদের এই লিংক দিন। তারা নাম-নম্বর দিলে অফিস যোগাযোগ করবে, আর অফিস জানবে আপনি পাঠিয়েছেন।</div>
      ${R.reward ? `<div class="tip" style="margin-top:8px">🎁 ${esc(R.reward)}</div>` : ''}
      <div class="reflinkbox"><code id="reftxt">${esc(link)}</code></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><a class="btn wa" style="flex:1;justify-content:center" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp-এ পাঠান</a><button class="btn ghost" id="refcopy" style="flex:1;justify-content:center">📋 লিংক কপি</button>${navigator.share ? '<button class="btn ghost" id="refshare" style="flex:1;justify-content:center">↗ শেয়ার</button>' : ''}</div>
      <div class="small muted" style="margin-top:8px">আপনার কোড: <b style="letter-spacing:2px">${esc(R.code)}</b></div></div>
    <h2 class="lvl" style="margin-top:18px">আপনি যাদের এনেছেন (${BN_NUM(L.length)})${joined ? ` · ভর্তি ${BN_NUM(joined)}` : ''}</h2>
    ${L.length ? `<div class="card" style="padding:4px 14px">${L.map(x => `<div class="attr" style="padding:9px 0"><span style="flex:1"><b>${esc(x.name || '—')}</b> <span class="small muted">${fmtD(x.on)}</span></span><span class="pill ${(REF_ST[x.status] || ['', x.status])[0]}">${esc((REF_ST[x.status] || ['', x.status])[1])}</span></div>`).join('')}</div>` : '<div class="card"><div class="empty">এখনো কেউ আপনার লিংক দিয়ে আসেনি</div></div>'}`}</div>`;
  $('#refback').onclick = () => renderHome(d, user);
  const c = $('#refcopy'); if (c) c.onclick = async () => { try { await navigator.clipboard.writeText(link); toast('লিংক কপি হয়েছে'); } catch { toast(link); } };
  const sh = $('#refshare'); if (sh) sh.onclick = () => navigator.share({ title: I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট', text: msg.replace('\n' + link, ''), url: link }).catch(() => {});
}

// ------------------------------------------------------------------ my papers for Japan (আমার কাগজপত্র): scan with the phone, the office collects them
const DOC_TYPES = [
  ['photo', 'পাসপোর্ট সাইজ ছবি', 'সাদা ব্যাকগ্রাউন্ডে, সাম্প্রতিক'], ['passport', 'পাসপোর্ট', 'ছবি আর তথ্যের পাতা'], ['nid', 'NID / জন্ম নিবন্ধন', 'দুই পাশ'],
  ['ssc', 'SSC সনদ ও মার্কশিট', 'সনদ + মার্কশিট, সব পাতা'], ['hsc', 'HSC সনদ ও মার্কশিট', 'সনদ + মার্কশিট, সব পাতা'], ['degree', 'স্নাতক / ডিপ্লোমা সনদ', 'থাকলে'],
  ['jlpt', 'JLPT / NAT সনদ', 'পাস করলে'], ['study_hours', 'স্টাডি-আওয়ার সার্টিফিকেট', 'ইনস্টিটিউট দেয় — "সার্টিফিকেট" থেকে চান'], ['sponsor', 'স্পনসরের আয়ের প্রমাণ', 'ট্যাক্স / আয়ের কাগজ'],
  ['bank', 'ব্যাংক স্টেটমেন্ট / সলভেন্সি', 'স্পনসরের, সাম্প্রতিক'], ['relation', 'স্পনসরের সাথে সম্পর্কের প্রমাণ', 'জন্ম নিবন্ধন / ফ্যামিলি সার্টিফিকেট'], ['other', 'অন্যান্য', 'অফিস চাইলে']
];
const DOC_DATE = { passport: ['expires_on', 'পাসপোর্টের মেয়াদ শেষের তারিখ'], bank: ['issued_on', 'স্টেটমেন্টের তারিখ'], sponsor: ['issued_on', 'কাগজের তারিখ'] };
let DU = null;   // the paper being scanned: { type, pages: [{ blob, url }], pdf: File|null, bw: false, busy }
function docsRowHtml(d) { if (d.preview) return ''; const L = d.docs || []; const n = DOC_TYPES.filter(([k]) => { const x = L.find(y => y.doc_type === k); return x && x.status !== 'missing'; }).length; const back = L.filter(x => x.status === 'missing' && x.feedback).length;
  return `<button class="mrow" id="dcgo"><span class="ri">📂</span><span class="rt"><b>আমার কাগজপত্র</b><small>${back ? `<span style="color:var(--red)">${BN_NUM(back)}টি আবার দিতে হবে</span> · ` : ''}${BN_NUM(n)}/${BN_NUM(DOC_TYPES.length)}টি জমা — ফোনে স্ক্যান করে দিন</small></span>${back ? `<span class="bn">${BN_NUM(back)}</span>` : ''}<span class="rc">›</span></button>`; }
let _jspdf = null;
function loadJsPdf() { if (window.jspdf) return Promise.resolve(window.jspdf); if (_jspdf) return _jspdf;
  _jspdf = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; sc.onload = () => res(window.jspdf); sc.onerror = () => { _jspdf = null; rej(new Error('PDF বানানোর ফাইল লোড হয়নি — ইন্টারনেট দেখে আবার চেষ্টা করুন')); }; document.head.appendChild(sc); });
  return _jspdf; }
async function scanPage(file, bw) {   // a phone photo → upright, max 2000px JPEG; "সাদা-কালো" makes a clean scan look
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
  if (bw) { const im = g.getImageData(0, 0, c.width, c.height); const a = im.data; for (let i = 0; i < a.length; i += 4) { let y = .299 * a[i] + .587 * a[i + 1] + .114 * a[i + 2]; y = Math.max(0, Math.min(255, (y - 128) * 1.45 + 150)); a[i] = a[i + 1] = a[i + 2] = y; } g.putImageData(im, 0, 0); }
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .82)); return { blob, w: c.width, h: c.height };
}
async function renderDocs(d, user) {
  scrollTo(0, 0); if (!d.docs) { $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>'; try { d.docs = await API.docs(); } catch (e) { d.docs = []; toast(errMsg(e), true); } }
  const L = d.docs || []; const got = (k) => L.find(x => x.doc_type === k);
  const done = DOC_TYPES.filter(([k]) => got(k) && got(k).status !== 'missing').length;
  const pill = (x) => !x || (x.status === 'missing' && !x.feedback) ? '<span class="pill">জমা হয়নি</span>' : x.status === 'missing' ? '<span class="pill bad">↩ আবার দিন</span>' : x.status === 'verified' ? '<span class="pill ok">✓ যাচাই হয়েছে</span>' : '<span class="pill warn">⏳ অফিস দেখছে</span>';
  const up = DU ? `<div class="card acct dupl"><div class="row" style="justify-content:space-between"><b>📷 ${esc((DOC_TYPES.find(x => x[0] === DU.type) || [])[1])}</b><button class="out" id="ducancel" style="padding:2px 9px">✕</button></div>
      <div class="small muted" style="margin:4px 0 10px">${DU.type === 'photo' ? 'একটা পরিষ্কার ছবি দিন (সাদা ব্যাকগ্রাউন্ড)।' : 'প্রতিটা পাতার আলাদা ছবি তুলুন — সব পাতা মিলে একটা PDF হয়ে যাবে। কাগজ সমান জায়গায় রেখে, ভালো আলোতে, ওপর থেকে সোজা করে তুলুন। চাইলে আগে থেকে বানানো PDF-ও দিতে পারেন।'}</div>
      ${DU.pdf ? `<div class="attr" style="padding:6px 0">📄 <b style="flex:1;overflow-wrap:anywhere">${esc(DU.pdf.name)}</b><span class="small muted">${(DU.pdf.size / 1048576).toFixed(1)} MB</span></div>`
        : `<div class="dpages">${DU.pages.map((pg, i) => `<div class="dpg"><img src="${pg.url}" alt="পাতা ${i + 1}"><span>${BN_NUM(i + 1)}</span><button data-pgdel="${i}" aria-label="বাদ দিন">✕</button></div>`).join('')}
          ${DU.type === 'photo' && DU.pages.length ? '' : `<label class="dpg add"><input type="file" id="dupick" accept="image/*" ${DU.type === 'photo' ? '' : 'multiple'} capture="environment" hidden><b style="font-size:26px;line-height:1">📷</b><small>${DU.pages.length ? 'আরও পাতা' : 'ছবি তুলুন'}</small></label>`}</div>
          ${DU.type === 'photo' ? '' : `<div class="row" style="gap:10px;margin-top:8px;flex-wrap:wrap"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="dubw" ${DU.bw ? 'checked' : ''}> সাদা-কালো স্ক্যান (লেখা আরও পরিষ্কার)</label><span class="spacer" style="flex:1"></span><label class="linkbtn" style="cursor:pointer">📄 PDF দিন<input type="file" id="dupdf" accept="application/pdf" hidden></label></div>`}`}
      ${DOC_DATE[DU.type] ? `<label class="f" style="margin-top:10px">${DOC_DATE[DU.type][1]}<input type="date" id="dudate" value="${esc((got(DU.type) || {})[DOC_DATE[DU.type][0]] || '')}"></label>` : ''}
      <button class="btn" id="dusend" style="width:100%;justify-content:center;margin-top:12px" ${DU.busy || !(DU.pdf || DU.pages.length) ? 'disabled' : ''}>${DU.busy ? esc(DU.busy) : 'অফিসে জমা দিন'}</button><div class="msg" id="dumsg"></div></div>` : '';
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">📂 আমার কাগজপত্র</b><button class="btn sm ghost" id="dcback">‹ ফিরে যান</button></div>
    <div class="card acct"><div class="row" style="justify-content:space-between"><b>${BN_NUM(done)}/${BN_NUM(DOC_TYPES.length)}টি কাগজ জমা হয়েছে</b><span class="small muted">জাপানে আবেদনের জন্য</span></div><div class="vbar"><i style="width:${Math.round(100 * done / DOC_TYPES.length)}%"></i></div>
      <div class="small muted" style="line-height:1.6">ফোনের ক্যামেরা দিয়ে কাগজের ছবি তুলে এখানে জমা দিন — অফিস এখান থেকেই নিয়ে নেবে, যাচাই করবে। ঝাপসা বা কাটা হলে অফিস "আবার দিন" লিখে ফেরত দেবে। <b>মূল কাগজ</b> পরে অফিসে দেখাতে হতে পারে।</div></div>
    ${up}
    <div class="mlist2">${DOC_TYPES.map(([k, l, hint]) => { const x = got(k); const lock = x && x.status === 'verified';
      return `<div class="card dci ${DU && DU.type === k ? 'on' : ''}"><div class="row" style="gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${esc(l)}</b><div class="small muted">${esc(hint)}</div>
        ${x && x.feedback && x.status === 'missing' ? `<div class="qans" style="margin-top:6px"><b>🏢 অফিস:</b> ${esc(x.feedback)}</div>` : ''}
        ${x && x.student_upload_at ? `<div class="small muted" style="margin-top:4px">জমা দিয়েছেন ${localD(x.student_upload_at)}${x.expires_on && k === 'passport' ? ' · মেয়াদ ' + fmtD(x.expires_on) : ''}</div>` : ''}</div>${pill(x)}</div>
        <div class="row" style="gap:6px;margin-top:8px">${x && x.file_path ? `<button class="btn sm ghost" data-dview="${esc(x.file_path)}">👁 দেখুন</button>` : ''}${lock ? '<span class="small muted">বদলাতে চাইলে অফিসে বলুন</span>' : `<button class="btn sm ${x && x.status !== 'missing' ? 'ghost' : ''}" data-dup="${k}">${x && x.file_path ? '📷 নতুন করে দিন' : '📷 স্ক্যান করে দিন'}</button>`}</div></div>`; }).join('')}</div></div>`;
  const re = () => renderDocs(d, user);
  const clear = () => { if (DU) DU.pages.forEach(p => URL.revokeObjectURL(p.url)); DU = null; };
  $('#dcback').onclick = () => { clear(); renderHome(d, user); };
  $$('[data-dup]').forEach(b => b.onclick = () => { clear(); DU = { type: b.dataset.dup, pages: [], pdf: null, bw: false, busy: '' }; re(); const c = $('.dupl'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  $$('[data-dview]').forEach(b => b.onclick = async () => { const w = window.open('', '_blank'); try { const u = await API.docFileUrl(b.dataset.dview); if (w) w.location = u; else location.href = u; } catch (e) { if (w) w.close(); toast(errMsg(e), true); } });
  if (!DU) return;
  $('#ducancel').onclick = () => { clear(); re(); };
  const bw = $('#dubw'); if (bw) bw.onchange = () => { DU.bw = bw.checked; toast(DU.bw ? 'নতুন তোলা পাতাগুলো সাদা-কালো হবে' : 'রঙিন থাকবে'); };
  $$('[data-pgdel]').forEach(b => b.onclick = () => { const [p] = DU.pages.splice(Number(b.dataset.pgdel), 1); URL.revokeObjectURL(p.url); re(); });
  const pk = $('#dupick'); if (pk) pk.onchange = async () => { const fs = [...pk.files]; if (!fs.length) return; if (DU.pages.length + fs.length > 15) return toast('একবারে সর্বোচ্চ ১৫ পাতা', true);
    DU.busy = 'ছবি ঠিক করা হচ্ছে…'; re(); try { for (const f of fs) { const pg = await scanPage(f, DU.bw); DU.pages.push({ ...pg, url: URL.createObjectURL(pg.blob) }); } } catch (e) { toast('ছবিটা পড়া যায়নি — আবার তুলুন', true); } DU.busy = ''; re(); };
  const pf = $('#dupdf'); if (pf) pf.onchange = () => { const f = pf.files[0]; if (!f) return; if (f.size > 10 * 1048576) return toast('PDF ১০ MB-এর বেশি — ছোট করে দিন', true); DU.pages.forEach(p => URL.revokeObjectURL(p.url)); DU.pages = []; DU.pdf = f; re(); };
  $('#dusend').onclick = async () => {
    const msg = $('#dumsg'); const dt = $('#dudate'); const dk = DOC_DATE[DU.type]; const dv = dt ? dt.value : '';
    if (dk && DU.type === 'passport' && dt && !dt.value) { msg.className = 'msg err'; msg.textContent = 'পাসপোর্টের মেয়াদ শেষের তারিখ দিন'; return; }
    try {
      let blob, ext;
      if (DU.pdf) { blob = DU.pdf; ext = 'pdf'; }
      else if (DU.type === 'photo') { blob = DU.pages[0].blob; ext = 'jpg'; }
      else { DU.busy = 'PDF বানানো হচ্ছে…'; re(); const { jsPDF } = await loadJsPdf(); const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true }); const W = 210, H = 297, M = 6;
        for (let i = 0; i < DU.pages.length; i++) { const pg = DU.pages[i]; if (i) doc.addPage('a4'); const r = Math.min((W - 2 * M) / pg.w, (H - 2 * M) / pg.h); const w = pg.w * r, h = pg.h * r;
          const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(pg.blob); }); doc.addImage(data, 'JPEG', (W - w) / 2, (H - h) / 2, w, h, undefined, 'FAST'); }
        blob = doc.output('blob'); ext = 'pdf'; }
      if (blob.size > 10 * 1048576) throw new Error('ফাইল ১০ MB-এর বেশি হয়ে গেছে — পাতা কমিয়ে বা সাদা-কালো করে আবার দিন');
      DU.busy = 'জমা হচ্ছে…'; re();
      const sid = await API.myStudentId(); if (!sid) throw new Error('not_linked');
      const path = await API.uploadDoc(`${sid}/${DU.type}-${Date.now()}.${ext}`, blob);
      d.docs = await API.docUpload(DU.type, path, dk && dk[0] === 'expires_on' ? (dv || null) : null, dk && dk[0] === 'issued_on' ? (dv || null) : null);
      const name = (DOC_TYPES.find(x => x[0] === DU.type) || [])[1]; clear(); toast(`${name} জমা হয়েছে ✓ অফিস দেখে নেবে`); re();
    } catch (e) { if (DU) DU.busy = ''; re(); const m = $('#dumsg'); if (m) { m.className = 'msg err'; m.textContent = /verified/.test(errMsg(e)) ? 'অফিস এটা যাচাই করে ফেলেছে — বদলাতে চাইলে অফিসে বলুন' : errMsg(e); } }
  };
}

// ------------------------------------------------------------------ digital ID card (ডিজিটাল আইডি): the office scans its QR to open this student's file
let _qrg = null;
function loadQrGen() { if (window.qrcode) return Promise.resolve(window.qrcode); if (_qrg) return _qrg;
  _qrg = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; sc.onload = () => res(window.qrcode); sc.onerror = () => { _qrg = null; rej(new Error('QR লোড হয়নি — ইন্টারনেট দেখুন')); }; document.head.appendChild(sc); }); return _qrg; }
async function renderMyId(d, user) {
  scrollTo(0, 0); const s = d.student || {}; const I = d.institute || {};
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">🪪 আমার ডিজিটাল আইডি</b><button class="btn sm ghost" id="idback">‹ ফিরে যান</button></div>
    <div class="idc"><div class="idh"><span class="kamon">${KAMON}</span><div><b>${esc(I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট')}</b><small>さくら日本語学院 · STUDENT ID</small></div></div>
      <div class="idb"><div class="idp" id="idphoto"><span>ছবি</span></div><div class="idi"><b class="nm">${esc(s.name_bn || s.name_en || '')}</b><span>${esc(s.name_en || '')}</span>
        <div class="idno">${esc(s.admission_no || '')}</div><span>${esc((d.levels || []).join(', '))}${s.batch && BATCH[s.batch] ? ' · ' + esc(BATCH[s.batch]) : ''}</span></div></div>
      <div class="idq" id="idqr"><div class="small muted">QR তৈরি হচ্ছে…</div></div></div>
    <div class="card acct small" style="line-height:1.7;margin-top:14px">অফিসে এই QR দেখালে স্টাফরা স্ক্যান করে সাথে সাথে আপনার সব তথ্য দেখতে পারবেন। আইডি কার্ড হারিয়ে গেলেও আপনার তথ্য অফিসের সিস্টেমে সুরক্ষিত থাকে — নতুন কার্ড অফিস থেকে প্রিন্ট করে নিতে পারবেন।<br><span class="muted">QR থেকে শুধু অফিসের লগইন করা স্টাফরাই তথ্য দেখতে পারেন, অন্য কেউ না।</span></div></div>`;
  $('#idback').onclick = () => renderHome(d, user);
  try { const sid = await API.myStudentId(); await loadQrGen(); const link = new URL('../', location.href).href + '#/student/' + sid; const q = window.qrcode(0, 'M'); q.addData(link); q.make();
    const box = $('#idqr'); if (box) box.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }) + `<small>${esc(s.admission_no || '')}</small>`; }
  catch (e) { const box = $('#idqr'); if (box) box.innerHTML = `<div class="small" style="color:var(--red)">${esc(errMsg(e))}</div>`; }
  try { const ph = (d.docs || []).find(x => x.doc_type === 'photo' && x.file_path && !/\.pdf$/i.test(x.file_path)); if (ph) { const u = await API.docFileUrl(ph.file_path); const b = $('#idphoto'); if (b && u) b.innerHTML = `<img src="${esc(u)}" alt="">`; } } catch { /* no photo */ }
}

// ------------------------------------------------------------------ Japan life guide (জাপান লাইফ গাইড)
let JG_OPEN = 'before';
const jgKey = (d) => 'sakura_jg_' + ((d.student || {}).admission_no || 'p');
function jgTicks(d) { try { return JSON.parse(localStorage.getItem(jgKey(d)) || '{}'); } catch { return {}; } }
function jgLinkHtml(d) { if (d.blocked || !window.SAKURA_JPGUIDE) return ''; return '<button class="bdlink jglink" id="jggo">🗾 জাপান লাইফ গাইড — যাওয়ার আগে ও পরে যা জানা দরকার ›</button>'; }
function renderJapanGuide(d, user) {
  const G = window.SAKURA_JPGUIDE; const tk = jgTicks(d);
  const sec = (x) => { const on = JG_OPEN === x.id; const n = x.check ? x.items.filter((_, i) => tk[x.id + i]).length : 0;
    return `<div class="card jgs"><button data-jg="${x.id}" aria-expanded="${on}"><span class="ic">${x.icon}</span><b style="flex:1">${esc(x.title)}</b>${x.check ? `<span class="small muted">${BN_NUM(n)}/${BN_NUM(x.items.length)}</span>` : ''}<span class="muted">${on ? '▲' : '▼'}</span></button>
    ${on ? `<div class="jgb">${x.intro ? `<div class="small muted" style="margin-bottom:6px">${esc(x.intro)}</div>` : ''}
      ${x.check ? x.items.map((t, i) => `<label class="jgck ${tk[x.id + i] ? 'done' : ''}"><input type="checkbox" data-jgt="${x.id + i}" ${tk[x.id + i] ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')
        : x.phrases ? x.phrases.map((p, i) => `<div class="jgph"><div style="flex:1;min-width:0"><div class="ja">${esc(p[0])}</div><div class="small muted">${esc(p[1])}</div><div class="small">${esc(p[2])}</div></div><button class="btn sm ghost" data-jgsay="${i}" aria-label="শুনুন">🔊</button></div>`).join('')
        : `<ul>${x.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`}</div>` : ''}</div>`; };
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">🗾 জাপান লাইফ গাইড</b><button class="btn sm ghost" id="jgback">‹ ফিরে যান</button></div>
    <div class="card acct small" style="line-height:1.6">জাপানে যাওয়ার প্রস্তুতি আর প্রথম কয়েক মাসের দরকারি তথ্য। নিয়ম মাঝে মাঝে বদলায় — চূড়ান্ত তথ্যের জন্য আপনার জাপানের স্কুল আর সিটি অফিসের কথাই মানুন। <span class="muted">(হালনাগাদ: ${esc(G.updated)})</span></div>
    ${G.sections.map(sec).join('')}
    <div class="small muted" style="margin-top:10px">কিছু বুঝতে না পারলে "❓ শিক্ষককে প্রশ্ন" থেকে জিজ্ঞেস করুন।</div></div>`;
  $('#jgback').onclick = () => renderHome(d, user);
  $$('[data-jg]').forEach(b => b.onclick = () => { JG_OPEN = JG_OPEN === b.dataset.jg ? null : b.dataset.jg; renderJapanGuide(d, user); const el = $(`[data-jg="${b.dataset.jg}"]`); if (el && JG_OPEN) el.scrollIntoView({ block: 'nearest' }); });
  $$('[data-jgt]').forEach(c => c.onchange = () => { const t = jgTicks(d); if (c.checked) t[c.dataset.jgt] = 1; else delete t[c.dataset.jgt]; try { localStorage.setItem(jgKey(d), JSON.stringify(t)); } catch { /* not kept */ } renderJapanGuide(d, user); });
  const ph = (G.sections.find(x => x.id === 'phrases') || {}).phrases || [];
  $$('[data-jgsay]').forEach(b => b.onclick = () => speakJa(ph[b.dataset.jgsay][0].replace(/〇〇/g, 'えき')));
}

// ------------------------------------------------------------------ interview practice (ইন্টারভিউ প্র্যাকটিস)
let IV = { mode: 'list', cat: 'intro', open: {}, mock: null };
const ivData = () => window.SAKURA_INTERVIEW || { cats: {}, qs: [] };
function ivFill(t, d) { const s = d.student || {}; const nm = (s.name_en || '').trim(); return String(t).replace('{name}', nm || '名前').replace('{age}', '年齢'); }
const ivMark = (t) => esc(t).replace(/〔([^〕]*)〕/g, '<em>$1</em>');
const ivSpeakText = (t) => String(t).replace(/[〔〕]/g, '');
const ivRateKey = (d) => 'sakura_iv_' + ((d.student || {}).admission_no || 'p');
function ivRates(d) { try { return JSON.parse(localStorage.getItem(ivRateKey(d)) || '{}'); } catch { return {}; } }
function ivLinkHtml(d) { if (d.blocked) return ''; const r = ivRates(d); const n = Object.values(r).filter(v => v === 'good').length;
  return `<button class="bdlink ivlink" id="ivgo">🎤 ইন্টারভিউ প্র্যাকটিস${n ? ` · ${BN_NUM(n)}/${BN_NUM(ivData().qs.length)} আত্মবিশ্বাসী` : ' — জাপানের স্কুল/ভিসা ইন্টারভিউ'} ›</button>`; }
function ivStopRec() { const M = IV.mock; if (M && M.rec) { try { M.rec.stop(); } catch { /* stopped */ } } }
function renderInterview(d, user) {
  scrollTo(0, 0); const D = ivData(); const rates = ivRates(d);
  const head = `<div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">🎤 ইন্টারভিউ প্র্যাকটিস</b><button class="btn sm ghost" id="ivback">‹ ফিরে যান</button></div>
    <div class="authtabs" style="margin:0 0 12px"><button data-ivm="list" class="${IV.mode === 'list' ? 'on' : ''}">📋 প্রশ্ন ও উত্তর</button><button data-ivm="mock" class="${IV.mode === 'mock' ? 'on' : ''}">🎙 মক ইন্টারভিউ</button></div>`;
  let body = '';
  if (IV.mode === 'list') {
    const list = D.qs.map((q, i) => ({ ...q, i })).filter(q => q.c === IV.cat);
    body = `<div class="card acct small" style="line-height:1.6">জাপানের ভাষা স্কুল, ইমিগ্রেশন বা দূতাবাসের ইন্টারভিউতে সাধারণত এমন প্রশ্নই আসে। <b>হলুদ অংশ</b> নিজের সত্যিকারের তথ্য দিয়ে বদলে নিন — কাগজপত্রের সাথে যেন মেলে। স্কুল ভেদে প্রশ্ন আলাদা হতে পারে; চূড়ান্ত প্রস্তুতি শিক্ষকের সাথে নিন।</div>
      <div class="mchips" style="margin:10px 0">${Object.entries(D.cats).map(([k, l]) => `<button data-ivc="${k}" class="${IV.cat === k ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
      ${list.map(q => `<div class="card ivq"><div class="row" style="gap:8px;align-items:flex-start"><div style="flex:1;min-width:0"><div class="jq">${esc(q.q)}</div><div class="rd">${esc(q.r)}</div><div class="small" style="margin-top:2px">${esc(q.bn)}</div></div><button class="btn sm ghost" data-ivsay="${q.i}" aria-label="শুনুন">🔊</button></div>
        ${IV.open[q.i] ? `<div class="ivans"><div class="small muted" style="margin-bottom:2px">নমুনা উত্তর</div><div class="ja">${ivMark(ivFill(q.a, d))}</div><div class="small" style="margin-top:4px">${esc(q.abn)}</div><button class="linkbtn" data-ivsaya="${q.i}" style="margin-top:4px">🔊 উত্তরটা শুনুন</button>${q.tip ? `<div class="ivtip">💡 ${esc(q.tip)}</div>` : ''}</div>` : ''}
        <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm ${IV.open[q.i] ? 'ghost' : ''}" data-ivo="${q.i}">${IV.open[q.i] ? 'উত্তর লুকান' : 'নমুনা উত্তর দেখুন'}</button><span class="spacer" style="flex:1"></span>
          <span class="mchips" style="margin:0">${[['good', '😊 পারি'], ['mid', '😐 মোটামুটি'], ['bad', '😟 পারি না']].map(([k, l]) => `<button data-ivr="${q.i}:${k}" class="${rates[q.i] === k ? 'on' : ''}">${l}</button>`).join('')}</span></div></div>`).join('')}`;
  } else {
    const M = IV.mock; const canRec = !!(navigator.mediaDevices && window.MediaRecorder);
    if (!M) body = `<div class="card ivstage"><div class="who">🧑‍💼</div><div style="font-weight:700;margin-top:8px">${BN_NUM(8)}টি প্রশ্নের মক ইন্টারভিউ</div>
      <div class="small muted" style="margin:6px 0 14px;line-height:1.7">ইন্টারভিউয়ার জাপানিতে প্রশ্ন করবে (শব্দ চালু রাখুন)। আপনি জোরে উত্তর দিন${canRec ? ' — আপনার উত্তর রেকর্ড হবে, শেষে নিজে শুনে নমুনা উত্তরের সাথে মেলাবেন' : ''}। রেকর্ড শুধু আপনার ফোনেই থাকে।<br>সোজা হয়ে বসুন, ক্যামেরার দিকে তাকিয়ে কথা বলার অভ্যাস করুন।</div>
      <button class="btn" id="ivstart" style="min-width:200px;justify-content:center">▶ শুরু করুন</button></div>`;
    else if (M.i < M.qs.length) { const q = D.qs[M.qs[M.i]];
      body = `<div class="card ivstage"><div class="ivdots">${M.qs.map((_, k) => `<i class="${k < M.i ? 'ok' : k === M.i ? 'on' : ''}"></i>`).join('')}</div><div class="who">🧑‍💼</div>
        <div class="jq">${M.show ? esc(q.q) : '<span class="muted" style="font-size:15px">🔊 শুনুন… (লেখা দেখতে নিচে চাপুন)</span>'}</div>${M.show ? `<div class="small muted">${esc(q.bn)}</div>` : ''}
        <div class="row" style="justify-content:center;gap:8px;margin:12px 0"><button class="btn sm ghost" id="ivrep">🔁 আবার শুনুন</button>${M.show ? '' : '<button class="btn sm ghost" id="ivshow">👁 প্রশ্নটা দেখান</button>'}</div>
        ${canRec ? `<button class="btn ${M.rec ? 'recon' : 'gold'}" id="ivrec" style="min-width:200px;justify-content:center">${M.rec ? '⏹ উত্তর শেষ' : M.recs[M.i] ? '🎙 আবার উত্তর দিন' : '🎙 উত্তর দিন'}</button>${M.rec ? '<div class="small muted" style="margin-top:6px">বলুন… (সর্বোচ্চ ৬০ সেকেন্ড)</div>' : ''}` : '<div class="small muted">এই ব্রাউজারে রেকর্ড হয় না — জোরে উত্তর দিয়ে "পরের প্রশ্ন" চাপুন।</div>'}
        <div class="row" style="justify-content:center;gap:8px;margin-top:14px"><button class="btn ghost" id="ivnext" ${M.rec ? 'disabled' : ''}>${M.i === M.qs.length - 1 ? 'শেষ করুন ›' : 'পরের প্রশ্ন ›'}</button></div></div>`; }
    else body = `<div class="card acct"><b>🎉 মক ইন্টারভিউ শেষ!</b><div class="small muted" style="margin-top:4px">প্রতিটা উত্তর শুনুন, নমুনার সাথে মেলান, আর নিজেকে নম্বর দিন। যেগুলো "পারি না", সেগুলো আবার অনুশীলন করুন।</div></div>
      ${M.qs.map((qi, k) => { const q = D.qs[qi]; return `<div class="card ivq"><div class="small muted">প্রশ্ন ${BN_NUM(k + 1)}</div><div class="jq">${esc(q.q)}</div><div class="small">${esc(q.bn)}</div>
        ${M.recs[k] ? `<audio controls src="${M.recs[k]}" style="width:100%;margin-top:8px"></audio>` : '<div class="small muted" style="margin-top:6px">রেকর্ড নেই</div>'}
        <div class="ivans"><div class="ja">${ivMark(ivFill(q.a, d))}</div><div class="small" style="margin-top:4px">${esc(q.abn)}</div></div>
        <div class="mchips" style="margin:8px 0 0">${[['good', '😊 ভালো পেরেছি'], ['mid', '😐 মোটামুটি'], ['bad', '😟 পারিনি']].map(([r, l]) => `<button data-ivr="${qi}:${r}" class="${rates[qi] === r ? 'on' : ''}">${l}</button>`).join('')}</div></div>`; }).join('')}
      <div class="row" style="gap:8px"><button class="btn" id="ivagain" style="flex:1;justify-content:center">🔁 নতুন মক ইন্টারভিউ</button></div>`;
  }
  $('#app').innerHTML = `<div class="st">${head}${body}</div>`;
  const re = () => renderInterview(d, user);
  $('#ivback').onclick = () => { ivStopRec(); try { speechSynthesis.cancel(); } catch { /* none */ } renderHome(d, user); };
  $$('[data-ivm]').forEach(b => b.onclick = () => { ivStopRec(); try { speechSynthesis.cancel(); } catch { /* none */ } IV.mode = b.dataset.ivm; re(); });
  $$('[data-ivc]').forEach(b => b.onclick = () => { IV.cat = b.dataset.ivc; re(); });
  $$('[data-ivo]').forEach(b => b.onclick = () => { IV.open[b.dataset.ivo] = !IV.open[b.dataset.ivo]; re(); });
  $$('[data-ivsay]').forEach(b => b.onclick = () => speakJa(D.qs[b.dataset.ivsay].q));
  $$('[data-ivsaya]').forEach(b => b.onclick = () => speakJa(ivSpeakText(ivFill(D.qs[b.dataset.ivsaya].a, d))));
  $$('[data-ivr]').forEach(b => b.onclick = () => { const [i, r] = b.dataset.ivr.split(':'); const all = ivRates(d); all[i] = r; try { localStorage.setItem(ivRateKey(d), JSON.stringify(all)); } catch { /* not kept */ } b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  const st = $('#ivstart'); if (st) st.onclick = () => {   // the introduction first, then 7 others from different topics, weakest first
    const r = ivRates(d); const pool = D.qs.map((q, i) => ({ q, i })).filter(x => x.i !== 0).sort(() => Math.random() - .5).sort((a, b) => ({ bad: 0, mid: 1 }[r[a.i]] ?? 2) - ({ bad: 0, mid: 1 }[r[b.i]] ?? 2));
    const pick = []; const used = {}; for (const x of pool) { if (pick.length >= 7) break; if ((used[x.q.c] || 0) >= 2) continue; used[x.q.c] = (used[x.q.c] || 0) + 1; pick.push(x.i); }
    IV.mock = { qs: [0, ...pick], i: 0, recs: {}, rec: null, show: false }; re(); setTimeout(() => speakJa(D.qs[0].q), 300);
  };
  const M = IV.mock; if (!M) return;
  const rep = $('#ivrep'); if (rep) rep.onclick = () => speakJa(D.qs[M.qs[M.i]].q);
  const sh = $('#ivshow'); if (sh) sh.onclick = () => { M.show = true; re(); };
  const nx = $('#ivnext'); if (nx) nx.onclick = () => { M.i++; M.show = false; re(); if (M.i < M.qs.length) setTimeout(() => speakJa(D.qs[M.qs[M.i]].q), 300); else if (!d.preview) API.checkin('daily').then(s2 => { d.streak = s2; }).catch(() => {}); };
  const ag = $('#ivagain'); if (ag) ag.onclick = () => { Object.values(M.recs).forEach(u => URL.revokeObjectURL(u)); IV.mock = null; re(); };
  const rc = $('#ivrec'); if (rc) rc.onclick = async () => {
    if (M.rec) { M.rec.stop(); return; }
    try { speechSynthesis.cancel(); } catch { /* none */ }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks = []; const mr = new MediaRecorder(stream); const k = M.i;
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); clearTimeout(M.tm); if (M.recs[k]) URL.revokeObjectURL(M.recs[k]); M.recs[k] = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); M.rec = null; if (IV.mock === M && IV.mode === 'mock' && $('#ivstart, #ivrec, #ivagain')) re(); };
      M.rec = mr; mr.start(); M.tm = setTimeout(() => { if (M.rec) M.rec.stop(); }, 60000); re();
    } catch (e) { M.rec = null; toast('মাইক্রোফোন চালু করা যায়নি — ব্রাউজারে মাইকের অনুমতি দিন।', true); }
  };
}

// ------------------------------------------------------------------ video lessons (ভিডিও ক্লাস)
let VID_OPEN = null;
function embedOf(url) {   // a player address for YouTube, Google Drive and Vimeo links; null for anything else
  const u = String(url || ''); let m;
  if ((m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/))) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`;
  if ((m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]{20,})/))) return `https://drive.google.com/file/d/${m[1]}/preview`;
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d{6,})/))) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}
const vidDone = (d, id) => (d.videoViews || []).some(v => v.id === id && v.done);
const vidSeen = (d, id) => (d.videoViews || []).some(v => v.id === id);
function videoCardHtml(d, vids) {
  if (!vids.length) return '';
  const done = vids.filter(v => vidDone(d, v.id)).length; const nxt = vids.find(v => !vidDone(d, v.id));
  return `<button class="card vidc" id="vidgo"><div class="row" style="justify-content:space-between;gap:8px;width:100%"><b>🎬 ভিডিও ক্লাস <span class="small muted" style="font-weight:600">(${BN_NUM(vids.length)}টি)</span></b><span class="small" style="color:var(--navy);font-weight:700">দেখুন ›</span></div>
    <div class="vbar"><i style="width:${Math.round(100 * done / vids.length)}%"></i></div><div class="small muted" style="text-align:left">${BN_NUM(done)}/${BN_NUM(vids.length)}টি দেখা শেষ${nxt ? ` · পরেরটা: <b style="color:var(--ink)">${esc(nxt.title)}</b>` : ' — সব দেখা হয়েছে 🎉'}</div></button>`;
}
function renderVideos(d, user) {
  scrollTo(0, 0); const vids = (d.materials || []).filter(m => m.kind === 'video');
  const groups = []; for (const m of vids) { const k = (LEVEL_NAME[m.level] || m.level) + (m.chapter ? ' · ' + m.chapter : ''); let g = groups.find(x => x.k === k); if (!g) groups.push(g = { k, items: [] }); g.items.push(m); }
  const done = vids.filter(v => vidDone(d, v.id)).length;
  const item = (m) => `<div class="card vli ${VID_OPEN === m.id ? 'on' : ''}" data-v="${esc(m.id)}"><div class="row" style="gap:10px;align-items:flex-start"><span class="vck ${vidDone(d, m.id) ? 'ok' : vidSeen(d, m.id) ? 'half' : ''}">${vidDone(d, m.id) ? '✓' : '▶'}</span>
    <div style="flex:1;min-width:0"><b>${esc(m.title)}</b>${m.published === false ? ' <span class="hidtag">লুকানো</span>' : ''}${m.description ? `<div class="small muted">${esc(m.description)}</div>` : ''}</div></div>
    ${VID_OPEN === m.id ? `<div class="vplay" id="vp"></div><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">${vidDone(d, m.id) ? '<span class="small" style="color:var(--green,#2e7d32);font-weight:700">✓ দেখা শেষ</span>' : d.preview ? '' : '<button class="btn sm" id="vdone">✓ পুরোটা দেখেছি</button>'}<button class="btn sm ghost" id="vask">❓ প্রশ্ন আছে</button></div>` : ''}</div>`;
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">🎬 ভিডিও ক্লাস</b><button class="btn sm ghost" id="vback">‹ ফিরে যান</button></div>
    <div class="card acct"><div class="vbar"><i style="width:${Math.round(100 * done / Math.max(1, vids.length))}%"></i></div><div class="small" style="margin-top:4px">${BN_NUM(done)}/${BN_NUM(vids.length)}টি ভিডিও দেখা শেষ। পুরো ভিডিও দেখলে আজকের দিনটা পড়ার দিন হিসেবে গোনা হয় 🔥</div>
      <div class="small muted" style="margin-top:4px">ভিডিওগুলো শুধু আপনার জন্য — লিংক বা রেকর্ড করে অন্য কাউকে দেবেন না।</div></div>
    ${groups.map(g => `<h2 class="lvl">${esc(g.k)}</h2>${g.items.map(item).join('')}`).join('')}</div>`;
  $('#vback').onclick = () => { VID_OPEN = null; renderHome(d, user); };
  $$('[data-v]').forEach(c => c.onclick = (e) => { if (e.target.closest('#vp, button, a')) return; VID_OPEN = VID_OPEN === c.dataset.v ? null : c.dataset.v; renderVideos(d, user); if (VID_OPEN) { const el = $('.vli.on'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } });
  const ask = $('#vask'); if (ask) ask.onclick = () => { const m = vids.find(v => v.id === VID_OPEN); renderQA(d, user); const t = $('#qtopic'); if (t && m) t.value = ('ভিডিও: ' + m.title).slice(0, 80); const b = $('#qbody'); if (b) b.focus(); };
  const mark = async (done) => { if (d.preview) return; try { const v = await API.videoSeen(VID_OPEN, done); if (v) d.videoViews = v; if (done) { API.streak().then(s2 => { d.streak = s2; }).catch(() => {}); } } catch (e) { console.warn(e); } };
  const vd = $('#vdone'); if (vd) vd.onclick = async () => { vd.disabled = true; await mark(true); toast('দারুণ! ভিডিও দেখা শেষ ✓'); renderVideos(d, user); };
  const box = $('#vp'); if (!box) return; const m = vids.find(v => v.id === VID_OPEN); if (!m) return;
  if (!vidSeen(d, m.id)) mark(false);
  if (m.file_path) {
    box.innerHTML = '<div class="small muted" style="padding:20px;text-align:center">লোড হচ্ছে…</div>';
    API.fileUrl(m.file_path).then(u => { box.innerHTML = `<video controls autoplay playsinline controlsList="nodownload" disablePictureInPicture oncontextmenu="return false" src="${esc(u)}"></video>`;
      const v = box.querySelector('video'); let sent = false; const fin = () => { if (sent || vidDone(d, m.id)) return; sent = true; mark(true).then(() => { toast('ভিডিও দেখা শেষ ✓'); renderVideos(d, user); }); };
      v.addEventListener('ended', fin); v.addEventListener('timeupdate', () => { if (v.duration && v.currentTime / v.duration > 0.92) fin(); }); })
      .catch(e => { box.innerHTML = `<div class="msg err">${esc(errMsg(e))}</div>`; });
  } else {
    const e = embedOf(m.url);
    box.innerHTML = e ? `<div class="vfr"><iframe src="${esc(e)}" title="${esc(m.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
      : `<a class="btn" href="${esc(m.url || '#')}" target="_blank" rel="noopener" style="width:100%;justify-content:center">▶ ভিডিও খুলুন</a>`;
  }
}

// ------------------------------------------------------------------ monthly class survey (ক্লাসের মতামত)
let FB = null;
const fbHideKey = (d) => 'sakura_fb_hide_' + ((d.student || {}).admission_no || 'p') + '_' + ((d.fb || {}).period || '');
function feedbackCardHtml(d) {
  if (!d.fb || d.fb.mine || d.preview || Number(bdToday().slice(8, 10)) < 15) return '';
  try { if (localStorage.getItem(fbHideKey(d))) return ''; } catch { /* shown */ }
  return `<div class="card fbc"><div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start"><div><b>⭐ এ মাসে ক্লাস কেমন লাগছে?</b><div class="small muted">১ মিনিটের জরিপ — নাম ছাড়া দেখানো হয়, শিক্ষকরা দেখেন না</div></div><button class="out" id="fbhide" aria-label="পরে" style="padding:2px 8px">✕</button></div>
    <div class="fbstars" style="margin-top:6px">${[1, 2, 3, 4, 5].map(n => `<button data-fbq="${n}" aria-label="${n} তারা">☆</button>`).join('')}</div></div>`;
}
const FB_PACE = [['slow', '🐢 খুব ধীর'], ['ok', '👌 ঠিক আছে'], ['fast', '🐇 খুব দ্রুত']];
const FB_HW = [['less', 'আরও দরকার'], ['ok', 'ঠিক আছে'], ['more', 'বেশি হয়ে যায়']];
function renderFeedback(d, user, quick) {
  scrollTo(0, 0); const m = (d.fb || {}).mine || {};
  if (!FB) FB = { overall: quick || m.overall || 0, explain: m.explain || 0, pace: m.pace || 'ok', homework: m.homework || 'ok', liked: m.liked || '', improve: m.improve || '' };
  const row = (k, lbl) => `<div style="margin:12px 0 4px;font-weight:700">${lbl}</div><div class="fbstars">${[1, 2, 3, 4, 5].map(n => `<button data-fbs="${k}:${n}" class="${FB[k] >= n ? 'on' : ''}" aria-label="${n} তারা">${FB[k] >= n ? '★' : '☆'}</button>`).join('')}</div>`;
  const chips = (k, opts, lbl) => `<div style="margin:12px 0 4px;font-weight:700">${lbl}</div><div class="mchips" style="margin:0">${opts.map(([v, l]) => `<button data-fbc="${k}:${v}" class="${FB[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">⭐ ক্লাসের মতামত</b><button class="btn sm ghost" id="fbback">‹ ফিরে যান</button></div>
    <div class="card acct"><div class="small muted">এ মাসের (${esc(MONTH_BN(d.fb.period))}) জরিপ। আপনার নাম কাউকে দেখানো হয় না, আর শিক্ষকরা এটা দেখতে পান না — খোলাখুলি লিখুন, এতে ক্লাস আরও ভালো হবে।${(d.fb || {}).mine ? ' আগে দিয়েছেন — চাইলে বদলাতে পারেন।' : ''}</div>
      ${row('overall', 'সব মিলিয়ে ক্লাস কেমন লাগছে?')}${row('explain', 'শিক্ষক কতটা পরিষ্কার করে বোঝান?')}
      ${chips('pace', FB_PACE, 'পড়ানোর গতি')}${chips('homework', FB_HW, 'বাড়ির কাজ')}
      <label class="f" style="margin-top:12px">কী ভালো লাগছে? (ঐচ্ছিক)<textarea id="fbl" rows="2" maxlength="600">${esc(FB.liked)}</textarea></label>
      <label class="f" style="margin-top:8px">কী বদলালে আরও ভালো হয়? (ঐচ্ছিক)<textarea id="fbi" rows="2" maxlength="600">${esc(FB.improve)}</textarea></label>
      <button class="btn" id="fbsend" style="width:100%;justify-content:center;margin-top:12px">জমা দিন</button><div class="msg" id="fbmsg"></div></div></div>`;
  const keep = () => { FB.liked = $('#fbl').value; FB.improve = $('#fbi').value; };
  $('#fbback').onclick = () => { FB = null; renderHome(d, user); };
  $$('[data-fbs]').forEach(b => b.onclick = () => { keep(); const [k, n] = b.dataset.fbs.split(':'); FB[k] = Number(n); renderFeedback(d, user); });
  $$('[data-fbc]').forEach(b => b.onclick = () => { keep(); const [k, v] = b.dataset.fbc.split(':'); FB[k] = v; renderFeedback(d, user); });
  $('#fbsend').onclick = async () => { keep(); const msg = $('#fbmsg'); if (!FB.overall || !FB.explain) { msg.className = 'msg err'; msg.textContent = 'দুটো প্রশ্নেই তারা দিন'; return; }
    const b = $('#fbsend'); b.disabled = true;
    try { d.fb = await API.feedbackSave(FB); FB = null; toast('ধন্যবাদ! আপনার মতামত জমা হয়েছে 🙏'); renderHome(d, user); } catch (e) { b.disabled = false; msg.className = 'msg err'; msg.textContent = errMsg(e); } };
}
const MONTH_BN = (p) => { const n = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']; return p ? `${n[Number(p.slice(5)) - 1]} ${BN_NUM(Number(p.slice(0, 4)))}` : ''; };

// ------------------------------------------------------------------ class routine (ক্লাসের রুটিন) and online class
const isoPlus = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const WDAY_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
const wdayOf = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();
const safeLink = (u) => /^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : '';
function routineDays(R, n = 14) {   // the next n calendar days, each marked class / holiday / weekly off
  const out = []; const cd = (R.class_days || []).map(Number);
  for (let i = 0; i < n; i++) {
    const iso = isoPlus(R.today, i); const hol = (R.holidays || []).find(h => h.date === iso);
    const plan = (R.plans || []).find(p => p.date === iso);
    out.push({ iso, i, hol, plan, off: !!hol || !cd.includes(wdayOf(iso)), weekly: !hol && !cd.includes(wdayOf(iso)) });
  }
  return out;
}
const batchTime = (R) => (R.times || {})[R.batch] || BATCH[R.batch] || '';
const dayWord = (x) => x.i === 0 ? 'আজ' : x.i === 1 ? 'কাল' : `${WDAY_BN[wdayOf(x.iso)]}বার, ${BN_NUM(Number(x.iso.slice(8, 10)))} ${BN_MON[Number(x.iso.slice(5, 7)) - 1]}`;
const BN_MON = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
function routineCardHtml(d) {
  const R = d.routine; if (!R || d.blocked) return '';
  const next = routineDays(R, 45).find(x => !x.off); const link = next && safeLink((next.plan || {}).online_link || R.online_link);
  return `<div class="card rtc" id="rtgo" role="button" tabindex="0"><div class="row" style="justify-content:space-between;gap:8px"><b>🗓 ${next ? `পরের ক্লাস: <span style="color:var(--red)">${esc(dayWord(next))}</span>` : 'ক্লাসের রুটিন'}</b><span class="small" style="color:var(--navy);font-weight:700">রুটিন ›</span></div>
    ${next ? `<div class="small muted" style="margin-top:2px">${esc(batchTime(R))}${R.level ? ' · ' + esc(R.level) : ''}${next.plan && next.plan.topic ? ` · <b style="color:var(--ink)">${esc(next.plan.topic)}</b>` : ''}</div>` : '<div class="small muted">সামনের ৪৫ দিনে কোনো ক্লাসের দিন পাওয়া যায়নি</div>'}
    ${link ? `<a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener" data-join style="margin-top:8px">🎥 অনলাইন ক্লাসে যোগ দিন</a>` : ''}</div>`;
}
async function previewRoutine() {   // portal logins: the morning N5 routine, built from the same tables
  const t = bdToday(); const end = isoPlus(t, 45);
  const [{ data: st }, { data: hol }, { data: pl }, { data: ses }] = await Promise.all([sb.from('settings').select('data').eq('id', 1).maybeSingle(),
    sb.from('holidays').select('on_date,title,batch').gte('on_date', t).lte('on_date', end).in('batch', ['all', 'morning']).order('on_date'),
    sb.from('class_plans').select('class_date,topic,note,online_link').gte('class_date', t).lte('class_date', end).eq('level', 'N5').in('batch', ['all', 'morning']).order('class_date'),
    sb.from('sessions').select('class_date,topic,class_no').eq('level', 'N5').eq('batch', 'morning').lte('class_date', t).order('class_date', { ascending: false }).limit(8)]);
  const S0 = (st && st.data) || {};
  return { today: t, level: 'N5', batch: 'morning', class_days: Array.isArray(S0.class_days) && S0.class_days.length ? S0.class_days : [0, 1, 2, 3, 4, 6], online_link: S0.online_link || '', times: { morning: S0.time_morning || '', evening: S0.time_evening || '' },
    holidays: (hol || []).map(h => ({ date: h.on_date, title: h.title, batch: h.batch })), plans: (pl || []).map(p => ({ date: p.class_date, topic: p.topic, note: p.note, online_link: p.online_link })), recent: (ses || []).map(x => ({ date: x.class_date, topic: x.topic, class_no: x.class_no })) };
}
function renderRoutine(d, user) {
  scrollTo(0, 0); const R = d.routine; const days = routineDays(R, 14); const cd = (R.class_days || []).map(Number);
  const hol = (R.holidays || []); const plansAfter = (R.plans || []).filter(p => p.date > isoPlus(R.today, 13));
  const row = (x) => { const l = !x.off && safeLink((x.plan || {}).online_link || ''); return `<div class="rtd ${x.off ? 'off' : ''} ${x.i === 0 ? 'now' : ''}"><div class="rdw"><b>${esc(WDAY_BN[wdayOf(x.iso)])}</b><small>${BN_NUM(Number(x.iso.slice(8, 10)))} ${esc(BN_MON[Number(x.iso.slice(5, 7)) - 1])}</small></div>
    <div style="flex:1;min-width:0">${x.hol ? `<b style="color:var(--red)">ছুটি</b> — ${esc(x.hol.title)}` : x.weekly ? '<span class="muted">সাপ্তাহিক ছুটি</span>' : `<b>ক্লাস</b> <span class="small muted">${esc(batchTime(R))}</span>${x.plan ? `<div style="margin-top:2px">📘 ${esc(x.plan.topic)}</div>${x.plan.note ? `<div class="small muted" style="white-space:pre-line">${esc(x.plan.note)}</div>` : ''}` : ''}${l ? `<a class="btn sm" href="${esc(l)}" target="_blank" rel="noopener" style="margin-top:6px">🎥 অনলাইন ক্লাস</a>` : ''}`}</div>${x.i === 0 ? '<span class="newtag">আজ</span>' : ''}</div>`; };
  const gl = safeLink(R.online_link);
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">🗓 ক্লাসের রুটিন</b><button class="btn sm ghost" id="rtback">‹ ফিরে যান</button></div>
    <div class="card acct"><div><b>${esc(R.level || '')}${R.batch && BATCH[R.batch] ? ' · ' + esc(R.batch === 'morning' ? 'সকালের ব্যাচ' : 'বিকেলের ব্যাচ') : ''}</b>${batchTime(R) ? ` <span class="muted">· ${esc(batchTime(R))}</span>` : ''}</div>
      <div class="small" style="margin-top:4px">ক্লাস হয়: <b>${cd.sort().map(x => WDAY_BN[x]).join(', ')}বার</b> · সাপ্তাহিক ছুটি: <b>${[0, 1, 2, 3, 4, 5, 6].filter(x => !cd.includes(x)).map(x => WDAY_BN[x] + 'বার').join(', ') || 'নেই'}</b></div>
      ${gl ? `<a class="btn" href="${esc(gl)}" target="_blank" rel="noopener" style="width:100%;justify-content:center;margin-top:10px">🎥 অনলাইন ক্লাসে যোগ দিন</a><div class="small muted" style="margin-top:4px;text-align:center">ক্লাসের সময় হলে চাপ দিন। লিংকটা অন্য কাউকে দেবেন না।</div>` : ''}</div>
    <h2 class="lvl">সামনের ১৪ দিন</h2><div class="card" style="padding:4px 12px">${days.map(row).join('')}</div>
    ${plansAfter.length ? `<h2 class="lvl">পরের পরিকল্পনা</h2><div class="card" style="padding:4px 12px">${plansAfter.map(p => `<div class="rtd"><div class="rdw"><b>${esc(WDAY_BN[wdayOf(p.date)])}</b><small>${BN_NUM(Number(p.date.slice(8, 10)))} ${esc(BN_MON[Number(p.date.slice(5, 7)) - 1])}</small></div><div style="flex:1">📘 ${esc(p.topic)}</div></div>`).join('')}</div>` : ''}
    ${hol.filter(h => h.date > isoPlus(R.today, 13)).length ? `<h2 class="lvl">পরের ছুটি</h2><div class="card" style="padding:4px 12px">${hol.filter(h => h.date > isoPlus(R.today, 13)).map(h => `<div class="rtd off"><div class="rdw"><b>${esc(WDAY_BN[wdayOf(h.date)])}</b><small>${BN_NUM(Number(h.date.slice(8, 10)))} ${esc(BN_MON[Number(h.date.slice(5, 7)) - 1])}</small></div><div style="flex:1">${esc(h.title)}</div></div>`).join('')}</div>` : ''}
    <h2 class="lvl">গত ক্লাসগুলোতে যা পড়ানো হয়েছে</h2>${(R.recent || []).length ? `<div class="card" style="padding:4px 12px">${R.recent.map(x => `<div class="rtd"><div class="rdw"><b>${esc(WDAY_BN[wdayOf(x.date)])}</b><small>${BN_NUM(Number(x.date.slice(8, 10)))} ${esc(BN_MON[Number(x.date.slice(5, 7)) - 1])}</small></div><div style="flex:1">${x.class_no ? `<span class="small muted">ক্লাস ${BN_NUM(x.class_no)} · </span>` : ''}${esc(x.topic || 'বিষয় লেখা হয়নি')}</div></div>`).join('')}</div><div class="small muted" style="margin-top:6px">কোনো ক্লাস মিস করলে এই বিষয়গুলো বই থেকে পড়ে নিন, না বুঝলে "শিক্ষককে প্রশ্ন" করুন।</div>` : '<div class="card"><div class="empty">এখনো কোনো ক্লাসের বিষয় লেখা হয়নি</div></div>'}
    ${d.fb && !d.preview ? `<button class="bdlink" id="fblink" style="margin-top:16px">⭐ ক্লাসের মতামত দিন${d.fb.mine ? ' (এ মাসে দিয়েছেন ✓)' : ''} ›</button>` : ''}</div>`;
  $('#rtback').onclick = () => renderHome(d, user);
  const fl = $('#fblink'); if (fl) fl.onclick = () => { FB = null; renderFeedback(d, user); };
}

// ------------------------------------------------------------------ ask the teacher (শিক্ষককে প্রশ্ন)
const qaSeenKey = (d) => 'sakura_qa_seen_' + ((d.student || {}).admission_no || 'p');
function qaUnread(d) { const m = ((d.qa || {}).mine || []).filter(q => q.status === 'answered'); let seen = []; try { seen = JSON.parse(localStorage.getItem(qaSeenKey(d)) || '[]'); } catch { /* none */ } return m.filter(q => !seen.includes(q.id)); }
function qaLinkHtml(d) { if (d.blocked) return ''; const n = qaUnread(d).length; const open = ((d.qa || {}).mine || []).filter(q => q.status === 'open').length;
  return `<button class="bdlink qalink" id="qago">❓ শিক্ষককে প্রশ্ন করুন${n ? ` · <b style="color:var(--red)">${BN_NUM(n)}টি নতুন উত্তর</b>` : open ? ` · ${BN_NUM(open)}টির উত্তর আসছে` : ''} ›</button>`; }
async function renderQA(d, user) {
  scrollTo(0, 0); const Q = d.qa || { mine: [], shared: [] };
  const unread = qaUnread(d).map(q => q.id);
  const item = (q, mine) => `<div class="card qai ${mine && q.status === 'open' ? 'wait' : ''}">${q.topic ? `<div class="small muted">${esc(q.topic)}</div>` : ''}<div style="white-space:pre-line;font-weight:600;line-height:1.6">${esc(q.body)}</div>
    ${q.status === 'open' && mine ? '<div class="small muted" style="margin-top:6px">⏳ শিক্ষকের উত্তরের অপেক্ষায়…</div>' : `<div class="qans">${unread.includes(q.id) ? '<span class="newtag">নতুন</span> ' : ''}<b>👩‍🏫 ${esc(q.answered_by || 'শিক্ষক')}:</b> <span style="white-space:pre-line">${esc(q.answer)}</span></div>`}</div>`;
  $('#app').innerHTML = `<div class="st"><div class="row" style="justify-content:space-between;margin:0 0 12px"><b style="font:800 20px 'Noto Serif Bengali';color:var(--navy)">❓ শিক্ষককে প্রশ্ন</b><button class="btn sm ghost" id="qaback">‹ ফিরে যান</button></div>
    ${d.preview ? '' : `<div class="card acct"><b>নতুন প্রশ্ন</b><div class="small muted" style="margin:2px 0 8px">কোনো পাঠ, শব্দ, ব্যাকরণ বা মক টেস্টের প্রশ্ন বুঝতে না পারলে লিখুন। জাপানিতে বা বাংলায় — যেভাবে সুবিধা।</div>
      <label class="f">কোন পাঠ / বিষয় (ঐচ্ছিক)<input id="qtopic" maxlength="80" placeholder="যেমন: পাঠ ৫, は আর が-এর পার্থক্য"></label>
      <label class="f" style="margin-top:8px">প্রশ্ন<textarea id="qbody" rows="4" maxlength="2000" placeholder="আপনার প্রশ্ন লিখুন…"></textarea></label>
      <button class="btn" id="qsend" style="width:100%;justify-content:center;margin-top:10px">প্রশ্ন পাঠান</button><div class="msg" id="qmsg"></div></div>`}
    ${Q.mine.length ? `<h2 class="lvl">আমার প্রশ্ন (${BN_NUM(Q.mine.length)})</h2>${Q.mine.map(q => item(q, true)).join('')}` : ''}
    ${Q.shared.length ? `<h2 class="lvl">অন্যদের প্রশ্ন ও উত্তর</h2><div class="small muted" style="margin:-2px 0 8px">শিক্ষক যে প্রশ্ন-উত্তরগুলো সবার জন্য দিয়েছেন</div>${Q.shared.map(q => item(q, false)).join('')}` : ''}</div>`;
  try { const seen = new Set(JSON.parse(localStorage.getItem(qaSeenKey(d)) || '[]')); unread.forEach(i => seen.add(i)); localStorage.setItem(qaSeenKey(d), JSON.stringify([...seen].slice(-300))); } catch { /* not kept */ }
  $('#qaback').onclick = () => renderHome(d, user);
  const send = $('#qsend'); if (send) send.onclick = async () => { const body = $('#qbody').value.trim(); const msg = $('#qmsg'); if (!body) { msg.className = 'msg err'; msg.textContent = 'প্রশ্ন লিখুন'; return; }
    send.disabled = true; try { d.qa = await API.ask($('#qtopic').value.trim(), body); toast('প্রশ্ন পাঠানো হয়েছে — শিক্ষক উত্তর দিলে এখানে দেখবেন'); renderQA(d, user); }
    catch (e) { send.disabled = false; msg.className = 'msg err'; msg.textContent = /busy/.test(errMsg(e)) ? 'আজ অনেক প্রশ্ন পাঠিয়েছেন — কাল আবার পাঠান।' : errMsg(e); } };
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
    <div class="fccard ${FC.flip ? 'flip' : FC.i ? 'fcin' : ''}" id="fcflip" role="button" tabindex="0">
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

let NAVSEC = 'home';
// the menu's black pill slides from the last tab to the new one, and the page fades in out of a blur
let ST_PILL = null, ST_LASTSEC = '';
try { if (localStorage.getItem('sakura_st_bmini')) document.documentElement.classList.add('bmini'); } catch (_) {}
function stPill() {
  const nav = $('.bnav'); if (!nav) return; const pill = document.createElement('span'); pill.className = 'bpill'; pill.setAttribute('aria-hidden', 'true'); nav.prepend(pill);
  const on = $('.bnav button.on'); if (!on) { pill.style.opacity = 0; return; }
  const r = { l: on.offsetLeft, t: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight };
  const put = (x) => { pill.style.left = x.l + 'px'; pill.style.top = x.t + 'px'; pill.style.width = x.w + 'px'; pill.style.height = x.h + 'px'; };
  const moved = ST_PILL && (ST_PILL.l !== r.l || ST_PILL.t !== r.t) && ST_PILL.w;
  if (moved && !matchMedia('(prefers-reduced-motion: reduce)').matches) { put(ST_PILL); pill.getBoundingClientRect(); pill.classList.add('go'); on.classList.add('wait'); setTimeout(() => on.classList.remove('wait'), 280); }
  put(r); ST_PILL = r;
  const fix = () => { if (!on.isConnected) return; const x = { l: on.offsetLeft, t: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight }; put(x); ST_PILL = x; };
  requestAnimationFrame(() => requestAnimationFrame(fix)); setTimeout(fix, 400);
  if (window.ResizeObserver) new ResizeObserver(fix).observe(nav);
}
// ---- home: a greeting, today's three jobs in one place, and the four things students open most

// ---- the student's ID card at the top of home, like a card in a wallet app: front = card, tap = QR on the back
let WQR = null;   // QR svg, made once per visit
function walletHtml(d) {
  if (d.blocked) return ''; const s = d.student || {}; const I = d.institute || {};
  return `<div class="wcard" id="wcard" role="button" tabindex="0" aria-label="আমার আইডি কার্ড — উল্টাতে চাপুন"><div class="wci">
    <div class="wf wfront">
      <div class="wtop"><span class="kamon">${KAMON}</span><div class="wbrand"><b>${esc(I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট')}</b><small>さくら日本語学院 · STUDENT ID</small></div></div>
      <div class="wmid"><div class="wph" id="wph"><span>${esc(((s.name_bn || s.name_en || '?').trim()[0] || '?').toUpperCase())}</span></div>
        <div class="wtx"><b>${esc(s.name_bn || s.name_en || '')}</b>${s.name_en && s.name_bn ? `<small>${esc(s.name_en)}</small>` : ''}<div class="wtags">${(d.levels || []).map(l => `<i>${esc(l)}</i>`).join('')}${s.batch && BATCH[s.batch] ? `<i class="b">${esc(BATCH[s.batch])}</i>` : ''}</div></div></div>
      <div class="wbot"><span class="wno">${esc(s.admission_no || '')}</span><span class="whint">QR দেখতে চাপুন ↻</span></div>
    </div>
    <div class="wf wback"><div class="wstrip"></div><div class="wqr" id="wqr">${WQR || '<small>QR তৈরি হচ্ছে…</small>'}</div><div class="wbk"><b>${esc(s.admission_no || '')}</b><small>অফিসে এই QR দেখান — স্ক্যান করলে আপনার তথ্য খুলবে</small><span class="whint">আবার উল্টাতে চাপুন ↻</span></div></div>
  </div></div>`;
}
async function bindWallet(d) {
  const c = $('#wcard'); if (!c) return;
  const flip = () => { c.classList.toggle('flip'); if (c.classList.contains('flip')) makeWalletQr(d); };
  c.onclick = flip; c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  try { const ph = (d.docs || []).find(x => x.doc_type === 'photo' && x.file_path && !/\.pdf$/i.test(x.file_path)); if (ph) { const u = await API.docFileUrl(ph.file_path); const b = $('#wph'); if (b && u) b.innerHTML = `<img src="${esc(u)}" alt="">`; } } catch { /* no photo yet */ }
}
async function makeWalletQr(d) {
  if (WQR) return; const box = $('#wqr');
  try { const sid = await API.myStudentId(); if (!sid) throw new Error('not_linked'); await loadQrGen(); const q = window.qrcode(0, 'M'); q.addData(new URL('../', location.href).href + '#/student/' + sid); q.make(); WQR = q.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); if (box) box.innerHTML = WQR; }
  catch (e) { if (box) box.innerHTML = `<small>${d.preview ? 'প্রিভিউতে QR নেই — ছাত্রের অ্যাকাউন্টে দেখাবে' : esc(errMsg(e))}</small>`; }
}
// home on a phone: everything fits one screen; the cards below the quick buttons sit side by side and are swiped
let HS_IDX = 0;
function bindSlider() {
  const sl = $('#hsl'); if (!sl) return; const dots = $$('#hdots button'); const n = sl.children.length;
  if (HS_IDX >= n) HS_IDX = 0; sl.scrollLeft = HS_IDX * sl.clientWidth;
  let t; sl.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { HS_IDX = Math.round(sl.scrollLeft / Math.max(1, sl.clientWidth)); dots.forEach((b, i) => b.classList.toggle('on', i === HS_IDX)); }, 60); }, { passive: true });
  dots.forEach(b => b.onclick = () => { HS_IDX = Number(b.dataset.hs); sl.scrollTo({ left: HS_IDX * sl.clientWidth, behavior: 'smooth' }); });
}
function greetHtml(d) {
  const s = d.student || {}; const h = new Date(Date.now() + 6 * 3600000).getUTCHours();
  const hi = h < 5 ? 'শুভ রাত্রি' : h < 12 ? 'সুপ্রভাত' : h < 16 ? 'শুভ দুপুর' : h < 18 ? 'শুভ বিকেল' : h < 21 ? 'শুভ সন্ধ্যা' : 'শুভ রাত্রি';
  const first = String(s.name_bn || s.name_en || '').trim().split(/\s+/).filter(w => !/^(মোঃ|মো:|মোহাম্মদ|md\.?|mohammad|mohammed)$/i.test(w))[0] || '';
  const t = new Date(Date.now() + 6 * 3600000); const wd = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'][t.getUTCDay()];
  return `<div class="greet"><h1>${hi}${first ? ', ' + esc(first) : ''}</h1><p>${wd}, ${BN_NUM(t.getUTCDate())} ${BN_MONTH[t.getUTCMonth()]}</p></div>`;
}
function todayHtml(d) {
  if (d.blocked) return ''; const st = d.streak || {}; const studied = !!st.today;
  const pend = (d.homework || []).filter(hwPending); const hwState = !(d.homework || []).length ? null : pend.length === 0;
  const R = d.routine; const next = R ? routineDays(R, 45).find(x => !x.off) : null; const classToday = next && next.i === 0;
  const jobs = [
    { id: 'tdaily', done: studied, t: studied ? 'আজকের পড়া শেষ' : 'আজকের পড়া', sub: studied ? 'দারুণ! কাল আবার নতুন পড়া আসবে' : '৫টি শব্দ, ১টি কাঞ্জি, ১টি ব্যাকরণ — ৫ মিনিট' },
    hwState === null ? null : { id: 'hwgo', done: hwState, t: hwState ? 'বাড়ির কাজ সব জমা' : `বাড়ির কাজ ${BN_NUM(pend.length)}টি বাকি`, sub: hwState ? 'নতুন কাজ এলে এখানে দেখাবে' : (pend.find(h => h.due_on) ? 'শেষ তারিখ ' + fmtD(pend.filter(h => h.due_on).sort((a, b) => a.due_on.localeCompare(b.due_on))[0].due_on) : esc(pend[0].title)) },
    next ? { id: 'rtgo', done: null, t: classToday ? 'আজ ক্লাস আছে' : 'পরের ক্লাস ' + dayWord(next), sub: [batchTime(R), next.plan && next.plan.topic].filter(Boolean).join(' · ') || 'রুটিন দেখুন', link: safeLink((next.plan || {}).online_link || R.online_link) } : null
  ].filter(Boolean);
  const todo = jobs.filter(j => j.done !== null); const n = todo.filter(j => j.done).length; const pct = todo.length ? n / todo.length : 0;
  const C = 2 * Math.PI * 21;
  return `<section class="today" aria-label="আজকের কাজ"><div class="thead"><div><b>আজকের কাজ</b><span>${todo.length && n === todo.length ? 'সব শেষ — চমৎকার!' : `${BN_NUM(n)}/${BN_NUM(todo.length)}টি শেষ`}</span></div>
      <div class="ring" role="img" aria-label="${BN_NUM(n)}/${BN_NUM(todo.length)}টি শেষ"><svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="21" class="rb"/>${pct > 0 ? `<circle cx="25" cy="25" r="21" class="rf" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}"/>` : ''}</svg><em>${st.streak ? '🔥' + BN_NUM(st.streak) : BN_NUM(n)}</em></div></div>
    ${jobs.map(j => `<button class="tjob ${j.done ? 'ok' : ''}" id="${j.id}"><span class="tck">${j.done === null ? '🗓' : j.done ? '✓' : ''}</span><span class="tt"><b>${j.t}</b><small>${j.sub}</small></span>${j.link ? `<a class="tjoin" href="${esc(j.link)}" target="_blank" rel="noopener" data-join>যোগ দিন</a>` : '<span class="rc">›</span>'}</button>`).join('')}
    ${st.streak ? `<p class="tfoot">টানা ${BN_NUM(st.streak)} দিন পড়ছেন${st.best > st.streak ? ` · সেরা ${BN_NUM(st.best)} দিন` : ''}</p>` : studied ? '' : '<p class="tfoot">প্রতিদিন আজকের পড়া শেষ করলে টানা পড়ার 🔥 গোনা শুরু হবে</p>'}</section>`;
}
function quickHtml(d, vids) {
  if (d.blocked) return ''; const qn = qaUnread(d).length;
  const Q = [['qmock', '📝', 'মক টেস্ট'], ['qfc', '🃏', 'ফ্ল্যাশকার্ড'], vids.length ? ['vidgo', '🎬', 'ভিডিও ক্লাস'] : ['qmat', '📚', 'উপকরণ'], ['qago', '❓', 'প্রশ্ন করুন', qn]];
  return `<nav class="quick" aria-label="দ্রুত যান">${Q.map(([id, ic, l, n]) => `<button id="${id}"><span class="qi">${ic}${n ? `<i>${BN_NUM(n)}</i>` : ''}</span><span>${l}</span></button>`).join('')}</nav>`;
}
// ---- app icons: each emoji in menus, buttons and headings becomes a glossy coloured tile with a white line icon
const GLYPH = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3M8 7h8M8 11h6"/>',
  test: '<rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5h6v3H9zM8.5 13l2.2 2.2 4.8-5"/>',
  torii: '<path d="M3 5.5c3 1 15 1 18 0M4.5 9h15M7 5.8V21M17 5.8V21M10 9v3M14 9v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  cards: '<rect x="3" y="7" width="12" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/><path d="M7 12h4M7 15.5h3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.5M12 17h.01"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2"/>',
  doc: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h5"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5L6 3h4l2 5 2-5h4l-2.5 7.5M12 12.8l.9 1.6 1.8.3-1.3 1.2.3 1.8-1.7-.9-1.7.9.3-1.8-1.3-1.2 1.8-.3z"/>',
  hand: '<path d="M3 12l4-4 3 2 3-3 4 4M7 8l-4 4 6 6a1.5 1.5 0 0 0 2 0l.6-.6M17 11l4 1-6 6M13.5 15.5l-2-2M15.5 13.5l-2-2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10.5h18"/>',
  plane: '<path d="M2.5 13.5l19-8-5 15-4.5-5.5z"/><path d="M12 15l-2.5 5-1-6.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  fire: '<path d="M12 21c-3.9 0-7-2.8-7-6.5 0-3 2-5 3.5-6.5.3 1.6 1.2 2.8 2.5 3.3C11 7.5 12.5 5 14.5 3c.4 3 4.5 5.5 4.5 11.5 0 3.7-3.1 6.5-7 6.5z"/><path d="M12 21c-1.7 0-3-1.2-3-2.8 0-1.6 1.5-2.7 3-4.2 1.5 1.5 3 2.6 3 4.2 0 1.6-1.3 2.8-3 2.8z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8 21h8M9.5 17.5h5"/>',
  bulb: '<path d="M9 17.5h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v5"/>',
  flower: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-2.5-2-2.5-6 0-7 2.5 1 2.5 5 0 7zM14 12c2-2.5 6-2.5 7 0-1 2.5-5 2.5-7 0zM12 14c2.5 2 2.5 6 0 7-2.5-1-2.5-5 0-7zM10 12c-2 2.5-6 2.5-7 0 1-2.5 5-2.5 7 0z"/>',
  mega: '<path d="M3 10v4a1 1 0 0 0 1 1h3l7 4.5V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
  hour: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'
};
const TONE = { blue: ['#0A84FF', '#007AFF'], pink: ['#FF375F', '#FF2D55'], green: ['#30D158', '#34C759'], orange: ['#FF9F0A', '#FF9500'], yellow: ['#FFD60A', '#FFCC00'], teal: ['#64D2FF', '#32ADE6'], violet: ['#BF5AF2', '#AF52DE'], red: ['#FF453A', '#FF3B30'], navy: ['#5E5CE6', '#5856D6'], gray: ['#98989D', '#8E8E93'] };   // iPhone system colours
const EMO3D = { '🏠': ['home', 'red'], '📚': ['book', 'green'], '📝': ['test', 'blue'], '🗾': ['torii', 'red'], '👤': ['user', 'teal'], '🃏': ['cards', 'pink'], '❓': ['help', 'orange'], '🔔': ['bell', 'yellow'], '🪪': ['id', 'teal'], '💳': ['card', 'violet'], '📅': ['cal', 'blue'], '📄': ['doc', 'navy'], '🏅': ['medal', 'yellow'], '🤝': ['hand', 'green'], '🌐': ['globe', 'blue'], '🌙': ['moon', 'violet'], '🎬': ['play', 'pink'], '🎤': ['mic', 'violet'], '📂': ['folder', 'yellow'], '📁': ['folder', 'yellow'], '🇯🇵': ['plane', 'blue'], '⚙️': ['gear', 'gray'], '🔥': ['fire', 'orange'], '📈': ['chart', 'green'], '🎯': ['target', 'red'], '🏆': ['trophy', 'yellow'], '💡': ['bulb', 'yellow'], '☀️': ['sun', 'orange'], '🎓': ['cap', 'navy'], '🌸': ['flower', 'pink'], '📢': ['mega', 'orange'], '📖': ['book', 'teal'], '⏳': ['hour', 'orange'], '✅': ['check', 'green'], '🎉': ['spark', 'pink'] };
const EMO3D_RE = new RegExp('(' + Object.keys(EMO3D).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
const EMO3D_SEL = '.ni,.qi,.ri,.sech,.mfold summary,.mst .k,.dsec,.bell,.dhd b,.lbh b,.prog .row>b,.tip,.ivtip,.cd b';
function tileEl(e) {
  const [g, t] = EMO3D[e]; const [c1, c2] = TONE[t]; const sp = document.createElement('span'); sp.className = 'tile'; sp.setAttribute('aria-hidden', 'true');
  sp.style.setProperty('--c1', c1); sp.style.setProperty('--c2', c2);
  sp.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPH[g]}</svg>`; return sp;
}
function emo3d(root) {
  (root.matches && root.matches(EMO3D_SEL) ? [root] : []).concat([...(root.querySelectorAll ? root.querySelectorAll(EMO3D_SEL) : [])]).forEach(el => {
    if (el.dataset.e3) return; el.dataset.e3 = '1';
    const w = document.createTreeWalker(el, 4); const nodes = []; let n; while ((n = w.nextNode())) { EMO3D_RE.lastIndex = 0; if (EMO3D_RE.test(n.nodeValue)) nodes.push(n); }
    nodes.forEach(t => { const f = document.createDocumentFragment(); EMO3D_RE.lastIndex = 0; t.nodeValue.split(EMO3D_RE).forEach((part, i) => { if (i % 2) f.appendChild(tileEl(part)); else if (part) f.appendChild(document.createTextNode(part.replace(/^\s+/, i ? ' ' : ''))); }); t.replaceWith(f); });
  });
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(x => { if (x.nodeType === 1) emo3d(x); }))).observe(document.documentElement, { childList: true, subtree: true });
const SECS = [['home', '🏠', 'হোম'], ['study', '📚', 'পড়া'], ['test', '📝', 'টেস্ট'], ['japan', '🗾', 'জাপান'], ['me', '👤', 'আমি']];
const O = (html, n) => html ? `<div class="ob" style="order:${n}">${html}</div>` : '';   // a home block with its place in the phone layout
function renderHome(d, user) {
  const I = d.institute || {}; const s = d.student || {}; const fee = d.fee || {}; const vids = (d.materials || []).filter(m => m.kind === 'video'); const mats = (d.materials || []).filter(m => m.kind !== 'video');
  document.title = 'ছাত্রদের সাইট · ' + (s.name_bn || s.name_en || 'সাকুরা');
  const wa = waNum(I.whatsapp || I.phone);
  const groups = []; for (const m of mats) { let g = groups.find(x => x.level === m.level); if (!g) groups.push(g = { level: m.level, items: [] }); g.items.push(m); }
  const levelBlock = (g) => { const chaps = []; for (const m of g.items) { const k = m.chapter || ''; let c = chaps.find(x => x.k === k); if (!c) chaps.push(c = { k, items: [] }); c.items.push(m); }
    return `<section data-lv><div class="lvl">${esc(LEVEL_NAME[g.level] || g.level)}</div>${chaps.map(c => `<div data-ch>${c.k ? `<div class="chap">${esc(c.k)}</div>` : ''}<div class="mlist">${c.items.map(matRow).join('')}</div></div>`).join('')}</section>`; };
  const counts = d.counts || {}; const total = Object.values(counts).reduce((a, b) => a + num(b), 0);
  if (HOME_TAB === 'mock') { NAVSEC = 'test'; HOME_TAB = 'mat'; }   // coming back from a test
  if (d.blocked || !SECS.some(x => x[0] === NAVSEC)) NAVSEC = 'home';
  const head = `<div class="phd ${NAVSEC === 'home' && !d.blocked ? 'slim' : ''}"><div class="sw"><span class="kamon">${KAMON}</span><div style="min-width:0"><b>${NAVSEC === 'home' && !d.blocked ? 'সাকুরা' : esc(s.name_bn || s.name_en)}</b><small>${esc(s.admission_no)} · ${esc((d.levels || []).join(', '))}${s.batch && BATCH[s.batch] ? ' · ' + esc(BATCH[s.batch]) : ''}</small></div></div><div class="row" style="gap:6px;flex:none"><button type="button" class="hlang" data-noi18n data-lang="${window.SK_LANG === 'en' ? 'bn' : 'en'}" title="ভাষা / Language" aria-label="ভাষা / Language">${window.SK_LANG === 'en' ? 'বাং' : 'EN'}</button>${bellHtml(d)}${d.blocked ? '<button class="out" id="lo">লগআউট</button>' : ''}</div></div>
    ${d.preview ? `<div class="pvbar"><b>👁 প্রিভিউ</b> — ছাত্ররা যা দেখে, আপনি সেটাই দেখছেন। সব লেভেল দেখা যাচ্ছে, আর <span class="hidtag">লুকানো</span> চিহ্ন দেওয়া জিনিস ছাত্ররা এখনো দেখে না। এখানে টেস্ট দিলে নম্বর কোথাও জমা হয় না। <a href="../#/mocks">পোর্টালে ফিরুন</a></div>` : ''}`;
  const foot = `<p class="small muted" style="text-align:center;margin-top:24px">${esc(I.bn || 'সাকুরা জাপানিজ ইনস্টিটিউট')}${I.phone ? ' · ' + esc(I.phone) : ''}</p>`;
  const row = (id, ic, t, sub, n) => `<button class="mrow" id="${id}"><span class="ri">${ic}</span><span class="rt"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span>${n ? `<span class="bn">${n}</span>` : ''}<span class="rc">›</span></button>`;
  let body = '';
  if (d.blocked) body = `${installCardHtml(d)}${noticesHtml(d)}${feedbackCardHtml(d)}<div class="card lock"><h2 style="margin-top:0">🔒 বইগুলো এখনো বন্ধ</h2><p style="margin:0 0 6px">${esc(WHY[d.blocked] || '')}</p>
      ${d.blocked === 'due' ? `<p style="margin:0">মোট কোর্স ফি ${tk(fee.net)} · পরিশোধ ${tk(fee.paid)} · <b style="color:var(--red)">বাকি ${tk(fee.due)}</b></p><p class="small muted" style="margin:6px 0 0">অফিসে বা বিকাশে টাকা দেওয়ার পর অফিস রশিদ লিখলেই এই পাতা নিজে থেকে খুলে যাবে — আবার লগইন করে দেখুন।</p>` : ''}
      ${total ? `<div class="teaser">${Object.entries(counts).map(([k, n]) => `<span>${esc(LEVEL_NAME[k] || k)}: ${n}টি উপকরণ</span>`).join('')}</div>` : ''}
      ${wa ? `<p style="margin:12px 0 0"><a class="btn sm wa" href="https://wa.me/${wa}?text=${encodeURIComponent(`আসসালামু আলাইকুম। আমি ${s.name_bn || s.name_en} (${s.admission_no})। ছাত্রদের সাইট নিয়ে কথা বলতে চাই।`)}" target="_blank" rel="noopener">অফিসে WhatsApp করুন</a></p>` : ''}</div>`;
  else if (NAVSEC === 'home') { const sl = [[todayHtml(d), 'আজকের কাজ'], [noticesHtml(d), 'নোটিশ'], [countdownHtml(d), 'JLPT'], [dailyHtml(d), 'আজকের পড়া'], [leaderboardHtml(d), 'সেরা তালিকা'], [feedbackCardHtml(d), 'মতামত'], [installCardHtml(d), 'অ্যাপ']].filter(x => x[0]);
    body = `<div class="hfit">${greetHtml(d)}${walletHtml(d)}${quickHtml(d, vids)}<div class="hslider" id="hsl">${sl.map(x => `<section class="hs">${x[0]}</section>`).join('')}</div>${sl.length > 1 ? `<div class="hdots" id="hdots">${sl.map((x, i) => `<button type="button" data-hs="${i}" class="${i === HS_IDX ? 'on' : ''}" aria-label="${esc(x[1])}"></button>`).join('')}</div>` : ''}</div>`; }
  else if (NAVSEC === 'study') { const qn = qaUnread(d).length;
    body = `<h1 class="sech">📚 পড়া</h1><div class="mlist2">${vids.length ? row('vidgo', '🎬', 'ভিডিও ক্লাস', `${BN_NUM(vids.filter(v => vidDone(d, v.id)).length)}/${BN_NUM(vids.length)}টি দেখা শেষ`) : ''}${row('qago', '❓', 'শিক্ষককে প্রশ্ন', 'কিছু না বুঝলে জিজ্ঞেস করুন', qn ? BN_NUM(qn) : '')}</div>
      <div class="authtabs" style="margin:0 0 14px;flex-wrap:nowrap"><button data-ht="mat" class="${HOME_TAB === 'mat' ? 'on' : ''}">📚 উপকরণ (${mats.length})</button><button data-ht="kana" class="${HOME_TAB === 'kana' ? 'on' : ''}">あ কানা ও বলা</button><button data-ht="fc" class="${HOME_TAB === 'fc' ? 'on' : ''}">🃏 কার্ড</button></div>
      ${HOME_TAB === 'kana' ? kanaHtml(d) : HOME_TAB === 'fc' ? fcHomeHtml(d) : mats.length ? `<div class="card open" style="padding:12px 16px"><b>স্বাগতম!</b> <span class="muted">আপনার লেভেলের ${mats.length}টি উপকরণ নিচে আছে। এগুলো শুধু আপনার নিজের পড়ার জন্য — অন্য কাউকে দেবেন না।</span></div>
      <input class="search" id="q" type="search" placeholder="খুঁজুন: পাঠের নাম, অধ্যায়…" aria-label="খুঁজুন">${groups.map(levelBlock).join('')}<div class="empty" id="none" hidden>কিছু পাওয়া যায়নি</div>`
      : '<div class="card"><div class="empty">আপনার লেভেলের জন্য এখনো কোনো উপকরণ যোগ করা হয়নি। শিগগিরই যোগ হবে।</div></div>'}`; }
  else if (NAVSEC === 'test') body = `<h1 class="sech">📝 মক টেস্ট</h1>${MK ? mistakesViewHtml(d) : progressHtml(d.history) + mistakesCardHtml(d) + mockListHtml(d.mocks || []) + historyHtml(d.history || [])}`;
  else if (NAVSEC === 'japan') body = `<h1 class="sech">🇯🇵 জাপান</h1><div class="mlist2">${row('ivgo', '🎤', 'ইন্টারভিউ প্র্যাকটিস', 'স্কুল ও ভিসা ইন্টারভিউর প্রশ্ন, নমুনা উত্তর, মক ইন্টারভিউ')}${window.SAKURA_JPGUIDE ? row('jggo', '🗾', 'জাপান লাইফ গাইড', 'যাওয়ার আগে ও পরে যা জানা দরকার') : ''}${docsRowHtml(d)}${d.preview ? '' : row('jpgo', '🇯🇵', 'আমার জাপান আবেদন', 'স্কুল, ধাপ আর আবেদনের অবস্থা')}</div>${countdownHtml(d)}`;
  else if (NAVSEC === 'me') { const bd = d.preview ? null : badgeList(d); const ib = inboxCount(d);
    const fold = (k, ic, t, inner) => inner ? `<details class="mfold" data-mf="${k}" ${meOpen()[k] ? 'open' : ''}><summary><span class="ri">${ic}</span><b>${t}</b><span class="chev" aria-hidden="true"></span></summary><div class="mlist2">${inner}</div></details>` : '';
    body = `<h1 class="sech">👤 আমি</h1>${meCardHtml(d, s)}${d.preview ? '' : meStatsHtml(d)}
      <div class="mlist2">${d.preview ? '' : row('ibgo', '🔔', 'নতুন খবর', 'নোটিশ, উত্তর, নম্বর, সার্টিফিকেট', ib ? BN_NUM(ib) : '') + row('idgo', '🪪', 'আমার ডিজিটাল আইডি', 'QR কোড — অফিসে দেখালে আপনার তথ্য খুলবে')}</div>
      ${d.preview ? '' : fold('money', '💳', 'ফি, হাজিরা ও কাগজপত্র', row('accgo', '💳', 'ফি ও হিসাব', 'বাকি টাকা, রশিদ, বিকাশে টাকা দেওয়া') + row('attgo', '📅', 'আমার হাজিরা', 'কোন দিন উপস্থিত ছিলেন') + row('docgo', '📄', 'সার্টিফিকেট', 'স্টাডি-আওয়ার, ফলাফল, আইডি কার্ড চাওয়া'))}
      ${d.preview ? '' : fold('fun', '🏅', 'ব্যাজ ও বন্ধু', row('bdgo', '🏅', 'আমার ব্যাজ', bd ? `${BN_NUM(bd.filter(x => x.done).length)}/${BN_NUM(bd.length)}টি পেয়েছেন` : '') + row('refgo', '🤝', 'বন্ধুকে আনুন', 'আপনার নিজের লিংক'))}
      ${fold('set', '⚙️', 'সেটিংস', `<div class="card acct langrow"><span class="ri">🌐</span><span style="flex:1"><b>ভাষা / Language</b></span>${langSwitchHtml()}</div><div class="card acct langrow"><span class="ri">🌙</span><span style="flex:1"><b>রং</b></span>${stThemeHtml()}</div>${installCardHtml(d)}<button class="btn ghost" id="lo" style="width:100%;justify-content:center">লগআউট</button>`)}`; }
  const nav = d.blocked ? '' : `<nav class="bnav" aria-label="মেনু">${SECS.map(([k, ic, l]) => { const n = k === 'home' ? (d.notices || []).filter(x => !ntSeen(d).includes(String(x.id))).length + (d.homework || []).filter(hwPending).length : k === 'study' ? qaUnread(d).length : 0;
    return `<button data-sec="${k}" class="${NAVSEC === k ? 'on' : ''}" ${NAVSEC === k ? 'aria-current="page"' : ''}><span class="ni">${ic}</span><span class="nl">${l}</span>${n ? '<i class="ndot"></i>' : ''}</button>`; }).join('')}<button type="button" class="bmin" id="bmin" aria-label="মেনু ছোট / বড় করুন" title="মেনু ছোট / বড় করুন"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button></nav>`;
  $('#app').innerHTML = `<div class="st app2 ${d.blocked ? '' : 'hasnav'}">${head}<div class="shell2">${nav}<main class="smain">${body}${foot}</main></div></div>`;
  stPill(); const sm = $('.smain'); if (sm && ST_LASTSEC && ST_LASTSEC !== NAVSEC && !matchMedia('(prefers-reduced-motion: reduce)').matches) { sm.classList.add('enter'); setTimeout(() => sm.classList.remove('enter'), 1000); } ST_LASTSEC = NAVSEC;
  const bm = $('#bmin'); if (bm) bm.onclick = () => { const on = !document.documentElement.classList.contains('bmini'); document.documentElement.classList.toggle('bmini', on); try { localStorage.setItem('sakura_st_bmini', on ? '1' : ''); } catch (_) {} };
  $$('[data-sec]').forEach(b => b.onclick = () => { if (document.documentElement.classList.contains('bmini') && matchMedia('(max-width:999px)').matches && b.classList.contains('on')) { document.documentElement.classList.remove('bmini'); try { localStorage.setItem('sakura_st_bmini', ''); } catch (_) {} return; } NAVSEC = b.dataset.sec; MK = NAVSEC === 'test' ? MK : null; renderHome(d, user); scrollTo(0, 0); });
  const jp = $('#jpgo'); if (jp) jp.onclick = () => { ME_TAB = 'jp'; renderMe(d, user); };
  const ibg = $('#ibgo'); if (ibg) ibg.onclick = () => renderInbox(d, user);
  const idg = $('#idgo'); if (idg) idg.onclick = () => renderMyId(d, user);
  const dcg = $('#dcgo'); if (dcg) dcg.onclick = () => { DU = null; renderDocs(d, user); };
  const lo = $('#lo'); if (lo) lo.onclick = async () => { await API.signOut(); renderAuth(); };
  if (NAVSEC === 'home') { bindWallet(d); bindSlider(); }
  $$('.mfold').forEach(f => f.addEventListener('toggle', () => { const o = meOpen(); o[f.dataset.mf] = f.open; try { localStorage.setItem('sakura_me_open', JSON.stringify(o)); } catch (_) {} }));
  if (NAVSEC === 'me' && $('#statt')) fillAttStat(d);
  $$('[data-ht]').forEach(b => b.onclick = () => { HOME_TAB = b.dataset.ht; renderHome(d, user); const t = $('.authtabs'); if (t && t.getBoundingClientRect().top < 0) t.scrollIntoView({ block: 'start' }); });
  $$('[data-mc]').forEach(b => b.onclick = () => { MOCK_CAT_TAB = b.dataset.mc; renderHome(d, user); });
  bindDaily(d, user);
  bindFc(d, user);
  bindKana(d, user);
  if (NAVSEC === 'study' && HOME_TAB === 'kana' && KN.mode === 'speak') bindSpeak(d, user);
  bindMistakes(d, user);
  bindCountdown(d, user);
  bindLeaderboard(d, user);
  const qg = $('#qago'); if (qg) qg.onclick = () => renderQA(d, user);
  bindInstall(); setAppBadge(d);
  $$('[data-fbq]').forEach(b => b.onclick = () => { FB = null; renderFeedback(d, user, Number(b.dataset.fbq)); });
  const fh = $('#fbhide'); if (fh) fh.onclick = () => { try { localStorage.setItem(fbHideKey(d), '1'); } catch { /* not kept */ } $('.fbc').remove(); };
  const bl = $('#bellgo'); if (bl) bl.onclick = () => renderInbox(d, user);
  [['accgo', 'acct'], ['attgo', 'att'], ['docgo', 'doc']].forEach(([id, t]) => { const b = $('#' + id); if (b) b.onclick = () => { ME_TAB = t; renderMe(d, user); }; });
  const rf = $('#refgo'); if (rf) rf.onclick = () => renderRefer(d, user);
  const jg = $('#jggo'); if (jg) jg.onclick = () => { scrollTo(0, 0); renderJapanGuide(d, user); };
  const td = $('#tdaily'); if (td) td.onclick = () => { DAILY_OPEN = true; renderHome(d, user); const c = $('.daily'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const qm = $('#qmock'); if (qm) qm.onclick = () => { NAVSEC = 'test'; renderHome(d, user); scrollTo(0, 0); };
  const qf = $('#qfc'); if (qf) qf.onclick = () => { NAVSEC = 'study'; HOME_TAB = 'fc'; renderHome(d, user); scrollTo(0, 0); };
  const qt = $('#qmat'); if (qt) qt.onclick = () => { NAVSEC = 'study'; HOME_TAB = 'mat'; renderHome(d, user); scrollTo(0, 0); };
  const ig = $('#ivgo'); if (ig) ig.onclick = () => renderInterview(d, user);
  const vg = $('#vidgo'); if (vg) vg.onclick = () => { VID_OPEN = null; renderVideos(d, user); };
  const rg = $('#rtgo'); if (rg) { const f = (e) => { if (e.target.closest('[data-join]')) return; renderRoutine(d, user); }; rg.onclick = f; rg.onkeydown = (e) => { if (e.target === rg && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); renderRoutine(d, user); } }; }
  const hg = $('#hwgo'); if (hg) { const f = () => { HW_OPEN = null; renderHomework(d, user); }; hg.onclick = f; hg.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; }
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
const ABCD = window.SK_LANG === 'en' ? ['A', 'B', 'C', 'D'] : ['ক', 'খ', 'গ', 'ঘ']; // answer labels: ক খ গ ঘ in Bangla, A B C D in English
const MOCK_ERR = { in_order: 'আগের টেস্টটা আগে শেষ করুন — একটা শেষ করলে পরেরটা খুলবে।', limit: 'এই টেস্ট যতবার দেওয়া যায়, তা শেষ হয়ে গেছে।', locked: 'পুরো কোর্স ফি পরিশোধ হলে মক টেস্ট দেওয়া যাবে।', not_found: 'টেস্টটি এখন পাওয়া যাচ্ছে না।', busy: 'অল্প সময়ে অনেকবার শুরু করা হয়েছে, কিছুক্ষণ পরে চেষ্টা করুন।', not_linked: 'আবার লগইন করুন।' };
const mockErr = (e) => { const m = errMsg(e); const k = Object.keys(MOCK_ERR).find(x => m.includes(x)); return k ? MOCK_ERR[k] : m; };
const optsOf = (q) => Array.isArray(q.options) ? q.options : (() => { try { return JSON.parse(q.options); } catch { return []; } })();
const fmtClock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function speakJa(text, onEnd) { try { return speakJa0(text, onEnd); } catch (e) { console.warn(e); return false; } }
function speakJa0(text, onEnd) {
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
// tests open one at a time: in each section (and level) a test opens after the one above it has been finished once.
// Only students follow the order; anyone from the office looking through the preview can open every test.
let MOCK_LOCKS = {};
function mockLocks(list) {
  const out = {}; if (PREVIEW) return out; // staff preview (director, head teacher, teachers, office staff): every test is open
  let pdone = new Set(); try { pdone = new Set(JSON.parse(localStorage.getItem('sakura_preview_done') || '[]')); } catch (_) {}
  const last = {};
  for (const t of list) { if (t.hidden) continue; const k = mockCat(t) + '|' + t.level; const prev = last[k];
    const done = (x) => x.attempts > 0 || (PREVIEW && pdone.has(x.id));
    if (prev && !done(prev) && !done(t)) out[t.id] = prev.title; // a test already taken can always be taken again
    last[k] = t; }
  return out;
}
function mockRow(t) {
  const lockedBy = MOCK_LOCKS[t.id];
  if (lockedBy) return `<div class="mat locked"><div class="ic">🔒</div><div class="bd"><b>${esc(t.title)}</b><div class="small muted">${t.questions}টি প্রশ্ন · ${t.duration_min} মিনিট</div><div class="small lockt">${window.SK_LANG === 'en' ? `Finish “${esc(lockedBy)}” first` : `আগে “${esc(lockedBy)}” শেষ করুন`}</div></div></div>`;
  const p = t.best != null && t.questions ? Math.round(t.best * 100 / t.questions) : null; const left = t.max_attempts ? t.max_attempts - t.attempts : null;
  return `<div class="mat"><div class="ic">${esc(t.level)}</div><div class="bd"><b>${esc(t.title)}</b>${t.hidden ? ' <span class="hidtag">লুকানো</span>' : ''}<div class="small muted">${t.questions}টি প্রশ্ন · ${t.duration_min} মিনিট · পাস ${t.pass_pct}%${left != null ? ` · আর ${Math.max(0, left)} বার দেওয়া যাবে` : ''}</div>
      ${t.attempts ? `<div class="small" style="margin-top:2px">দিয়েছেন ${t.attempts} বার · সেরা <b style="color:${p >= t.pass_pct ? 'var(--green)' : 'var(--red)'}">${t.best}/${t.questions} (${p}%)</b></div>` : ''}</div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">${left === 0 ? '' : `<button class="btn sm" data-start="${esc(t.id)}">${t.attempts ? 'আবার দিন' : 'শুরু করুন'}</button>`}${t.last_attempt ? `<button class="btn sm ghost" data-rev="${esc(t.last_attempt)}">ফলাফল</button>` : ''}</div></div>`;
}
function mockListHtml(list) {
  if (!list.length) return '<div class="card"><div class="empty">আপনার লেভেলের জন্য এখনো কোনো মক টেস্ট চালু করা হয়নি।</div></div>';
  MOCK_LOCKS = mockLocks(list);
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
  if (MOCK_LOCKS[id]) { toast(window.SK_LANG === 'en' ? `Finish “${MOCK_LOCKS[id]}” first — each test opens after the one before it` : `আগে “${MOCK_LOCKS[id]}” শেষ করুন — একটা শেষ করলে পরেরটা খুলবে`, true); return; }
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
    if (q.passage && q.passage !== pas) { pas = q.passage; html += `<div class="card passage">${fx(q.passage)}</div>`; }
    n++; const o = optsOf(q);
    html += `<div class="q card" id="q-${esc(q.id)}"><div class="qt"><b>${n}.</b> <span>${fx(q.question)}</span></div>
      ${q.section === 'listening' ? `<div style="margin:8px 0"><button type="button" class="btn sm" data-listen="${esc(q.id)}">🔊 শুনুন</button></div>` : ''}
      ${o.map((op, i) => `<label class="opt ${String(answers[q.id]) === String(i) ? 'sel' : ''}"><input type="radio" name="a-${esc(q.id)}" value="${i}" ${String(answers[q.id]) === String(i) ? 'checked' : ''}><span class="ab">${ABCD[i]}</span><span>${fx(op)}</span></label>`).join('')}</div>`;
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

// a short burst of paper pieces when a student passes a test they just took
function confetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const C = ['#C8372B', '#C9A24B', '#1B2945', '#1FA855', '#F2B8B0'];
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 2.9 + 1) % 100}%;background:${C[i % 5]};--dx:${((i * 37) % 120) - 60}px;--r:${(i * 97) % 720}deg;animation-delay:${(i % 9) * 0.06}s"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 3400);
}
function renderResult(r) {
  EXAM = null; window.onbeforeunload = null;
  if (r.submitted_at && Date.now() - Date.parse(r.submitted_at) < 10 * 60000) API.checkin('mock').catch(() => {});
  const p = r.total ? Math.round(r.score * 100 / r.total) : 0; const secs = r.sections || {}; const cn = attemptCounts(r);
  let rev = ''; let sec = null, pas = null, n = 0;
  for (const q of r.questions || []) {
    if (q.section !== sec) { sec = q.section; pas = null; rev += `<div class="lvl">${esc(SEC[sec] || sec)}</div>`; }
    if (q.passage && q.passage !== pas) { pas = q.passage; rev += `<div class="card passage">${fx(q.passage)}</div>`; }
    n++; const o = optsOf(q); const mine = q.mine == null ? null : Number(q.mine); const ok = mine === Number(q.correct);
    rev += `<div class="q card ${ok ? 'qok' : 'qbad'}"><div class="qt"><b>${n}.</b> <span>${fx(q.question)}</span> <span class="small" style="color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:700">${ok ? '✓ সঠিক' : mine == null ? '— উত্তর দেননি' : '✗ ভুল'}</span></div>
      ${o.map((op, i) => `<div class="opt ${i === Number(q.correct) ? 'right' : i === mine ? 'wrong' : ''}"><span class="ab">${ABCD[i]}</span><span>${fx(op)}</span>${i === Number(q.correct) ? ' <b>✓</b>' : i === mine ? ' <b>✗</b>' : ''}</div>`).join('')}
      ${q.section === 'listening' && q.script ? `<details class="small" style="margin-top:6px"><summary>শোনার লেখা দেখুন</summary><div style="white-space:pre-line;margin-top:4px">${esc(q.script)}</div><button type="button" class="btn sm ghost" data-say="${esc(q.id)}" style="margin-top:6px">🔊 আবার শুনুন</button></details>` : ''}
      ${q.explanation ? `<div class="small expl">💡 ${esc(q.explanation)}</div>` : ''}</div>`;
  }
  if (r.passed && r.submitted_at && Date.now() - Date.parse(r.submitted_at) < 10 * 60000) setTimeout(confetti, 250);
  $('#app').innerHTML = `<div class="st">
    <div class="card ${r.passed ? 'open' : 'lock'}" style="text-align:center;padding:20px"><div class="small muted">${esc(r.test.title)}</div>
      <div class="${r.passed ? 'passpop' : ''}" style="font:800 40px 'Noto Serif Bengali';color:${r.passed ? 'var(--green)' : 'var(--red)'};margin:6px 0">${r.score}/${r.total}</div>
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
// ---- coming back to the site after a while loads the newest notices, marks and fees by itself
let _stLoaded = Date.now();
function stSoftRefresh() {
  if (document.hidden || Date.now() - _stLoaded < 120000 || !$('.bnav') || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
  start();
}
document.addEventListener('visibilitychange', stSoftRefresh);
async function start() {
  _stLoaded = Date.now();
  $('#app').innerHTML = '<div class="boot">লোড হচ্ছে…</div>'; PREVIEW = null;
  try {
    const user = await API.session();
    if (!user) return renderAuth();
    const d = await API.me();
    if (!d) return renderAuth();
    if (!d.linked && d.staff && !DEMO) { const p = await Preview.load(user, d); p.streak = await API.streak(); try { p.exams = await API.examDates(); } catch (e) { p.exams = {}; } try { p.notices = await API.notices(); } catch (e) { p.notices = []; } try { p.lb = await API.leaderboard('N5'); } catch (e) { p.lb = null; } try { p.qa = await API.qa(); } catch (e) { p.qa = null; } try { p.routine = await previewRoutine(); } catch (e) { p.routine = null; } renderHome(p, user); const mk = /^#mock=([\w-]+)/.exec(location.hash); if (mk) { history.replaceState(null, '', location.pathname); NAVSEC = 'test'; renderHome(p, user); askStartMock(mk[1]); } return; }   // the portal's "take it like a student" button opens #mock=<id>
    if (!d.linked) return renderLink(d, user);
    if (!d.blocked) { try { [d.mocks, d.history] = await Promise.all([API.mockList(), API.mockHistory()]); } catch (e) { d.mocks = d.mocks || []; d.history = []; console.warn(e); } }
    if (!d.blocked) { try { d.streak = await API.streak(); } catch (e) { d.streak = null; console.warn(e); } }
    if (!d.blocked) { try { d.mistakes = await API.mistakes(); } catch (e) { d.mistakes = []; console.warn(e); } }
    try { d.exams = await API.examDates(); } catch (e) { d.exams = {}; console.warn(e); }
    try { d.notices = await API.notices(); } catch (e) { d.notices = []; console.warn(e); }
    if (!d.blocked) { try { d.lb = await API.leaderboard(); } catch (e) { d.lb = null; console.warn(e); } }
    if (!d.blocked) { try { d.homework = await API.homework(); } catch (e) { d.homework = []; console.warn(e); } }
    if (!d.blocked) { try { d.qa = await API.qa(); } catch (e) { d.qa = null; console.warn(e); } }
    try { d.routine = await API.routine(); } catch (e) { d.routine = null; console.warn(e); }
    if (!d.blocked) { try { d.videoViews = await API.videoViews(); } catch (e) { d.videoViews = []; console.warn(e); } }
    try { d.docreq = await API.docRequests(); } catch (e) { d.docreq = []; console.warn(e); }
    try { d.fb = await API.feedback(); } catch (e) { d.fb = null; console.warn(e); }
    try { d.docs = await API.docs(); } catch (e) { d.docs = null; console.warn(e); }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { notifyMarkAll(d); startNotifyPoll(d); }
    renderHome(d, user);
  } catch (e) {
    $('#app').innerHTML = shellCard(`<h1>সমস্যা হয়েছে</h1><p>${esc(errMsg(e))}</p><div class="row" style="gap:8px"><button class="btn" id="rt">আবার চেষ্টা</button><button class="btn ghost" id="lo">লগআউট</button></div>`);
    $('#rt').onclick = start; $('#lo').onclick = async () => { await API.signOut(); renderAuth(); };
  }
}

if (sb) sb.auth.onAuthStateChange((ev, session) => { if (session) API._token = session.access_token; if (ev === 'PASSWORD_RECOVERY') renderNewPassword(); });
if (!DEMO && /type=recovery/.test(location.hash)) setTimeout(() => { if (!$('#npf')) start(); }, 5000); // the recovery event above shows the new-password form
else start();
