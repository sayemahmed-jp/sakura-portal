/* Sakura Portal · certificates (v44)
   Seven kinds, one living certificate per student and kind (mock: per test; completion: per level).
   - details: what the portal works out from its own records (attendance, marks, mock tests, the student's file)
   - overrides: what the office corrected by hand (e.g. classes held on paper) — these always win
   Printing opens an editor first: the worked-out figures are filled in, the office can change any of them.
   When attendance, marks or the student's file change, the saved details refresh by themselves, so the
   online check (QR → sakura.institute/verify) always shows the latest. Loaded after app.js (shares its globals). */

const VERIFY_BASE = 'https://sakura.institute/verify/';
const CERT_KIND = {
  hours: 'স্টাডি-আওয়ার সার্টিফিকেট (日本語学習時間証明書)', transcript: 'রেজাল্ট সার্টিফিকেট (成績証明書)', mock: 'মক টেস্ট পাসের সার্টিফিকেট (模擬試験 合格証)',
  enrol: 'অধ্যয়নরত সনদ (在籍証明書)', complete: 'কোর্স সমাপ্তি সনদ (修了証明書)', attend: 'মাসভিত্তিক হাজিরা সনদ (出席証明書)', recommend: 'সুপারিশপত্র (推薦状)'
};
const CERT_HELP = {
  hours: 'কত ঘণ্টা জাপানি পড়েছে — জাপানের স্কুলে আবেদনে প্রায় সবসময় লাগে', transcript: 'ইনস্টিটিউটের সব পরীক্ষার নম্বর',
  enrol: 'ছাত্রটি এখন নিয়মিত পড়ছে — আবেদনের সময় যারা ক্লাস চালিয়ে যাচ্ছে', complete: 'একটা লেভেলের (N5/N4) কোর্স পুরো শেষ করেছে',
  attend: 'প্রতি মাসে কত ক্লাস, কতদিন এসেছে — কিছু স্কুল ও ইমিগ্রেশন চায়', recommend: 'পরিচালকের সুপারিশ — লেখাটা নিজের মতো বদলে নিন'
};
const verifyUrl = (c) => `${VERIFY_BASE}?n=${encodeURIComponent(c.cert_no)}&k=${encodeURIComponent(c.code)}`;
const certKey = (kind, extra) => (kind === 'mock' || kind === 'complete') && extra ? `${kind}:${extra}` : kind;
const certLive = (sid, key) => (S.certificates || []).find(c => c.student_id === sid && c.key === key && !c.revoked_at);
const stable = (v) => v && typeof v === 'object' ? (Array.isArray(v) ? '[' + v.map(stable).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}') : JSON.stringify(v ?? null);
const jdate = (iso) => iso ? `${iso.slice(0, 4)}年${num(iso.slice(5, 7))}月${num(iso.slice(8, 10))}日` : '';
const BATCH_EN = { morning: '10:00–12:00', evening: '18:00–20:00' };
const TYPE_JA = { quiz: '小テスト', test: '定期試験', mock: '模擬試験', jlpt: '日本語能力試験 (JLPT)', nat: 'NAT-TEST', speaking: '会話・面接', other: 'その他' };
const MOCK_CAT = { full: '総合模擬試験 / Full mock test', kanji: '漢字 / Kanji', grammar: '文法 / Grammar', listening: '聴解 / Listening' };

