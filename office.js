/* Sakura Portal · office tools (v46). Loaded after app.js and certs.js (shares their globals).
   1. উত্তর বাকি প্রশ্ন (#/pending)  — questions the office could not answer; the director answers, the office tells the person.
   2. পরীক্ষার রেজিস্ট্রেশন (#/examregs) — who sits JLPT / NAT-TEST / JFT-Basic …, deadlines, registered, admit card, result.
   3. নগদ ও ব্যাংকে জমা (#/cash)    — cash received minus cash banked; a reminder at the limit (default ৫০,০০০৳).
   4. কোর্স সমাপ্তি সনদের যোগ্যতা  — passed a real JLPT/NAT (or another outside exam recorded here), or a full mock test. */

const OFFICE_TABLES = ['office_questions', 'exam_regs', 'cash_deposits'];
const XR_EXAM = { jlpt: 'JLPT', nat: 'NAT-TEST', jft: 'JFT-Basic', jtest: 'J.TEST', topj: 'TOP J', other: 'অন্যান্য' };
const XR_ST = { planned: 'রেজিস্ট্রেশন বাকি', registered: 'রেজিস্ট্রেশন হয়েছে', admit: 'অ্যাডমিট কার্ড পেয়েছে', done: 'পরীক্ষা দিয়েছে', missed: 'মিস করেছে' };
const XR_ST_CLS = { planned: 'trial', registered: 'completed', admit: 'completed', done: 'active', missed: 'dropped' };
const XR_RES = { '': '—', pass: 'পাস', fail: 'ফেল', absent: 'অনুপস্থিত' };
const cashLimit = () => num(S.settings.cash_limit) || 50000;
const tblReady = (t) => Array.isArray(S[t]);
const notReady = () => `<div class="card" style="border-left:4px solid var(--red)">এই অংশ চালু করতে ডেটাবেসে একবার <b>supabase-migration-v46.sql</b> চালাতে হবে। পরিচালককে জানান।</div>`;
const isoDiff = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
const oIsoAdd = (iso, days) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const meName = () => (S.profile && S.profile.name) || '';

