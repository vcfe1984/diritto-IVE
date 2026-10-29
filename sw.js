/* Service worker — offline cache + versioned updates.
   VERSION and ASSETS are rewritten by tools/build.py on every build. */
const VERSION = 'it-4b67f4267774';
const ASSETS = [
 "./",
 "app.css",
 "app.js",
 "data/docs/catechesi.json",
 "data/docs/costituzioni.json",
 "data/docs/direzione-spirituale.json",
 "data/docs/esercizi-spirituali.json",
 "data/docs/evangelizzazione-cultura.json",
 "data/docs/formazione-intellettuale.json",
 "data/docs/missioni-popolari.json",
 "data/docs/noviziato.json",
 "data/docs/oratorio.json",
 "data/docs/predicazione.json",
 "data/docs/seminari-maggiori.json",
 "data/docs/spiritualita.json",
 "data/docs/vita-consacrata.json",
 "data/docs/vita-contemplativa.json",
 "data/docs/vita-fraterna.json",
 "data/docs/vita-liturgica.json",
 "data/docs/vocazioni.json",
 "data/img/esercizi-p287.png",
 "data/img/esercizi-p288.png",
 "data/img/esercizi-p289.png",
 "data/img/esercizi-p290.png",
 "data/img/esercizi-p291.png",
 "data/img/esercizi-p292.png",
 "data/img/esercizi-p293.png",
 "data/img/esercizi-p294.png",
 "data/img/esercizi-p295.png",
 "data/img/esercizi-p296.png",
 "data/img/esercizi-p297.png",
 "data/img/esercizi-p298.png",
 "data/img/esercizi-p299.png",
 "data/img/esercizi-p300.png",
 "data/img/esercizi-p301.png",
 "data/img/esercizi-p302.png",
 "data/library.json",
 "data/search.json",
 "fonts/eb-garamond-latin-400-italic.woff2",
 "fonts/eb-garamond-latin-400-normal.woff2",
 "fonts/eb-garamond-latin-500-normal.woff2",
 "fonts/eb-garamond-latin-600-normal.woff2",
 "fonts/source-serif-4-latin-400-italic.woff2",
 "fonts/source-serif-4-latin-400-normal.woff2",
 "fonts/source-serif-4-latin-600-normal.woff2",
 "icons/apple-touch-icon.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon-maskable-512.png",
 "index.html",
 "manifest.webmanifest",
 "robots.txt",
 "search-worker.js",
 "sources/costituzioni.pdf",
 "sources/direttori-vol-1.pdf",
 "sources/direttori-vol-2.pdf",
 "sources/direttori-vol-3.pdf",
 "vendor/minisearch.js"
];
const CACHE = 'ive-it-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
  );
  // wait for the page to ask before taking over (so the user can choose when to update)
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ive-it-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'version' && e.source) e.source.postMessage({ type: 'version', version: VERSION });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // navigation → app shell
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./', { cacheName: CACHE }).then(r => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