// ------------------------------------------------------------------ what the records say
function attRecs(sid, level) {
  const sm = sessionMap();
  return S.attendance.filter(a => a.student_id === sid && sm.has(a.session_id)).map(a => ({ a, s: sm.get(a.session_id) })).filter(x => !level || x.s.level === level);
}
function monthsOf(sid) {
  const by = {};
  for (const { a, s } of attRecs(sid)) {
    const m = (s.class_date || '').slice(0, 7); if (!m) continue;
    const x = by[m] || (by[m] = { m, total: 0, came: 0, absent: 0, hours: 0 });
    x.total++; if (a.status === 'present' || a.status === 'late') { x.came++; x.hours += num(s.hours); } else if (a.status === 'absent') x.absent++;
  }
  return Object.values(by).sort((a, b) => a.m.localeCompare(b.m));
}
function certAuto(kind, s, extra) {
  const a = attOf(s.id); const st = S.settings;
  if (kind === 'hours') return { hours: a.hours, pct: a.pct, came: a.came, total: a.total, from: a.first || '', to: a.last || '', levels: Object.fromEntries(LEVELS.filter(l => a.byLevel[l]).map(l => [l, a.byLevel[l]])) };
  if (kind === 'transcript') {
    const rows = studentResults(s.id).map(({ r, ex }) => ({ date: ex.exam_date || '', type: ex.type || '', title: ex.title || '', level: ex.level || '', absent: !!r.absent, marks: r.absent ? null : num(r.marks), max: num(ex.max_marks), pct: pctOf(r, ex), pass: !r.absent && passed(r, ex) }));
    return { hours: a.hours, pct: a.pct, exams: rows };
  }
  if (kind === 'mock') {
    const at = (S.mock_attempts || []).find(x => x.id === extra) || {}; const r = at.id ? attemptRow(at) : null; const t = (r && r.t) || {};
    return { test: t.title || '', level: t.level || '', category: t.category || '', score: r ? r.score : 0, total: r ? r.total : 0, pct: r ? r.pct : 0, pass_pct: num(t.pass_pct || 60), date: (at.submitted_at || '').slice(0, 10) };
  }
  if (kind === 'enrol') return { since: s.start_date || s.admission_date || '', level: s.current_level || '', course: '日本語コース (JLPT N5・N4 対策) / Japanese Language Course', schedule: `${BATCH_EN[s.batch] || ''} · ${num(st.hours_per_class) || 2} hours per class`.replace(/^ · /, ''), hours: a.hours, pct: a.pct, status: '在籍中 / Currently enrolled', until: '' };
  if (kind === 'complete') {
    const L = extra || s.current_level || 'N5'; const recs = attRecs(s.id, L); const came = recs.filter(x => x.a.status === 'present' || x.a.status === 'late');
    const dates = came.map(x => x.s.class_date).sort(); const hrs = came.reduce((m, x) => m + num(x.s.hours), 0);
    return { level: L, course: `日本語 ${L} コース / Japanese Language ${L} Course`, textbook: st.textbooks[L] || '', from: dates[0] || '', to: dates[dates.length - 1] || '', hours: hrs, pct: recs.length ? Math.round(came.length * 100 / recs.length) : null, completed_on: dates[dates.length - 1] || '', result: '修了 / Completed' };
  }
  if (kind === 'attend') { const months = monthsOf(s.id); return { months, total: months.reduce((m, x) => m + x.total, 0), came: months.reduce((m, x) => m + x.came, 0), hours: a.hours, pct: a.pct }; }
  if (kind === 'recommend') {
    const best = (S.mock_attempts || []).filter(x => x.student_id === s.id && x.submitted_at).map(attemptRow).filter(r => r.pass).sort((x, y) => y.pct - x.pct)[0];
    const nm = s.name_en || ''; const since = s.start_date || s.admission_date || '';
    const mj = best ? `当学院の${best.t.level || ''}模擬試験では${best.pct}%の成績で合格しております。` : '';
    const me = best ? ` The student passed our ${best.t.level || ''} mock test with ${best.pct}%.` : '';
    return {
      purpose: '日本語学校入学のため / For admission to a Japanese language school',
      text_ja: `${nm}は、${jdate(since)}より当学院において日本語を学習しております。これまでの総学習時間は${a.hours}時間、出席率は${a.pct ?? '—'}%です。${mj}授業には真面目に取り組み、日本での学業に必要な努力を続けることができる学生であると考え、ここに推薦いたします。`,
      text_en: `${nm} has been studying Japanese at our institute since ${fmtD(since)}, with ${a.hours} hours of study and an attendance rate of ${a.pct ?? '—'}%.${me} The student studies seriously, and we believe they will continue to make the effort needed to study in Japan. We recommend them without reservation.`
    };
  }
  return {};
}
const certMerge = (auto, c) => ({ ...auto, ...((c && c.overrides) || {}) });

// ------------------------------------------------------------------ saving (one living certificate per student and key)
function certPut(c) { S.certificates = S.certificates || []; const i = S.certificates.findIndex(x => x.id === c.id); if (i >= 0) S.certificates[i] = c; else S.certificates.push(c); }
async function issueCert(kind, key, s, details, overrides) {
  const name = s.name_en || s.name_bn || '';
  if (DEMO) {
    const rows = Local.read('certificates'); const i = rows.findIndex(c => c.student_id === s.id && c.key === key && !c.revoked_at);
    if (i >= 0) {
      const c = rows[i]; const ov = overrides == null ? c.overrides : overrides;
      if (stable(c.details) !== stable(details) || stable(c.overrides) !== stable(ov) || c.name_en !== name) rows[i] = { ...c, details, overrides: ov, name_en: name, student_no: s.admission_no || '', version: (c.version || 1) + 1, updated_at: new Date().toISOString() };
      Local.write('certificates', rows); certPut(rows[i]); return rows[i];
    }
    const n = rows.length + 1;
    const c = { id: uuid(), cert_no: `SJI-${todayISO().slice(0, 4)}-${String(n).padStart(5, '0')}`, code: uuid().replace(/-/g, '').slice(0, 10).toUpperCase(), kind, key, student_id: s.id, name_en: name, student_no: s.admission_no || '', details, overrides: overrides || {}, version: 1, issued_on: todayISO(), updated_at: new Date().toISOString(), revoked_at: null, revoked_reason: '', created_at: new Date().toISOString() };
    rows.push(c); Local.write('certificates', rows); certPut(c); return c;
  }
  const { data, error } = await sb.rpc('issue_certificate', { p_kind: kind, p_key: key, p_student: s.id, p_name: name, p_student_no: s.admission_no || '', p_details: details, p_overrides: overrides == null ? null : overrides });
  if (error) throw error; certPut(data); return data;
}
const certNotReady = (e) => /issue_certificate|certificates|schema cache|does not exist|function/i.test((e && e.message) || '');

