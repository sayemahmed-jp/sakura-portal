/* Sakura student site service worker: lets the site be installed like an app and shows notifications.
   Network first, so updates appear at once; the saved copy is used only with no internet.
   Nothing from the database (marks, fees, files) is ever cached — those go straight to the network. */
const CACHE = 'sakura-student-v1';
const SHELL = ['./', './index.html', './student.js', './daily.js', './kana-strokes.js', './interview.js', './japan-guide.js', './manifest.webmanifest', '../style.css', '../config.js', '../icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sakura-student-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const c = cs.find(x => x.url.includes('/student/')); if (c) return c.focus(); return self.clients.openWindow('./'); }));
});