// ------------------------------------------------------------------ 1. pending questions
function pqState(x) { return x.told_at ? 'done' : x.answered_at ? 'answered' : 'open'; }
function viewPending(q) {
  if (!tblReady('office_questions')) return mount('#/pending', `<div class="top"><div><h1>উত্তর বাকি প্রশ্ন</h1></div></div>${notReady()}`);
  const tab = ['open', 'answered', 'done'].includes(q.get('t')) ? q.get('t') : 'open';
  const all = S.office_questions.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const by = { open: all.filter(x => pqState(x) === 'open'), answered: all.filter(x => pqState(x) === 'answered'), done: all.filter(x => pqState(x) === 'done') };
  const list = tab === 'done' ? by.done : by[tab].slice().sort((a, b) => String(a.promise_by || '9').localeCompare(String(b.promise_by || '9')));
  const today = todayISO();
  mount('#/pending', `
  <div class="top"><div><h1>উত্তর বাকি প্রশ্ন</h1><p>অফিসে বা ফোনে কেউ এমন কিছু জানতে চাইলে যার উত্তর আপনি নিশ্চিত জানেন না, এখানে লিখুন। পরিচালক উত্তর দেবেন, আপনি কথা দেওয়া সময়ের মধ্যে জানিয়ে "জানানো হয়েছে" দেবেন।</p></div><button class="btn" id="pqadd">+ নতুন প্রশ্ন</button></div>
  <div class="tabs"><button data-pq="open" class="${tab === 'open' ? 'on' : ''}">উত্তর বাকি (${by.open.length})</button><button data-pq="answered" class="${tab === 'answered' ? 'on' : ''}">উত্তর এসেছে, জানানো বাকি (${by.answered.length})</button><button data-pq="done" class="${tab === 'done' ? 'on' : ''}">শেষ হয়েছে (${by.done.length})</button></div>
  ${list.length ? `<div class="tw"><table class="stack"><tr><th>কে</th><th>প্রশ্ন</th><th>জানানোর কথা</th><th>উত্তর</th></tr>${list.map(x => { const late = !x.told_at && x.promise_by && x.promise_by < today;
    return `<tr class="click" data-pqo="${x.id}"><td data-l="কে"><b>${esc(x.person || (byId(S.students, x.student_id) ? studentName(byId(S.students, x.student_id)) : '—'))}</b><div class="small muted">${esc(x.phone || '')} · ${fmtD(x.asked_on)}</div></td>
      <td data-l="প্রশ্ন">${esc(x.question)}${x.context ? `<div class="small muted">${esc(x.context)}</div>` : ''}</td>
      <td data-l="জানানোর কথা">${x.promise_by ? `<span style="${late ? 'color:var(--red);font-weight:700' : ''}">${fmtD(x.promise_by)}${late ? ' · দেরি' : ''}</span>` : '—'}</td>
      <td data-l="উত্তর">${x.answer ? esc(x.answer.slice(0, 120)) + (x.answer.length > 120 ? '…' : '') : '<span class="muted">—</span>'}${x.told_at ? `<div class="small muted">জানানো হয়েছে ${fmtDT(x.told_at)}</div>` : ''}</td></tr>`; }).join('')}</table></div>`
    : `<div class="card"><div class="empty">${tab === 'open' ? 'উত্তর বাকি কোনো প্রশ্ন নেই 🎉' : 'এখানে এখনো কিছু নেই'}</div></div>`}`, () => {
    $$('[data-pq]').forEach(b => b.onclick = () => { location.hash = '#/pending' + (b.dataset.pq === 'open' ? '' : '?t=' + b.dataset.pq); });
    $('#pqadd').onclick = () => pendingModal(null);
    $$('[data-pqo]').forEach(r => r.onclick = () => pendingModal(byId(S.office_questions, r.dataset.pqo)));
  });
}
function pendingModal(x, preset = {}) {
  if (!tblReady('office_questions')) return toast('আগে ডেটাবেস আপডেট (v46) চালাতে হবে', true);
  const v = x || { asked_on: todayISO(), promise_by: oIsoAdd(todayISO(), 1), ...preset };
  const studs = S.students.slice().sort((a, b) => (a.admission_no || '').localeCompare(b.admission_no || ''));
  const st = x ? pqState(x) : 'new'; const canAnswer = isAdmin();
  openModal(`<h2>${x ? 'প্রশ্ন' : 'নতুন উত্তর বাকি প্রশ্ন'}</h2><form class="form" id="pqf">
    <label class="f">কে জানতে চেয়েছে (নাম)<input name="person" value="${esc(v.person || '')}" placeholder="যেমন: করিম (আগ্রহী ছাত্র)"></label>
    <label class="f">ফোন / WhatsApp<input name="phone" type="tel" value="${esc(v.phone || '')}"></label>
    <label class="f full">ভর্তি হওয়া ছাত্র হলে বেছে নিন (ঐচ্ছিক)<select name="student_id"><option value="">—</option>${studs.map(s => `<option value="${s.id}" ${s.id === v.student_id ? 'selected' : ''}>${esc(s.admission_no || '')} · ${esc(studentName(s))}</option>`).join('')}</select></label>
    <label class="f full">প্রশ্ন (হুবহু)<textarea name="question" rows="2" required ${x && !isAdmin() && st !== 'open' ? 'readonly' : ''}>${esc(v.question || '')}</textarea></label>
    <label class="f full">প্রেক্ষাপট (পরিচালক যাতে ঠিক উত্তর দিতে পারেন)<input name="context" value="${esc(v.context || '')}" placeholder="যেমন: HSC ২০২৪, বাবার ব্যবসা, এপ্রিল সেশন"></label>
    <label class="f">কবে জানানোর কথা দিয়েছেন<input name="promise_by" type="date" value="${esc(v.promise_by || '')}"></label>
    <label class="f">কবে জিজ্ঞেস করেছে<input name="asked_on" type="date" value="${esc(v.asked_on || todayISO())}"></label>
    ${x ? `<label class="f full">পরিচালকের উত্তর${canAnswer ? '' : ' (পরিচালক লিখবেন)'}<textarea name="answer" rows="3" ${canAnswer ? '' : 'readonly'} placeholder="${canAnswer ? 'উত্তর লিখুন — অফিস এটা ব্যক্তিকে জানাবে' : 'এখনো উত্তর আসেনি'}">${esc(v.answer || '')}</textarea>${x.answered_at ? `<span class="small muted">${esc(x.answered_by || '')} · ${fmtDT(x.answered_at)}</span>` : ''}</label>` : ''}
    ${x && x.told_at ? `<p class="full small">✓ জানানো হয়েছে ${fmtDT(x.told_at)} ${x.told_by ? '· ' + esc(x.told_by) : ''}</p>` : ''}
    <div class="full row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap">
      ${x && isAdmin() ? '<button type="button" class="btn ghost" id="pqdel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}
      ${x && x.answer && !x.told_at && waNum(x.phone || (byId(S.students, x.student_id) || {}).phone || '') ? '<button type="button" class="btn ghost" id="pqwa">WhatsApp-এ উত্তর পাঠান</button>' : ''}
      ${x && x.answered_at && !x.told_at ? '<button type="button" class="btn ghost" id="pqtold">✓ জানানো হয়েছে</button>' : ''}
      <button type="button" class="btn ghost" id="pqc">বন্ধ</button><button class="btn">সংরক্ষণ</button></div></form>`);
  $('#pqc').onclick = closeModal;
  const saveRow = async (d) => { const row = x ? await API.update('office_questions', x.id, d) : await API.insert('office_questions', d); putLocal('office_questions', row); return row; };
  $('#pqf').onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target); d.student_id = d.student_id || null; d.promise_by = d.promise_by || null;
    if (!d.person && !d.student_id) return toast('কে জানতে চেয়েছে লিখুন', true);
    if (!x && v.inquiry_id) d.inquiry_id = v.inquiry_id;
    if (x && canAnswer) { const a = String(d.answer || '').trim(); d.answer = a; if (a && a !== (x.answer || '')) { d.answered_at = new Date().toISOString(); d.answered_by = meName(); } if (!a) { d.answered_at = null; d.answered_by = ''; } } else delete d.answer;
    try { await saveRow(d); closeModal(); toast('সংরক্ষণ হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); }
  };
  const told = $('#pqtold'); if (told) told.onclick = async () => { try { await saveRow({ told_at: new Date().toISOString(), told_by: meName() }); closeModal(); toast('শেষ তালিকায় গেছে'); render(); } catch (err) { toast(errMsg(err), true); } };
  const wa = $('#pqwa'); if (wa) wa.onclick = () => { const n = waNum(x.phone || (byId(S.students, x.student_id) || {}).phone || '');
    const txt = `আসসালামু আলাইকুম${x.person ? ' ' + x.person : ''}। ${S.settings.institute_bn || 'সাকুরা জাপানিজ ইনস্টিটিউট'} থেকে বলছি। আপনি জানতে চেয়েছিলেন: "${x.question}"\n\nআমাদের পরিচালকের সাথে কথা বলে জেনেছি: ${x.answer}\n\nআরও কিছু জানার থাকলে অফিসে চলে আসুন বা এই নম্বরে লিখুন। ধন্যবাদ।`;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener'); };
  const del = $('#pqdel'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('প্রশ্নটা মুছে যাবে।'))) return; try { await API.remove('office_questions', x.id); S.office_questions = S.office_questions.filter(y => y.id !== x.id); render(); } catch (err) { toast(errMsg(err), true); } };
}