// when attendance, marks or a student's file change, the saved figures of their certificates follow
let _certDirty = new Set(), _certAll = false, _certTimer = null;
function certDirty(ids) {
  if (!S.profile) return;
  if (ids === 'all') _certAll = true; else for (const id of ids || []) if (id) _certDirty.add(id);
  clearTimeout(_certTimer); _certTimer = setTimeout(certRefreshNow, 2500);
}
async function certRefreshNow() {
  const all = _certAll, ids = _certDirty; _certAll = false; _certDirty = new Set();
  for (const c of (S.certificates || []).filter(x => !x.revoked_at && x.kind !== 'mock' && (all || ids.has(x.student_id)))) {
    const s = byId(S.students, c.student_id); if (!s) continue;
    const auto = certAuto(c.kind, s, c.key.includes(':') ? c.key.split(':')[1] : null);
    if (stable(auto) === stable(c.details) && c.name_en === (s.name_en || s.name_bn || '')) continue;
    try { await issueCert(c.kind, c.key, s, auto, null); } catch (e) { console.warn('certificate refresh', e); }
  }
}
(function hookCertRefresh() {
  const A = API, LIVE = ['sessions', 'exams', 'exam_results', 'attendance', 'mock_attempts'];
  for (const m of ['upsertAttendance', 'upsertResults']) { const f = A[m].bind(A); A[m] = async (rows) => { const r = await f(rows); certDirty(rows.map(x => x.student_id)); return r; }; }
  const up = A.update.bind(A); A.update = async (t, id, p) => { const r = await up(t, id, p); if (t === 'students') certDirty([id]); else if (LIVE.includes(t)) certDirty('all'); return r; };
  const ins = A.insert.bind(A); A.insert = async (t, row) => { const r = await ins(t, row); if (LIVE.includes(t)) certDirty(row.student_id ? [row.student_id] : 'all'); return r; };
  const rm = A.remove.bind(A); A.remove = async (t, id) => { await rm(t, id); if (LIVE.includes(t)) certDirty('all'); };
})();

