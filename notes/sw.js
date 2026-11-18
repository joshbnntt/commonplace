/* Zettelkasten service worker.
   Precaches the app shell and serves it offline. Bump VERSION when you
   add or rename files so the new worker installs and the update prompt appears. */
const VERSION = 'zk-7';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'fflate.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-500-normal.woff2', 'fonts/inter-latin-600-normal.woff2',
  'fonts/newsreader-latin-400-normal.woff2', 'fonts/newsreader-latin-500-normal.woff2', 'fonts/newsreader-latin-400-italic.woff2'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('zk-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }
  // Stale-while-revalidate for everything else on this origin.
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
