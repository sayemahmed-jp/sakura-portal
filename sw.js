/* Sakura Portal service worker: lets the portal be installed like an app.
   Always tries the network first so updates appear immediately; the saved
   copy is used only when there is no internet. Student data is never cached. */
const CACHE = 'sakura-shell-v3';
const SHELL = ['./', './index.html', './style.css', './app.js', './config.js', './manifest.webmanifest', './icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // page loads go out as they are, so a move to a new web address (a redirect) is followed by the browser instead of failing here
  if (e.request.mode === 'navigate') { e.respondWith(fetch(e.request).then(r => { if (r.ok && r.type === 'basic') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))); return; } // database, fonts and libraries go straight to the network
  e.respondWith(fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { if (r.ok && !r.redirected) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