// ------------------------------------------------------------------ the editor (office corrections) → print
const CERT_FIELDS = {
  hours: [['hours', 'মোট শেখার ঘণ্টা', 'num'], ['pct', 'হাজিরার হার (%)', 'num'], ['came', 'উপস্থিত ক্লাস', 'num'], ['total', 'মোট ক্লাস', 'num'], ['from', 'শুরুর তারিখ', 'date'], ['to', 'শেষ তারিখ', 'date']],
  transcript: [['hours', 'মোট শেখার ঘণ্টা', 'num'], ['pct', 'হাজিরার হার (%)', 'num']],
  mock: [],
  enrol: [['since', 'কবে থেকে পড়ছে', 'date'], ['level', 'এখনকার লেভেল', 'text'], ['course', 'কোর্সের নাম', 'text'], ['schedule', 'ক্লাসের সময়', 'text'], ['hours', 'এ পর্যন্ত শেখার ঘণ্টা', 'num'], ['pct', 'হাজিরার হার (%)', 'num'], ['status', 'অবস্থা', 'text'], ['until', 'কোর্স শেষ হবে (জানা থাকলে)', 'date']],
  complete: [['level', 'লেভেল', 'text'], ['course', 'কোর্সের নাম', 'text'], ['textbook', 'বই', 'text'], ['from', 'শুরু', 'date'], ['to', 'শেষ', 'date'], ['hours', 'মোট ঘণ্টা', 'num'], ['pct', 'হাজিরার হার (%)', 'num'], ['completed_on', 'সমাপ্তির তারিখ', 'date'], ['result', 'ফলাফল', 'text']],
  attend: [['hours', 'মোট শেখার ঘণ্টা', 'num'], ['pct', 'মোট হাজিরার হার (%)', 'num']],
  recommend: [['purpose', 'কী কাজে', 'text'], ['text_ja', 'সুপারিশ (জাপানি)', 'area'], ['text_en', 'সুপারিশ (ইংরেজি)', 'area']]
};
function certOpen(kind, s, extra, onPrinted) {
  if (!s || !s.id) return;
  const key = certKey(kind, kind === 'mock' ? (((S.mock_attempts || []).find(x => x.id === extra) || {}).test_id || extra) : extra);
  const auto = certAuto(kind, s, extra); const c = certLive(s.id, key); const ov = (c && c.overrides) || {}; const d = certMerge(auto, c);
  const F = CERT_FIELDS[kind] || []; const canEdit = !isTeacher();
  const val = (v) => v == null ? '' : String(v);
  const field = ([k, l, t]) => { const changed = k in ov; const hint = t === 'area' ? '' : `<span class="small ${changed ? '' : 'muted'}" style="${changed ? 'color:#B5651D' : ''}">${changed ? `✎ সংশোধিত · পোর্টালের হিসাব: ${esc(val(auto[k]) || '—')}` : 'পোর্টালের হিসাব থেকে'}</span>`;
    const inp = t === 'area' ? `<textarea name="${k}" rows="5" ${canEdit ? '' : 'readonly'}>${esc(val(d[k]))}</textarea>` : `<input name="${k}" type="${t === 'num' ? 'number' : t === 'date' ? 'date' : 'text'}" ${t === 'num' ? 'step="any"' : ''} value="${esc(val(d[k]))}" ${canEdit ? '' : 'readonly'}>`;
    return `<label class="f ${t === 'area' || k === 'course' ? 'full' : ''}">${l}${inp}${hint}</label>`; };
  const months = kind === 'attend' ? `<div class="full"><div class="small muted" style="margin:4px 0">মাস অনুযায়ী (খাতায় রাখা হাজিরা থাকলে এখানে ঠিক করে দিন):</div><div class="tw"><table><tr><th>মাস</th><th class="num">মোট ক্লাস</th><th class="num">উপস্থিত</th><th class="num">অনুপস্থিত</th><th class="num">ঘণ্টা</th></tr>
    ${(d.months || []).map((m, i) => `<tr><td>${esc(m.m)}</td>${['total', 'came', 'absent', 'hours'].map(f => `<td class="num"><input data-mi="${i}" data-mf="${f}" type="number" min="0" step="any" value="${esc(val(m[f]))}" style="width:72px" ${canEdit ? '' : 'readonly'}></td>`).join('')}</tr>`).join('') || '<tr><td colspan="5" class="muted">এখনো কোনো হাজিরা নেই</td></tr>'}</table></div>
    ${canEdit ? '<button type="button" class="btn sm ghost" id="addm" style="margin-top:6px">+ মাস যোগ করুন</button>' : ''}</div>` : '';
  openModal(`<h2>🎓 ${esc(CERT_KIND[kind])}</h2>
    <p class="small muted" style="margin-top:-4px">${esc(studentName(s))} · ${esc(s.admission_no || '')}${c ? ` · নম্বর <b>${esc(c.cert_no)}</b> (সংস্করণ ${c.version || 1})` : ' · প্রথমবার প্রিন্টে নম্বর তৈরি হবে'}</p>
    <div class="card" style="background:var(--soft);margin-bottom:10px;font-size:13.5px">পোর্টালের হাজিরা আর নম্বর থেকে সব তথ্য নিজে থেকে বসেছে। খাতায় নেওয়া হাজিরা বা অন্য কারণে কিছু ভুল থাকলে এখানে ঠিক করে দিন — সংশোধন সংরক্ষিত থাকবে। পরে হাজিরা বা নম্বর বদলালে সার্টিফিকেটের বাকি তথ্য নিজে থেকেই হালনাগাদ হবে, আর অনলাইন যাচাইয়ে সবসময় সর্বশেষটা দেখাবে।</div>
    <form class="form" id="cef">${F.map(field).join('')}${months}
    <div class="full row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap">${Object.keys(ov).length && canEdit ? '<button type="button" class="btn ghost" id="cer" style="margin-right:auto">↺ সব সংশোধন মুছে পোর্টালের হিসাবে ফেরত</button>' : ''}<button type="button" class="btn ghost" id="cec">বাতিল</button>${canEdit && F.length ? '<button type="button" class="btn ghost" id="ces">শুধু সংরক্ষণ</button>' : ''}<button type="submit" class="btn gold">🖨 প্রিন্ট</button></div></form>`);
  const collect = () => {
    const f = $('#cef'); const out = {};
    for (const [k, , t] of F) { const el = f.elements[k]; if (!el) continue; const raw = el.value; const v = t === 'num' ? (raw === '' ? null : num(raw)) : raw;
      if (val(v) !== val(auto[k])) out[k] = v; }
    if (kind === 'attend') {
      const ms = (d.months || []).map(m => ({ ...m })); $$('[data-mi]').forEach(i => { const m = ms[+i.dataset.mi]; if (m) m[i.dataset.mf] = i.value === '' ? 0 : num(i.value); });
      ms.sort((x, y) => x.m.localeCompare(y.m));
      if (stable(ms) !== stable(auto.months)) { out.months = ms; out.total = ms.reduce((a, m) => a + num(m.total), 0); out.came = ms.reduce((a, m) => a + num(m.came), 0); if (!('pct' in out)) out.pct = out.total ? Math.round(out.came * 100 / out.total) : null; if (!('hours' in out)) out.hours = ms.reduce((a, m) => a + num(m.hours), 0); }
    }
    return out;
  };
  const save = async (overrides) => { try { return await issueCert(kind, key, s, auto, overrides); } catch (e) { if (certNotReady(e)) { toast('অনলাইন যাচাইয়ের ব্যবস্থা এখনো চালু হয়নি (ডাটাবেসে v44 বাকি) — সার্টিফিকেট নম্বর/QR ছাড়া প্রিন্ট হচ্ছে', true); return null; } throw e; } };
  $('#cec').onclick = closeModal;
  // a month kept only on paper: a new row in the table (saved as a correction)
  const add = $('#addm'); if (add) add.onclick = () => {
    const m = (prompt('কোন মাস? (যেমন 2026-09)', todayISO().slice(0, 7)) || '').trim(); if (!/^\d{4}-\d{2}$/.test(m)) return;
    if ((d.months || []).some(x => x.m === m)) return toast('এই মাস আগেই আছে — সংখ্যাগুলো বদলে দিন', true);
    d.months = [...(d.months || []), { m, total: 0, came: 0, absent: 0, hours: 0 }]; const i = d.months.length - 1;
    const tb = $('#cef table'); const empty = tb.querySelector('td[colspan]'); if (empty) empty.parentElement.remove();
    tb.insertAdjacentHTML('beforeend', `<tr><td>${esc(m)}</td>${['total', 'came', 'absent', 'hours'].map(f => `<td class="num"><input data-mi="${i}" data-mf="${f}" type="number" min="0" step="any" value="0" style="width:72px"></td>`).join('')}</tr>`);
  };
  const rs = $('#cer'); if (rs) rs.onclick = async () => { try { await issueCert(kind, key, s, auto, {}); toast('পোর্টালের হিসাবে ফেরত নেওয়া হয়েছে'); closeModal(); certOpen(kind, s, extra, onPrinted); } catch (e) { toast(errMsg(e), true); } };
  const sv = $('#ces'); if (sv) sv.onclick = async () => { try { const c2 = await save(canEdit ? collect() : null); if (c2) toast('সংরক্ষণ হয়েছে — নম্বর ' + c2.cert_no); closeModal(); } catch (e) { toast(errMsg(e), true); } };
  $('#cef').onsubmit = async (e) => {
    e.preventDefault(); const w = window.open('', '_blank'); if (!w) return toast('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ চালু করুন', true);
    w.document.write('<p style="font:16px sans-serif;padding:24px">সার্টিফিকেট তৈরি হচ্ছে…</p>');
    try {
      const overrides = canEdit ? collect() : null; const c2 = await save(overrides);
      const dd = { ...auto, ...(c2 ? c2.overrides : (overrides || {})) };
      const q = await loadQR().then(() => true).catch(() => false);
      printWindow(kind + ' ' + (s.admission_no || ''), certHtml(kind, s, dd, c2, q), w); closeModal(); if (onPrinted) onPrinted();
    } catch (err) { w.close(); toast(errMsg(err), true); }
  };
}
// the old entry points (profile tabs, mock tab) now go through the editor
function printCertificate(s) { certOpen('hours', s); }
function printTranscript(s) { certOpen('transcript', s); }
function printMockCertificate(s, aid) { certOpen('mock', s, aid); }

