// Sakura Portal · JLPT-style listening player (shared by the office portal and the student site).
// Reads a listening script line by line: the woman's lines in a woman's voice, the man's in a man's voice, short pauses between.
// Uses the best Japanese voice the device has (natural / online voices first).
(function () {
  const has = typeof window !== 'undefined' && 'speechSynthesis' in window;
  let RUN = 0; // bumps on every new play so an old one stops scheduling
  const FEMALE = /nanami|kyoko|o-?ren|haruka|ayumi|sayaka|mizuki|aoi|shiori|female|女性/i;
  const MALE = /keita|otoya|ichiro|daichi|naoki|hattori|takumi|kenji|male|男性/i;
  const score = (v) => (/natural|neural|online|premium|enhanced|wavenet/i.test(v.name) ? 10 : 0) + (/google/i.test(v.name) ? 4 : 0) + (v.localService ? 0 : 1);
  function voices() {
    if (!has) return { f: null, m: null, any: false };
    const ja = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang)).sort((a, b) => score(b) - score(a));
    const f = ja.find(v => FEMALE.test(v.name)) || ja.find(v => !MALE.test(v.name)) || ja[0] || null;
    const m = ja.find(v => MALE.test(v.name)) || null;
    return { f, m, any: ja.length > 0 };
  }
  if (has) { speechSynthesis.getVoices(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices()); }
  // {漢字|かんじ} → かんじ, so the voice reads the word the way the furigana says
  const kana = (s) => String(s || '').replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2');
  function chime(ctx) {
    try {
      const ac = ctx || new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [660, 0.32]].forEach(([hz, t]) => {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.5);
        o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.55);
      });
    } catch (_) { /* no sound card or blocked */ }
  }
  // split the script into [{who:'f'|'m'|'n', text}] — n is the narrator (lines without a speaker)
  function parse(script) {
    const lines = String(script || '').split('\n').map(l => l.trim()).filter(Boolean); const out = []; const who = {}; let alt = 0;
    for (const l of lines) {
      const m = /^([^：:\s]{1,8})[：:]\s*(.*)$/.exec(l);
      if (!m) { out.push({ who: 'n', text: kana(l) }); continue; }
      const sp = m[1]; let g = who[sp];
      if (!g) { g = /女|母|妻|姉|妹|おばあ/.test(sp) ? 'f' : /男|父|夫|兄|弟|おじい|ぼく/.test(sp) ? 'm' : null;
        if (!g) { const used = new Set(Object.values(who)); g = !used.has('m') ? 'm' : !used.has('f') ? 'f' : (alt++ % 2 ? 'f' : 'm'); }
        who[sp] = g; }
      out.push({ who: g, text: kana(m[2]) });
    }
    return out;
  }
  // ---- pre-made VOICEVOX clips (voice/<hash>.mp3): same voices on every phone; the device voice is only the fallback
  const VBASE = (() => { try { return new URL('voice/', document.currentScript.src).href; } catch (_) { return 'voice/'; } })();
  const VID = { n: 8, f: 14, m: 11 };   // 春日部つむぎ (narration), 冥鳴ひまり (woman), 玄野武宏 (man)
  let IDX = null, AUD = null;
  try { fetch(VBASE + 'index.json').then(r => r.ok ? r.json() : []).then(j => { IDX = new Set(j); }).catch(() => {}); } catch (_) { /* offline */ }
  const fnv = (s, h) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const hkey = (text, v) => { const s = text + '|' + v; const r = s.split('').reverse().join(''); return fnv(s, 2166136261).toString(16).padStart(8, '0') + fnv(r, 2166136261).toString(16).padStart(8, '0'); };
  function clipPlay(parts, onEnd) {
    if (!IDX || !parts.length) return false;
    const keys = parts.map(p => hkey(p.text, VID[p.who] || 8)); if (!keys.every(k => IDX.has(k))) return false;
    stop(); const run = RUN; let i = 0;
    const next = () => { if (run !== RUN) return; const k = keys[i++]; if (!k) { AUD = null; if (onEnd) onEnd(); return; }
      const a = new Audio(VBASE + k + '.mp3'); AUD = a; a.onended = () => setTimeout(next, i < keys.length ? 380 : 0); a.onerror = () => setTimeout(next, 50);
      const pr = a.play(); if (pr && pr.catch) pr.catch(() => { if (i === 1 && run === RUN) { AUD = null; fallback(parts, onEnd); } }); };
    next(); return true;
  }
  let fallback = () => {};
  const clip = (text, onEnd) => clipPlay(parse(text), onEnd);
  function stop() { RUN++; if (AUD) { try { AUD.pause(); } catch (_) { /* gone */ } AUD = null; } if (has) speechSynthesis.cancel(); }
  // play(script, question, onEnd) → false when the device has no Japanese voice
  function play(script, question, onEnd) {
    if (clipPlay(parse(script), onEnd)) return true;
    return devicePlay(parse(script), onEnd);
  }
  fallback = (parts, onEnd) => devicePlay(parts, onEnd);
  function devicePlay(parts, onEnd) {
    if (!has) return false;
    stop(); const run = RUN; const V = voices();
    // same order as before: just the script, line by line (no chime, the question is not read out) — only the voices are better
    const seq = parts.map((p, i) => ({ who: p.who, text: p.text, pause: i === parts.length - 1 ? 0 : 380 }));
    let i = 0;
    const next = () => {
      if (run !== RUN) return; const s = seq[i++]; if (!s) { if (onEnd) onEnd(); return; }
      const u = new SpeechSynthesisUtterance(s.text); u.lang = 'ja-JP';
      const vo = s.who === 'm' ? (V.m || V.f) : V.f; if (vo) u.voice = vo;
      if (s.who === 'm') { u.pitch = V.m ? 1 : 0.7; u.rate = 0.92; }
      else if (s.who === 'f') { u.pitch = V.m ? 1.05 : 1.2; u.rate = 0.95; }
      else { u.pitch = 1; u.rate = 0.9; }
      u.onend = () => setTimeout(next, s.pause); u.onerror = () => setTimeout(next, 50);
      speechSynthesis.speak(u);
    };
    next();
    return V.any;
  }
  window.JLPTVoice = { play, stop, voices, parse, kana, clip, hkey };
})();