// ------------------------------------------------------------------ 2. exam registrations
function viewExamRegs(q) {
  if (!tblReady('exam_regs')) return mount('#/examregs', `<div class="top"><div><h1>পরীক্ষার রেজিস্ট্রেশন</h1></div></div>${notReady()}`);
  const tab = q.get('t') === 'past' ? 'past' : 'now'; const today = todayISO();
  const rows = S.exam_regs.slice();
  const now = rows.filter(r => !['done', 'missed'].includes(r.status)).sort((a, b) => String(a.reg_deadline || a.exam_date || '9').localeCompare(String(b.reg_deadline || b.exam_date || '9')));
  const past = rows.filter(r => ['done', 'missed'].includes(r.status)).sort((a, b) => String(b.exam_date || '').localeCompare(String(a.exam_date || '')));
  const list = tab === 'now' ? now : past;
  const soon = now.filter(r => r.status === 'planned' && r.reg_deadline && isoDiff(r.reg_deadline, today) <= 7);
  const st = S.settings;
  mount('#/examregs', `
  <div class="top"><div><h1>পরীক্ষার রেজিস্ট্রেশন</h1><p>কোন ছাত্র কোন বাইরের পরীক্ষা (JLPT, NAT-TEST, JFT-Basic …) দেবে, রেজিস্ট্রেশনের শেষ তারিখ, ফি, অ্যাডমিট কার্ড আর ফল — এক জায়গায়। শেষ তারিখের ৭ দিন আগে থেকে ড্যাশবোর্ডে মনে করিয়ে দেবে।</p></div><button class="btn" id="xradd">+ যোগ করুন</button></div>
  <div class="grid g4" style="margin-bottom:12px"><div class="card stat"><div class="l">চলমান</div><div class="v">${now.length}</div></div><div class="card stat ${soon.length ? 'red' : ''}"><div class="l">৭ দিনের মধ্যে শেষ তারিখ, রেজিস্ট্রেশন বাকি</div><div class="v">${soon.length}</div></div><div class="card stat"><div class="l">পরের JLPT</div><div class="v" style="font-size:18px">${st.jlpt_date ? fmtD(st.jlpt_date) : '—'}</div></div><div class="card stat"><div class="l">পরের NAT-TEST</div><div class="v" style="font-size:18px">${st.nat_date ? fmtD(st.nat_date) : '—'}</div></div></div>
  <div class="card" style="margin-bottom:12px;padding:10px 14px"><span class="small">খবর দেখুন: <a href="https://juaabjlpt-bd.org/" target="_blank" rel="noopener">JLPT (JUAAB)</a> · <a href="https://ulsai.com.bd/nat-test" target="_blank" rel="noopener">NAT-TEST</a> · <a href="https://www.jpf.go.jp/jft-basic/e/" target="_blank" rel="noopener">JFT-Basic</a> · <a href="https://www.prometric-jp.com/en/ssw/" target="_blank" rel="noopener">SSW দক্ষতা পরীক্ষা</a></span></div>
  <div class="tabs"><button data-xt="now" class="${tab === 'now' ? 'on' : ''}">চলমান (${now.length})</button><button data-xt="past" class="${tab === 'past' ? 'on' : ''}">শেষ হয়েছে (${past.length})</button></div>
  ${list.length ? `<div class="tw"><table class="stack"><tr><th>ছাত্র</th><th>পরীক্ষা</th><th>রেজিস্ট্রেশনের শেষ</th><th>পরীক্ষার দিন</th><th>অবস্থা</th><th>ফি</th><th>ফলাফল</th></tr>${list.map(r => { const s = byId(S.students, r.student_id) || {}; const dl = r.reg_deadline ? isoDiff(r.reg_deadline, today) : null; const hot = r.status === 'planned' && dl != null && dl <= 7;
    return `<tr class="click" data-xr="${r.id}"><td data-l="ছাত্র"><b>${esc(studentName(s))}</b><div class="small muted">${esc(s.admission_no || '')}</div></td><td data-l="পরীক্ষা">${esc(XR_EXAM[r.exam] || r.exam)} ${esc(r.level || '')}</td>
      <td data-l="রেজিস্ট্রেশনের শেষ">${r.reg_deadline ? `<span style="${hot ? 'color:var(--red);font-weight:700' : ''}">${fmtD(r.reg_deadline)}${hot ? (dl < 0 ? ' · পার হয়ে গেছে' : dl === 0 ? ' · আজই' : ` · ${dl} দিন বাকি`) : ''}</span>` : '—'}</td>
      <td data-l="পরীক্ষার দিন">${r.exam_date ? fmtD(r.exam_date) : '—'}</td><td data-l="অবস্থা">${badge(XR_ST_CLS[r.status] || '', XR_ST[r.status] || r.status)}</td><td data-l="ফি">${r.fee_paid ? '✓' : '<span class="muted">বাকি</span>'}</td><td data-l="ফলাফল">${esc(XR_RES[r.result || ''])}${r.score ? ` <span class="small muted">${esc(r.score)}</span>` : ''}</td></tr>`; }).join('')}</table></div>`
    : `<div class="card"><div class="empty">${tab === 'now' ? 'এখনো কাউকে যোগ করা হয়নি। পরীক্ষার রেজিস্ট্রেশন খুললে যারা দেবে তাদের এখানে যোগ করুন।' : 'এখনো কিছু নেই'}</div></div>`}`, () => {
    $$('[data-xt]').forEach(b => b.onclick = () => { location.hash = '#/examregs' + (b.dataset.xt === 'past' ? '?t=past' : ''); });
    $('#xradd').onclick = () => examRegModal(null);
    $$('[data-xr]').forEach(r => r.onclick = () => examRegModal(byId(S.exam_regs, r.dataset.xr)));
  });
}
function examRegModal(r, studentId = null) {
  if (!tblReady('exam_regs')) return toast('আগে ডেটাবেস আপডেট (v46) চালাতে হবে', true);
  const v = r || { exam: 'nat', level: 'N5', status: 'planned', student_id: studentId, exam_date: S.settings.nat_date || '' };
  const studs = S.students.filter(s => s.status !== 'dropped' || (r && s.id === r.student_id)).sort((a, b) => (a.admission_no || '').localeCompare(b.admission_no || ''));
  const sel = (name, opts) => `<select name="${name}">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${String(v[name] || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  openModal(`<h2>${r ? 'পরীক্ষার রেজিস্ট্রেশন' : 'পরীক্ষায় ছাত্র যোগ'}</h2><form class="form" id="xrf">
    ${r ? `<label class="f full">ছাত্র<input value="${esc(studentName(byId(S.students, r.student_id) || {}))}" readonly></label>` : `<label class="f full">ছাত্র (একসাথে কয়েকজন বাছতে Ctrl/⌘ চেপে ধরুন)<select name="student_ids" multiple size="6" required>${studs.map(s => `<option value="${s.id}" ${s.id === studentId ? 'selected' : ''}>${esc(s.admission_no || '')} · ${esc(studentName(s))} · ${esc(s.current_level || '')}</option>`).join('')}</select></label>`}
    <label class="f">পরীক্ষা${sel('exam', XR_EXAM)}</label>
    <label class="f">লেভেল<input name="level" value="${esc(v.level || '')}" placeholder="যেমন N5 / লেভেল ৫ / A2"></label>
    <label class="f">রেজিস্ট্রেশনের শেষ তারিখ<input name="reg_deadline" type="date" value="${esc(v.reg_deadline || '')}"></label>
    <label class="f">পরীক্ষার তারিখ<input name="exam_date" type="date" value="${esc(v.exam_date || '')}"></label>
    <label class="f">অবস্থা${sel('status', XR_ST)}</label>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-top:22px"><input type="checkbox" name="fee_paid" ${v.fee_paid ? 'checked' : ''} style="width:auto"> পরীক্ষার ফি দেওয়া হয়েছে</label>
    ${r ? `<label class="f">ফলাফল${sel('result', XR_RES)}</label><label class="f">স্কোর / নম্বর<input name="score" value="${esc(v.score || '')}" placeholder="যেমন 112/180"></label>` : ''}
    <label class="f full">নোট<input name="note" value="${esc(v.note || '')}" placeholder="যেমন: রেজিস্ট্রেশন নং, কেন্দ্র"></label>
    <div class="full row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap">${r && isAdmin() ? '<button type="button" class="btn ghost" id="xrdel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}
      ${r && r.status === 'planned' && waNum((byId(S.students, r.student_id) || {}).phone || '') ? '<button type="button" class="btn ghost" id="xrwa">WhatsApp-এ মনে করিয়ে দিন</button>' : ''}
      <button type="button" class="btn ghost" id="xrc">বন্ধ</button><button class="btn">সংরক্ষণ</button></div></form>`);
  $('#xrc').onclick = closeModal;
  $('#xrf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const d = formData(f); d.fee_paid = !!f.fee_paid.checked; d.reg_deadline = d.reg_deadline || null; d.exam_date = d.exam_date || null;
    if (d.result === undefined) delete d.result;
    try {
      if (r) { putLocal('exam_regs', await API.update('exam_regs', r.id, d)); }
      else { const ids = [...f.student_ids.selectedOptions].map(o => o.value); delete d.student_ids; if (!ids.length) return toast('অন্তত একজন ছাত্র বাছুন', true);
        for (const sid of ids) putLocal('exam_regs', await API.insert('exam_regs', { ...d, student_id: sid })); }
      closeModal(); toast('সংরক্ষণ হয়েছে'); render();
    } catch (err) { toast(errMsg(err), true); }
  };
  const wa = $('#xrwa'); if (wa) wa.onclick = () => { const s = byId(S.students, r.student_id) || {};
    const txt = `আসসালামু আলাইকুম ${studentName(s)}। ${S.settings.institute_bn || 'সাকুরা জাপানিজ ইনস্টিটিউট'} থেকে বলছি। ${XR_EXAM[r.exam] || ''} ${r.level || ''} পরীক্ষার রেজিস্ট্রেশন${r.reg_deadline ? `-এর শেষ দিন ${fmtD(r.reg_deadline)}` : ' চলছে'}${r.exam_date ? `, পরীক্ষা ${fmtD(r.exam_date)}` : ''}। আপনার এখনো রেজিস্ট্রেশন হয়নি। আসন সীমিত, তাই আজ বা কাল পাসপোর্ট/NID আর একটা ছবি নিয়ে অফিসে চলে আসুন, আমরা রেজিস্ট্রেশন করিয়ে দেব।`;
    window.open(`https://wa.me/${waNum(s.phone)}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener'); };
  const del = $('#xrdel'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('এই রেজিস্ট্রেশনের তথ্য মুছে যাবে।'))) return; try { await API.remove('exam_regs', r.id); S.exam_regs = S.exam_regs.filter(y => y.id !== r.id); render(); } catch (err) { toast(errMsg(err), true); } };
}