// ------------------------------------------------------------------ the A4 sheets
function certVerifyBlock(c, q) {
  if (!c) return '';
  return `<div class="keep" style="display:flex;gap:14px;align-items:center;margin-top:20px;padding:10px 12px;border:1px solid #D8CDB9;border-radius:8px;font-family:'Hind Siliguri',sans-serif">
  ${q ? `<div style="width:88px;height:88px;flex:none">${qrSvg(verifyUrl(c))}</div>` : ''}
  <div style="font-size:12px;line-height:1.65">証明書番号 / Certificate No.: <b style="font:700 14px ui-monospace,monospace">${esc(c.cert_no)}</b><br>確認コード / Verification code: <b style="font:700 14px ui-monospace,monospace;letter-spacing:1px">${esc(c.code)}</b><br>
  真偽の確認 / Verify online: <b>sakura.institute/verify</b> — QRコードを読み取るか、番号とコードを入力してください。<br><span style="color:#6E665A">Scan the QR code, or enter the number and code, to confirm this certificate is genuine.</span></div></div>`;
}
function certFrame(s, c, q, { ja, en, rows, body = '', certify, note = '', framed = false, dense = false, sign = true }) {
  const st = S.settings; const today = todayISO();
  const info = rows ? `<table style="font-family:'Shippori Mincho B1','Hind Siliguri',serif">${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>` : '';
  return `<div class="sheet${dense ? ' dense' : ''}">${headHtml()}
  <div style="padding:${framed ? '28px 32px' : '26px 30px'};font-family:'Shippori Mincho B1',serif;${framed ? 'border:3px double #A3843A;margin:14px' : ''}">
  <div style="text-align:center;margin-bottom:${dense ? 16 : 22}px"><div style="font-size:${framed ? 28 : 26}px;font-weight:800;letter-spacing:6px">${ja}</div><div style="font-size:13px;letter-spacing:2px;color:#6E665A">${en}</div></div>
  ${info}${body}
  ${certify ? `<p style="margin-top:20px;font-size:14px">${certify[0]}<br><span style="font-size:12px;color:#6E665A">${certify[1]}</span></p>` : ''}
  ${sign ? `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:28px;font-size:13.5px;line-height:1.8">
  <div>発行日 / Date of Issue: ${jdate(today)} (${fmtD(today)})<br>${esc(st.institute_ja)} / ${esc(st.institute_en)}<br>所在地 / Address: ${esc(st.address || '')}</div>
  <div style="text-align:center"><div style="width:74px;height:74px;border:1.5px dashed #C8372B;border-radius:50%;margin:0 auto 6px;color:#C8372B;display:grid;place-items:center;font-size:12px">印</div>学院長 ${esc(st.director_ja)}<br>Director ${esc(st.director_en)}</div></div>` : ''}
  ${certVerifyBlock(c, q)}${note ? `<p style="font-size:11px;color:#6E665A;margin-top:12px">${note}</p>` : ''}</div></div>`;
}
const nameRow = (s) => ['氏名 / Name', `<b>${esc(s.name_en || '')}</b>`];
const dobRow = (s) => ['生年月日 / Date of Birth', s.dob ? `${jdate(s.dob)} (${fmtD(s.dob)})` : ''];
const natRow = ['国籍 / Nationality', 'バングラデシュ / Bangladesh'];
const noRow = (s) => ['学籍番号 / Student No.', esc(s.admission_no || '')];
const period = (a, b) => a || b ? `${jdate(a)} 〜 ${jdate(b)}<br><span style="font-size:12px">(${fmtD(a)} to ${fmtD(b)})</span>` : '—';
const pctTxt = (p) => p == null || p === '' ? '—' : esc(p) + '%';

