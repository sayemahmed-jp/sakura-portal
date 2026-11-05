/* Sakura staff portal — language switch (বাংলা / English).
   The site is written in Bengali; when a student picks English, every screen is translated on the fly
   from i18n-en.js. Text the student or the office typed (names, notices, answers) is left as written. */
(function () {
  var L = null; try { L = localStorage.getItem('sakura_portal_lang'); } catch (e) { /* private mode */ }
  window.SK_LANG = L === 'en' ? 'en' : 'bn';
  window.setLang = function (l) { try { localStorage.setItem('sakura_portal_lang', l); } catch (e) { /* not kept */ } location.reload(); };
  if (window.SK_LANG !== 'en') return;
  document.documentElement.lang = 'en';
  document.write('<script src="i18n-en.js?v=1"><\/script>');
  var BN = /[ঀ-৿]/, BNL = /[অ-হ়-ৗড়-ৣ]/g, DIG = '০১২৩৪৫৬৭৮৯', map = null, re = null;
  function build() {
    map = window.SK_EN || {};
    var esc = function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var all = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
    var one = function (k) { return /^[\u0980-\u09FF]+$/.test(k); };   // a single Bengali word
    var long = all.filter(function (k) { return k.length >= 4 && !one(k) && !/^[০-৯0-9]/.test(k); }).map(esc);
    var short = all.filter(function (k) { return (k.length < 4 || one(k)) && /[\u0980-\u09FF]/.test(k); }).map(function (k) { return '(?<![\u0980-\u09FF])' + esc(k) + '(?![\u0980-\u09FF])'; });   // single words only as whole words (ছাত্র must not eat ছাত্রী)
    try { re = new RegExp(long.concat(short).join('|'), 'g'); } catch (e) { re = new RegExp(long.join('|'), 'g'); }
  }
  function digits(s) { return s.replace(/[০-৯]/g, function (c) { return DIG.indexOf(c); }); }
  function letters(s) { var m = s.match(BNL); return m ? m.length : 0; }
  var cache = Object.create(null);
  function tr(s) {
    if (!s || !BN.test(s)) return s;
    if (cache[s] !== undefined) return cache[s];
    return (cache[s] = tr0(s));
  }
  function tr0(s) {
    if (!map) build();
    var t = s.trim();
    if (Object.prototype.hasOwnProperty.call(map, t)) return s.replace(t, map[t]);
    var before = letters(s);
    var out = re ? s.replace(re, function (m) { return map[m]; }) : s;
    out = digits(out).replace(/।/g, '.').replace(/(\d)\s?(টি|টা|জন)(?![ঀ-৿])/g, '$1').replace(/(\d)([a-z])/g, '$1 $2');
    if (before && letters(out) / before > 0.35) return digits(s);   // mostly not ours (typed by a person) — keep it as written
    return out;
  }
  window.SK_T = tr;
  var ATTR = ['placeholder', 'title', 'aria-label', 'alt', 'data-l'];
  function walk(root) {
    if (root.nodeType === 3) { var v = tr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 || root.closest && root.closest('[data-noi18n], script, style, textarea')) return;
    ATTR.forEach(function (a) { var x = root.getAttribute && root.getAttribute(a); if (x && BN.test(x)) { var y = tr(x); if (y !== x) root.setAttribute(a, y); } });
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (BN.test(n.nodeValue) && !(n.parentNode && n.parentNode.closest && n.parentNode.closest('[data-noi18n], script, style, textarea'))) { var t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; } }
      else ATTR.forEach(function (a) { var x = n.getAttribute(a); if (x && BN.test(x)) { var y = tr(x); if (y !== x) n.setAttribute(a, y); } });
    }
  }
  var _a = window.alert, _c = window.confirm, _p = window.prompt;
  window.alert = function (m) { return _a.call(window, tr(String(m))); };
  window.confirm = function (m) { return _c.call(window, tr(String(m))); };
  window.prompt = function (m, d) { return _p.call(window, tr(String(m)), d); };
  document.addEventListener('DOMContentLoaded', function () {
    build(); document.title = tr(document.title); walk(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') { if (BN.test(m.target.nodeValue)) walk(m.target); }
        else if (m.type === 'attributes') { if (m.target.nodeType === 1) walk(m.target); }
        else m.addedNodes.forEach(function (n) { walk(n); });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  });
})();