// ------------------------------------------------------------------ 3. cash in the office
function cashOnHand() {
  const inCash = S.payments.filter(p => (p.method || 'cash') === 'cash').reduce((a, p) => a + num(p.amount), 0);
  const banked = (S.cash_deposits || []).reduce((a, d) => a + num(d.amount), 0);
  const spent = (S.expenses || []).filter(x => (x.method || 'cash') === 'cash').reduce((a, x) => a + num(x.amount), 0);
  return { inCash, banked, spent, onHand: Math.max(0, inCash - banked - spent) };
}
function viewCash() {
  if (!tblReady('cash_deposits')) return mount('#/cash', `<div class="top"><div><h1>নগদ ও ব্যাংকে জমা</h1></div></div>${notReady()}`);
  const c = cashOnHand(); const lim = cashLimit(); const over = c.onHand >= lim;
  const deps = S.cash_deposits.slice().sort((a, b) => String(b.deposited_on).localeCompare(String(a.deposited_on)));
  mount('#/cash', `
  <div class="top"><div><h1>নগদ ও ব্যাংকে জমা</h1><p>ক্যাশে নেওয়া সব ফি থেকে ব্যাংকে জমা${isAdmin() ? ' আর ক্যাশ খরচ' : ''} বাদ দিলে অফিসে কত নগদ থাকার কথা, সেটা এখানে। ${tk(lim)} হলেই ব্যাংকে জমা দিন।</p></div><button class="btn" id="cdadd">+ ব্যাংকে জমা</button></div>
  <div class="grid g4" style="margin-bottom:14px"><div class="card stat ${over ? 'red' : 'green'}"><div class="l">অফিসে নগদ থাকার কথা</div><div class="v">${tk(c.onHand)}</div><div class="s">${over ? 'ব্যাংকে জমা দেওয়ার সময় হয়েছে' : `সীমা ${tk(lim)}`}</div></div>
  <div class="card stat"><div class="l">মোট ক্যাশে নেওয়া ফি</div><div class="v">${tk(c.inCash)}</div></div><div class="card stat"><div class="l">মোট ব্যাংকে জমা</div><div class="v">${tk(c.banked)}</div></div>${isAdmin() ? `<div class="card stat"><div class="l">ক্যাশ খরচ</div><div class="v">${tk(c.spent)}</div></div>` : ''}</div>
  ${!isAdmin() ? '<p class="small muted">অফিসের ছোটখাটো খরচ খাতায় লিখে রাখুন; পরিচালক হিসাব মিলিয়ে নেবেন। গুনে দেখা নগদের সাথে না মিললে পরিচালককে জানান।</p>' : ''}
  ${deps.length ? `<div class="tw"><table class="stack"><tr><th>তারিখ</th><th class="num">টাকা</th><th>ব্যাংক</th><th>নোট</th></tr>${deps.map(d => `<tr class="click" data-cd="${d.id}"><td data-l="তারিখ">${fmtD(d.deposited_on)}</td><td data-l="টাকা" class="num"><b>${tk(d.amount)}</b></td><td data-l="ব্যাংক">${esc(d.bank || '—')}</td><td data-l="নোট">${esc(d.note || '')}</td></tr>`).join('')}</table></div>` : '<div class="card"><div class="empty">এখনো কোনো জমা নেই</div></div>'}`, () => {
    $('#cdadd').onclick = () => depositModal(null);
    $$('[data-cd]').forEach(r => r.onclick = () => depositModal(byId(S.cash_deposits, r.dataset.cd)));
  });
}
function depositModal(d) {
  if (!tblReady('cash_deposits')) return toast('আগে ডেটাবেস আপডেট (v46) চালাতে হবে', true);
  const v = d || { deposited_on: todayISO(), amount: cashOnHand().onHand || '' }; const ro = d && !isAdmin();
  openModal(`<h2>${d ? 'ব্যাংকে জমা' : 'ব্যাংকে জমা দিলাম'}</h2><form class="form" id="cdf">
    <label class="f">তারিখ<input name="deposited_on" type="date" required value="${esc(v.deposited_on)}" ${ro ? 'readonly' : ''}></label>
    <label class="f">টাকা (৳)<input name="amount" type="number" min="1" step="1" required value="${esc(v.amount)}" ${ro ? 'readonly' : ''}></label>
    <label class="f full">ব্যাংক ও শাখা<input name="bank" value="${esc(v.bank || '')}" ${ro ? 'readonly' : ''}></label>
    <label class="f full">নোট (জমা রসিদ নং ইত্যাদি)<input name="note" value="${esc(v.note || '')}" ${ro ? 'readonly' : ''}></label>
    ${!d ? '<p class="full small muted" style="margin:0">জমার রসিদের ছবি সেদিনই পরিচালকের WhatsApp-এ পাঠান। জমা সংরক্ষণের পর বদলাতে পারবেন শুধু পরিচালক।</p>' : ''}
    <div class="full row" style="justify-content:flex-end;gap:8px">${d && isAdmin() ? '<button type="button" class="btn ghost" id="cddel" style="color:var(--red);margin-right:auto">মুছুন</button>' : ''}<button type="button" class="btn ghost" id="cdc">বন্ধ</button>${ro ? '' : '<button class="btn">সংরক্ষণ</button>'}</div></form>`);
  $('#cdc').onclick = closeModal;
  $('#cdf').onsubmit = async (e) => { e.preventDefault(); const x = formData(e.target); x.amount = Math.round(num(x.amount));
    try { putLocal('cash_deposits', d ? await API.update('cash_deposits', d.id, x) : await API.insert('cash_deposits', x)); closeModal(); toast('সংরক্ষণ হয়েছে'); render(); } catch (err) { toast(errMsg(err), true); } };
  const del = $('#cddel'); if (del) del.onclick = async () => { closeModal(); if (!(await confirmBox('এই জমার তথ্য মুছে যাবে।'))) return; try { await API.remove('cash_deposits', d.id); S.cash_deposits = S.cash_deposits.filter(y => y.id !== d.id); render(); } catch (err) { toast(errMsg(err), true); } };
}