function certHtml(kind, s, d, c, q) {
  const st = S.settings;
  if (kind === 'hours') {
    const lv = Object.entries(d.levels || {}).map(([l, h]) => `<tr><td>${esc(l)}</td><td>${esc(st.textbooks[l] || '')}</td><td style="text-align:right">${esc(h)} 時間</td></tr>`).join('');
    return certFrame(s, c, q, { ja: '日本語学習時間証明書', en: 'CERTIFICATE OF JAPANESE LANGUAGE STUDY HOURS',
      rows: [nameRow(s), dobRow(s), natRow, noRow(s), ['学習期間 / Period of Study', period(d.from, d.to)], ['総学習時間 / Total Study Hours', `<b style="font-size:18px">${esc(d.hours)} 時間 (hours)</b>`], ['出席率 / Attendance Rate', `${pctTxt(d.pct)}${d.total ? ` (${esc(d.came)} / ${esc(d.total)})` : ''}`]],
      body: lv ? `<div style="margin-top:14px;font-size:13px;font-weight:700">内訳 / Breakdown</div><table style="margin-top:6px"><tr><th style="width:auto">レベル / Level</th><th style="width:auto">使用教材 / Textbook</th><th style="width:auto;text-align:right">時間 / Hours</th></tr>${lv}</table>` : '',
      certify: ['上記の者は、当学院において上記の通り日本語を学習したことを証明します。', 'This is to certify that the above-named student has studied Japanese at our institute as stated above.'],
      note: '学習時間は出席記録（出席・遅刻）に基づいて算出しています。 / Hours are calculated from signed attendance records (present and late).' });
  }
  if (kind === 'transcript') {
    const ex = d.exams || [];
    return certFrame(s, c, q, { ja: '成績証明書', en: 'ACADEMIC TRANSCRIPT', dense: true,
      rows: [nameRow(s), dobRow(s), natRow, noRow(s), ['総学習時間 / Study Hours', `${esc(d.hours)} 時間 · 出席率 / Attendance ${pctTxt(d.pct)}`]],
      body: `<table style="margin-top:14px"><tr><th style="width:auto">日付 / Date</th><th style="width:auto">試験 / Examination</th><th style="width:auto">レベル</th><th style="width:auto;text-align:right">得点 / Score</th><th style="width:auto;text-align:right">%</th><th style="width:auto">合否 / Result</th></tr>
      ${ex.map(r => `<tr><td>${fmtD(r.date)}</td><td>${esc(TYPE_JA[r.type] || '')} · <span style="font-size:12px">${esc(r.title)}</span></td><td>${esc(r.level)}</td><td style="text-align:right">${r.absent ? '欠席' : esc(r.marks) + ' / ' + esc(r.max)}</td><td style="text-align:right">${r.pct == null ? '—' : esc(r.pct) + '%'}</td><td>${r.absent ? '欠席 / Absent' : r.pass ? '合格 / Pass' : '不合格 / Fail'}</td></tr>`).join('') || '<tr><td colspan="6">—</td></tr>'}</table>`,
      certify: ['上記の通り相違ないことを証明します。', "We hereby certify that the above is a true record of the student's results at our institute."] });
  }
  if (kind === 'mock') {
    return certFrame(s, c, q, { ja: '模擬試験 合格証', en: 'CERTIFICATE OF PASSING · JAPANESE MOCK TEST', framed: true,
      rows: [['氏名 / Name', `<b>${esc(s.name_en || '')}</b>${s.name_bn ? ' (' + esc(s.name_bn) + ')' : ''}`], noRow(s), ['試験 / Test', `JLPT ${esc(d.level)} 模擬試験 · ${MOCK_CAT[d.category] || ''}<br><span style="font-size:12px">${esc(d.test)}</span>`], ['受験日 / Date taken', `${jdate(d.date)} (${fmtD(d.date)})`], ['得点 / Score', `<b style="font-size:18px">${esc(d.score)} / ${esc(d.total)} (${esc(d.pct)}%)</b> &nbsp; 合格点 / Pass mark ${esc(d.pass_pct)}%`]],
      certify: ['上記の者は、当学院の日本語模擬試験に合格したことを証明します。', 'This is to certify that the above-named student has passed the Japanese mock test of our institute.'],
      note: 'この証明書はオンライン模擬試験の記録に基づいています。 / Based on the student\'s saved online mock test record.' });
  }
  if (kind === 'enrol') {
    return certFrame(s, c, q, { ja: '在籍証明書', en: 'CERTIFICATE OF ENROLLMENT',
      rows: [nameRow(s), dobRow(s), natRow, noRow(s), ['課程 / Course', esc(d.course)], ['在籍期間 / Enrolled since', `${jdate(d.since)} (${fmtD(d.since)}) 〜 ${d.until ? `${jdate(d.until)} (${fmtD(d.until)}) 予定 / expected` : '現在 / present'}`], ['現在のレベル / Current level', esc(d.level)], ['授業時間 / Class schedule', esc(d.schedule)], ['学習時間 / Hours studied', `${esc(d.hours)} 時間 (hours) · 出席率 / Attendance ${pctTxt(d.pct)}`], ['在籍状況 / Status', `<b>${esc(d.status)}</b>`]],
      certify: ['上記の者は、現在当学院に在籍していることを証明します。', 'This is to certify that the above-named student is currently enrolled at our institute.'] });
  }
  if (kind === 'complete') {
    return certFrame(s, c, q, { ja: '修了証明書', en: 'CERTIFICATE OF COMPLETION', framed: true,
      rows: [['氏名 / Name', `<b style="font-size:17px">${esc(s.name_en || '')}</b>`], dobRow(s), noRow(s), ['課程 / Course', `<b>${esc(d.course)}</b>`], ['使用教材 / Textbook', esc(d.textbook)], ['学習期間 / Period', period(d.from, d.to)], ['総学習時間 / Total hours', `<b>${esc(d.hours)} 時間 (hours)</b> · 出席率 / Attendance ${pctTxt(d.pct)}`], ['修了日 / Completed on', `${jdate(d.completed_on)} (${fmtD(d.completed_on)})`], ['結果 / Result', `<b>${esc(d.result)}</b>`]],
      certify: ['上記の者は、当学院所定の課程を修了したことを証明します。', 'This is to certify that the above-named student has completed the course stated above at our institute.'] });
  }
  if (kind === 'attend') {
    const ms = d.months || [];
    return certFrame(s, c, q, { ja: '出席証明書', en: 'CERTIFICATE OF ATTENDANCE', dense: ms.length > 8,
      rows: [nameRow(s), dobRow(s), natRow, noRow(s), ['総出席率 / Overall attendance', `<b>${pctTxt(d.pct)}</b> (${esc(d.came)} / ${esc(d.total)}) · ${esc(d.hours)} 時間 (hours)`]],
      body: `<div style="margin-top:14px;font-size:13px;font-weight:700">月別出席状況 / Monthly attendance</div><table style="margin-top:6px"><tr><th style="width:auto">年月 / Month</th><th style="width:auto;text-align:right">授業日数 / Classes</th><th style="width:auto;text-align:right">出席 / Attended</th><th style="width:auto;text-align:right">欠席 / Absent</th><th style="width:auto;text-align:right">時間 / Hours</th><th style="width:auto;text-align:right">出席率 / Rate</th></tr>
      ${ms.map(m => `<tr><td>${esc(m.m.slice(0, 4))}年${num(m.m.slice(5, 7))}月</td><td style="text-align:right">${esc(m.total)}</td><td style="text-align:right">${esc(m.came)}</td><td style="text-align:right">${esc(m.absent)}</td><td style="text-align:right">${esc(m.hours)}</td><td style="text-align:right">${num(m.total) ? Math.round(num(m.came) * 100 / num(m.total)) + '%' : '—'}</td></tr>`).join('') || '<tr><td colspan="6">—</td></tr>'}</table>`,
      certify: ['上記の通り出席したことを証明します。', 'This is to certify that the above-named student attended classes as stated above.'],
      note: '出席には遅刻を含みます。 / Attended includes late arrivals.' });
  }
  if (kind === 'recommend') {
    return certFrame(s, c, q, { ja: '推薦状', en: 'LETTER OF RECOMMENDATION',
      rows: [nameRow(s), dobRow(s), noRow(s), ['目的 / Purpose', esc(d.purpose)]],
      body: `<div style="margin-top:18px;font-size:15px;line-height:2;white-space:pre-line">${esc(d.text_ja)}</div><div style="margin-top:12px;font-size:13px;line-height:1.75;color:#3E3A33;font-family:'Hind Siliguri',sans-serif;white-space:pre-line">${esc(d.text_en)}</div>` });
  }
  return '';
}

// ------------------------------------------------------------------ the student's certificate page (profile → 🎓 সার্টিফিকেট)
function certListModal(s) {
  const a = attOf(s.id); const levels = LEVELS.filter(l => a.byLevel[l]); if (!levels.length) levels.push(s.current_level || 'N5');
  const items = [['hours'], ['transcript'], ['enrol'], ...levels.map(l => ['complete', l]), ['attend'], ['recommend']];
  const mine = (S.certificates || []).filter(c => c.student_id === s.id).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  openModal(`<h2>🎓 ${esc(studentName(s))}-এর সার্টিফিকেট</h2>
    <p class="small muted" style="margin-top:-4px">একটায় চাপলে তথ্য দেখে, দরকার হলে সংশোধন করে প্রিন্ট করুন। প্রতিটা সার্টিফিকেটের নম্বর একবারই তৈরি হয়, পরে আবার প্রিন্ট করলেও একই নম্বর থাকে আর তথ্য সর্বশেষটা হয়।</p>
    <div style="display:grid;gap:8px;margin:10px 0 16px">${items.map(([k, x]) => { const c = certLive(s.id, certKey(k, x));
      return `<button class="mrow" data-co="${k}" data-cx="${esc(x || '')}" style="display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--card);cursor:pointer;font:inherit;color:inherit">
      <span style="font-size:22px">${{ hours: '⏱', transcript: '📊', enrol: '🏫', complete: '🎓', attend: '📅', recommend: '✉️' }[k]}</span><span style="flex:1;min-width:0"><b>${esc(CERT_KIND[k])}${x ? ' · ' + esc(x) : ''}</b><br><span class="small muted">${esc(CERT_HELP[k] || '')}</span></span>
      <span class="small" style="text-align:right">${c ? `<b style="font-family:ui-monospace,monospace">${esc(c.cert_no)}</b><br>${Object.keys(c.overrides || {}).length ? '<span style="color:#B5651D">✎ সংশোধিত</span>' : '<span class="muted">স্বয়ংক্রিয়</span>'}` : '<span class="muted">নতুন</span>'}</span></button>`; }).join('')}</div>
    ${mine.length ? `<h3 style="margin:0 0 6px;font:700 15px 'Noto Serif Bengali'">জারি করা সব সার্টিফিকেট</h3><div class="tw"><table class="stack"><tr><th>নম্বর</th><th>ধরন</th><th>হালনাগাদ</th><th>অবস্থা</th><th></th></tr>${mine.map(c => `<tr><td data-l="নম্বর"><b style="font-family:ui-monospace,monospace">${esc(c.cert_no)}</b><div class="small muted">কোড ${esc(c.code)}</div></td><td data-l="ধরন">${esc((CERT_KIND[c.kind] || c.kind).replace(/ \(.*\)$/, ''))}${c.key.includes(':') && c.kind === 'complete' ? ' · ' + esc(c.key.split(':')[1]) : ''}</td>
      <td data-l="হালনাগাদ">${fmtD((c.updated_at || c.issued_on || '').slice(0, 10))}<div class="small muted">সংস্করণ ${c.version || 1}</div></td>
      <td data-l="অবস্থা">${c.revoked_at ? badge('dropped', 'বাতিল') + (c.revoked_reason ? `<div class="small muted">${esc(c.revoked_reason)}</div>` : '') : badge('active', 'বৈধ')}</td>
      <td><div class="row" style="gap:6px"><a class="btn sm ghost" target="_blank" rel="noopener" href="${esc(verifyUrl(c))}">যাচাই পাতা</a>${isAdmin() && !c.revoked_at ? `<button class="btn sm ghost" data-rv="${esc(c.id)}" style="color:var(--red)">বাতিল</button>` : ''}</div></td></tr>`).join('')}</table></div>` : ''}`);
  $$('[data-co]').forEach(b => b.onclick = () => { closeModal(); certOpen(b.dataset.co, s, b.dataset.cx || null); });
  $$('[data-rv]').forEach(b => b.onclick = async () => {
    const why = prompt('কেন বাতিল করছেন? (যাচাই পাতায় দেখাবে, যেমন "ভুল তথ্য — নতুন সার্টিফিকেট দেওয়া হয়েছে")', ''); if (why === null) return;
    try {
      const patch = { revoked_at: new Date().toISOString(), revoked_reason: why.trim() };
      if (DEMO) { const rows = Local.read('certificates').map(x => x.id === b.dataset.rv ? { ...x, ...patch } : x); Local.write('certificates', rows); S.certificates = rows; }
      else { const { data, error } = await sb.from('certificates').update(patch).eq('id', b.dataset.rv).select().single(); if (error) throw error; certPut(data); }
      toast('সার্টিফিকেট বাতিল হয়েছে — এরপর প্রিন্ট করলে নতুন নম্বর পাবে'); certListModal(s);
    } catch (e) { toast(errMsg(e), true); }
  });
}