// ------------------------------------------------------------------ 4. who has earned a course completion certificate
// a real JLPT/NAT result (exams of type jlpt/nat at that level, marks ≥ pass), an outside exam marked pass in exam_regs,
// or a full mock test passed (online full mock ≥ its pass %, or an offline mock exam ≥ pass marks)
function completeBasis(s, level) {
  const out = [];
  (S.exam_results || []).filter(r => r.student_id === s.id && !r.absent && r.marks != null).forEach(r => { const ex = byId(S.exams, r.exam_id); if (!ex || ex.level !== level) return;
    const pass = ex.pass_marks != null ? num(r.marks) >= num(ex.pass_marks) : (pctOf(r, ex) || 0) >= 60;
    if (pass && (ex.type === 'jlpt' || ex.type === 'nat')) out.push(`${ex.type === 'jlpt' ? 'JLPT' : 'NAT-TEST'} ${level} পাস`);
    else if (pass && ex.type === 'mock') out.push(`মক টেস্ট পাস (${ex.title || fmtD(ex.exam_date)})`); });
  (S.exam_regs || []).filter(r => r.student_id === s.id && r.result === 'pass' && (!r.level || String(r.level).toUpperCase().includes(level) || (r.exam !== 'jlpt' && r.exam !== 'nat'))).forEach(r => out.push(`${XR_EXAM[r.exam] || r.exam} ${r.level || ''} পাস`.trim()));
  (S.mock_attempts || []).filter(a => a.student_id === s.id && a.submitted_at && a.total).forEach(a => { const t = byId(S.mock_tests || [], a.test_id); if (!t || t.level !== level || (t.category && t.category !== 'full')) return;
    if (Math.round(num(a.score) * 100 / num(a.total)) >= num(t.pass_pct || 60)) out.push(`পূর্ণ মক টেস্ট পাস (${t.title})`); });
  return [...new Set(out)];
}
function completeDue() {
  const out = [];
  S.students.filter(s => s.status !== 'dropped').forEach(s => LEVELS.forEach(l => { const b = completeBasis(s, l);
    if (b.length && typeof certLive === 'function' && !certLive(s.id, certKey('complete', l))) out.push({ s, level: l, basis: b }); }));
  return out;
}

// ------------------------------------------------------------------ dashboard reminders (called from needsYouItems)
function officeNeeds(it) {
  if (isTeacher()) return;
  const today = todayISO();
  if (tblReady('office_questions')) {
    const open = S.office_questions.filter(x => pqState(x) === 'open'), ans = S.office_questions.filter(x => pqState(x) === 'answered');
    if (isAdmin() && open.length) it.push({ ic: '❓', t: `${open.length}টি প্রশ্নের উত্তর দিতে হবে`, s: open.slice(0, 2).map(x => x.question.slice(0, 40)).join(' · '), go: '#/pending' });
    if (ans.length) it.push({ ic: '📨', t: `${ans.length}টি উত্তর ব্যক্তিকে জানানো বাকি`, s: ans.slice(0, 2).map(x => x.person || '').filter(Boolean).join(', ') || 'উত্তর এসেছে', go: '#/pending?t=answered' });
    const late = open.filter(x => x.promise_by && x.promise_by < today); if (late.length && !isAdmin()) it.push({ ic: '⏰', t: `${late.length}টি প্রশ্নে কথা দেওয়া সময় পার হয়েছে`, s: 'পরিচালককে মনে করিয়ে দিন, আর ব্যক্তিকে জানান যে আরেকটু সময় লাগবে', go: '#/pending', warn: true });
  }
  if (tblReady('exam_regs')) {
    const soon = S.exam_regs.filter(r => r.status === 'planned' && r.reg_deadline && isoDiff(r.reg_deadline, today) <= 7);
    if (soon.length) { const first = soon.slice().sort((a, b) => a.reg_deadline.localeCompare(b.reg_deadline))[0];
      it.push({ ic: '📝', t: `${soon.length} জনের পরীক্ষার রেজিস্ট্রেশন বাকি`, s: `শেষ তারিখ ${fmtD(first.reg_deadline)} · ${XR_EXAM[first.exam] || ''}`, go: '#/examregs', warn: isoDiff(first.reg_deadline, today) <= 2 }); }
  }
  if (tblReady('cash_deposits')) { const c = cashOnHand(); if (c.onHand >= cashLimit()) it.push({ ic: '🏦', t: `অফিসে নগদ ${tk(c.onHand)}`, s: `${tk(cashLimit())} ছাড়িয়েছে — ব্যাংকে জমা দিন`, go: '#/cash', warn: true }); }
  const cd = completeDue(); if (cd.length) it.push({ ic: '🎓', t: `${cd.length}টি কোর্স সমাপ্তি সনদ দেওয়া যায়`, s: cd.slice(0, 2).map(x => `${studentName(x.s)} ${x.level}: ${x.basis[0]}`).join(' · '), go: `#/student/${cd[0].s.id}` });
}
