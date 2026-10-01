/* Iberostar Aruba — service worker (v4). Plain script, no dependencies, no build step.
 *
 * VERSION must equal DATA_VERSION in js/app.js and js/admin.js and every ?v= in index.html /
 * admin.html (node scripts/verify.js enforces it). Bump them all together on every release: the
 * new VERSION creates a fresh `ib-shell-<VERSION>` cache and the old one is deleted on activate.
 *
 * Caches
 *   ib-shell-<VERSION>  this release's app shell: index.html, qr.html, every `?v=<VERSION>` script/style/manifest,
 *                       fonts, brand logos, plus visited pages (admin.html) re-fetched for each new release
 *   ib-media-v1         hash-named derivatives (assets/img), fonts, brand logos (cache-first, immutable),
 *                       plus anything the staff "Cache everything" button pins for offline use
 *   ib-runtime-v1       originals, PDFs and other assets/** (stale-while-revalidate, LRU 150 entries)
 * Never cached: non-GET, cross-origin, Range requests, *.mp4.
 *
 * Release consistency. GitHub Pages ignores query strings, so after a deploy `js/app.js?v=<n>` returns the
 * NEW app.js. Each worker therefore treats `?v=<n>` URLs as immutable snapshots of release n:
 *   - `?v=VERSION`  cache-first from SHELL (install fills it); a miss is fetched once and kept.
 *   - `?v=<other>`  that release's own ib-shell-<other> if it exists (a newer worker installing), else
 *                   the network — never written to SHELL, never answered with this release's bytes.
 *   - pages         network-first, but a page is stored in SHELL only when every ?v= script/style it
 *                   loads is this VERSION. Offline/slow, the stored page therefore loads a consistent shell.
 * So every file change that ships needs a VERSION bump (verify.js keeps the numbers in sync).
 *
 * Messages (page → worker)
 *   {type:'warm', urls?}     card-size photo of every item + Today heroes (~0.6 MB). urls[] = extra same-origin URLs.
 *   {type:'precache-all'}    every 800w/1600w photo, logo, PDF and poster (~24 MB). Replies
 *                            {type:'progress',done,total,bytes,failed} … then {type:'done',done,total,bytes,failed}.
 *   {type:'clear'}           deletes ib-media-v1 and ib-runtime-v1, replies {type:'cleared'}.
 *   {type:'skip-waiting'}    activates a waiting worker (the page then reloads on controllerchange).
 *   {type:'status'}          replies {type:'status',version,hasMedia,items,media,runtime} (entry counts).
 * Replies go to event.ports[0] when a MessageChannel is passed, otherwise to the sending client.
 *
 * Support escape hatches
 *   - One device: open the site with ?nosw=1 (the app unregisters the worker and clears ib-* caches).
 *   - KILL SWITCH (every device): replace this whole file with the snippet below, commit, deploy.
 *     Browsers re-check sw.js on every navigation (and at least daily), so each device installs the
 *     kill switch on its next visit; it unregisters itself, deletes every ib-* cache and reloads the
 *     open tabs straight from the network. Keep it deployed for a few weeks before restoring a worker.
 *
 *       self.addEventListener('install', () => self.skipWaiting());
 *       self.addEventListener('activate', (e) => e.waitUntil((async () => {
 *         await self.registration.unregister();
 *         for (const k of await caches.keys()) if (k.startsWith('ib-')) await caches.delete(k);
 *         for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
 *       })()));
 */
'use strict';

const VERSION = 400;                         // == DATA_VERSION == every ?v= (verify.js)
const SHELL = `ib-shell-${VERSION}`;         // atomic per release
// Named *_CACHE (not MEDIA) because js/media.js, imported below, declares the global `const MEDIA`.
const MEDIA_CACHE = 'ib-media-v1';
const RUNTIME_CACHE = 'ib-runtime-v1';
const RUNTIME_MAX = 150;
const NET_TIMEOUT = 3000;
const SHELL_URLS = ['./', 'index.html', `css/styles.css?v=${VERSION}`, `js/image-utils.js?v=${VERSION}`,
  `js/data.js?v=${VERSION}`, `js/media.js?v=${VERSION}`, `js/lib.js?v=${VERSION}`, `js/app.js?v=${VERSION}`,
  `manifest.webmanifest?v=${VERSION}`, 'assets/fonts/inter-400.woff2', 'assets/fonts/inter-500.woff2',
  'assets/fonts/inter-600.woff2', 'assets/fonts/playfair-600.woff2', 'assets/fonts/playfair-600italic.woff2',
  'assets/Logos/logo_iberostar_ink.png', 'assets/Logos/logo_iberostar_ivory.png', 'assets/Logos/app_logo_club.png',
  'qr.html'];
// Install fails only if one of these fails; the rest (media.js, fonts, logos, qr.html) are best effort.
const SHELL_REQUIRED = SHELL_URLS.slice(0, 8).filter((u) => !u.startsWith('js/media.js'));
// Mirror of TODAY_HERO in js/app.js (§B5.1) — keep in sync, like scripts/build-images.py does.
const TODAY_HERO = ['assets/Hotels/Joia/hotel_joia_2.jpg', 'assets/Hotels/Joia/hotel_joia_1.jpg',
  'assets/Restaurants/Zima/rest_zima_1.jpg'];

// Catalog + derivative map for warm/precache. Both optional: a 404 here must never break the worker.
try { importScripts(`js/media.js?v=${VERSION}`); } catch (e) { /* no derivatives yet → originals */ }
try { importScripts(`js/data.js?v=${VERSION}`); } catch (e) { /* warm/precache then cover heroes only */ }
const HAS_MEDIA = typeof MEDIA !== 'undefined' && !!MEDIA && !!MEDIA.img;
const CATALOG = typeof defaultData !== 'undefined' && defaultData ? defaultData : {};

const SCOPE = new URL(self.registration.scope);
const abs = (u) => new URL(u, SCOPE).href;
const encodePath = (p) => String(p || '').split('/').map(encodeURIComponent).join('/');
const relPath = (url) => { try { return decodeURIComponent(url.pathname.slice(SCOPE.pathname.length)); } catch (e) { return ''; } };
const pickW = (m, want) => { const f = m.v.find((x) => x >= want); return f != null ? f : m.v[m.v.length - 1]; };
const variant = (m, w) => abs(`assets/img/${m.id}-${w}.webp`);
const cacheable = (res) => !!res && res.ok && res.type === 'basic';
const shellCache = (v) => `ib-shell-${v}`;
// The release a URL is pinned to by its ?v=, or null when it carries none.
const versionOf = (url) => { const v = url.searchParams.get('v'); return v && /^\d+$/.test(v) ? Number(v) : null; };
// ?v=<n> scripts/styles/manifest an HTML page loads (images' ?v= is only an icon cache-buster).
const pageRefs = (html) => [...html.matchAll(/(?:src|href)\s*=\s*["']([^"'#]+\.(?:js|css|webmanifest)\?v=(\d+))["']/gi)];
// True when the page belongs to this worker's release: every versioned script/style is ?v=VERSION.
const pageIsThisRelease = (html) => pageRefs(html).every((m) => Number(m[2]) === VERSION);
const keepPage = async (res) => pageIsThisRelease(await res.text());

/* ---------------------------------------------------------------- lifecycle */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // 'no-cache', not 'reload': the server still validates every file, but one the page has just
    // downloaded costs a 304 instead of a second full copy over the resort Wi-Fi.
    const req = (u) => new Request(u, { cache: 'no-cache' });
    let done = false;
    try { await cache.addAll(SHELL_URLS.map(req)); done = true; } catch (e) { /* e.g. media.js 404 → one by one */ }
    if (!done) {
      const results = await Promise.allSettled(SHELL_URLS.map((u) => cache.add(req(u)).then(() => u)));
      const failed = SHELL_URLS.filter((u, i) => results[i].status === 'rejected');
      if (failed.some((u) => SHELL_REQUIRED.includes(u))) throw new Error(`shell incomplete: ${failed.join(', ')}`);
    }
    await carryVisitedPages(cache, req);
  })());
  // No automatic skipWaiting: the page shows "Updated info available · Refresh" and posts 'skip-waiting'.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Old shells, plus the pre-v4 admin "super cache" that nothing reads any more.
    await Promise.all(keys.filter((k) => (k.startsWith('ib-shell-') && k !== SHELL) || k === 'ib-aruba-v1')
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ---------------------------------------------------------------- fetch */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
  const url = new URL(req.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const path = url.pathname.toLowerCase();
  if (path.endsWith('.mp4') || path.endsWith('/sw.js')) return;

  const ext = (path.match(/\.([a-z0-9]+)$/) || [])[1] || '';
  const rel = url.pathname.slice(SCOPE.pathname.length);
  if (req.mode === 'navigate' && (!ext || ext === 'html')) {
    event.respondWith(navigation(event, url));
  } else if (['html', 'js', 'css', 'webmanifest'].includes(ext)) {
    const v = versionOf(url);
    if (v === VERSION) event.respondWith(pinned(event, req));
    else if (v != null) event.respondWith(otherRelease(req, v));
    else event.respondWith(networkFirst(event, req));
  } else if (/^assets\/(img|fonts|logos)\//i.test(rel)) {
    event.respondWith(cacheFirst(req, url));
  } else if (/^assets\//i.test(rel)) {
    event.respondWith(staleWhileRevalidate(event, req, url));
  }
  // Anything else in scope (e.g. a root favicon) goes straight to the network, uncached.
});

const timeout = (ms) => new Promise((r) => setTimeout(r, ms, 'timeout'));
// After one request has timed out or failed, the connection is slow/offline: for the next 15 s give
// the network only a short head start, so a page served from cache doesn't wait 3 s more per script.
let slowUntil = 0;

// Network with a soft deadline: after NET_TIMEOUT, answer from cache if we have it, but let the
// network response finish in the background and refresh the cache (only when keep(res) agrees).
async function fresh(event, fetchURL, cacheKey, fallback, keep) {
  const net = fetch(fetchURL, { cache: 'no-cache', credentials: 'same-origin' }).then(async (res) => {
    if (cacheable(res) && (!keep || await keep(res.clone()))) {
      const copy = res.redirected ? await unredirect(res.clone()) : res.clone();
      await (await caches.open(SHELL)).put(cacheKey, copy);
    }
    return res;
  });
  event.waitUntil(net.catch(() => {}));
  const first = await Promise.race([net.catch(() => 'error'), timeout(Date.now() < slowUntil ? 400 : NET_TIMEOUT)]);
  if (first !== 'timeout' && first !== 'error' && first.status < 500) return first;
  slowUntil = Date.now() + 15000;
  const cached = await fallback();
  if (cached) return cached;
  if (first !== 'timeout' && first !== 'error') return first; // 5xx with nothing cached
  try { return await net; } catch (e) { return null; }
}

async function navigation(event, url) {
  const rel = url.pathname.slice(SCOPE.pathname.length);
  const isApp = rel === '' || rel === 'index.html';
  // Bare URL (no query) as the cache key; the app's own pages share one 'index.html' entry.
  const key = isApp ? abs('index.html') : url.origin + url.pathname;
  // A page whose ?v= files are another release (a deploy this worker predates) is passed through but
  // never stored, so SHELL's copy keeps loading SHELL's own files. Only the app's own URLs fall back
  // to index.html; any other page with no stored copy waits for the network, then shows offlinePage.
  const res = await fresh(event, url.href, key, async () =>
    (await matchIn(SHELL, key)) || (await caches.match(key)) ||
    (isApp ? await matchIn(SHELL, abs('./')) : null), keepPage);
  if (res && !res.redirected) return res;
  if (res) return unredirect(res);
  return offlinePage('You’re offline', 'Connect to Wi-Fi and try again. After one visit online, the guide opens even without a connection.');
}

// Unversioned scripts/styles (nothing in the shell; e.g. a hand-typed URL). Versioned ones never get here.
async function networkFirst(event, req) {
  const url = new URL(req.url);
  const res = await fresh(event, req.url, url.href, async () =>
    (await caches.match(req)) || (await matchIn(SHELL, req, { ignoreSearch: true })) ||
    (await caches.match(req, { ignoreSearch: true })));
  return res || Response.error();
}

// ?v=VERSION: immutable for this release. Install stored the shell; anything else (admin.js?v=…) is
// fetched once and kept.
async function pinned(event, req) {
  const hit = await matchIn(SHELL, req);
  if (hit) return hit;
  return (await fresh(event, req.url, req.url, async () => null)) || Response.error();
}

// ?v=<other release>: a page from a deploy this worker predates (or postdates). Its own shell, when a
// newer worker has installed one, is a consistent copy; otherwise the network. Never stored here and
// never answered from SHELL, whose bytes belong to a different release.
async function otherRelease(req, v) {
  if (await caches.has(shellCache(v))) {
    const hit = await matchIn(shellCache(v), req);
    if (hit) return hit;
  }
  try { return await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }); } catch (e) { return Response.error(); }
}

// Pages outside the shell that this device has opened before (admin.html) live in the per-release
// shell, which activate deletes. Re-fetch them, and the ?v=VERSION files they load, into the new
// shell so they keep opening offline after a release. Best effort: never fails the install.
async function carryVisitedPages(cache, req) {
  try {
    const shellPages = new Set(SHELL_URLS.map(abs).concat(abs('index.html')));
    const pages = new Set();
    for (const name of await caches.keys()) {
      if (!name.startsWith('ib-shell-') || name === SHELL) continue;
      for (const r of await (await caches.open(name)).keys()) {
        const u = new URL(r.url);
        if (u.search || !/\.html$/i.test(u.pathname) || shellPages.has(u.href)) continue;
        if (u.origin === SCOPE.origin && u.pathname.startsWith(SCOPE.pathname)) pages.add(u.href);
      }
    }
    await Promise.allSettled([...pages].map(async (page) => {
      const res = await fetch(req(page));
      if (!cacheable(res)) return;
      const html = await res.clone().text();
      if (!pageIsThisRelease(html)) return;
      const refs = pageRefs(html).map((m) => new URL(m[1], page).href).filter((u) => u.startsWith(SCOPE.href));
      await Promise.allSettled(refs.map(async (u) => { if (!(await cache.match(u))) await cache.add(req(u)); }));
      await cache.put(page, res);
    }));
  } catch (e) { /* best effort */ }
}

async function cacheFirst(req, url) {
  const hit = (await matchIn(SHELL, req)) || (await matchIn(MEDIA_CACHE, req));
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (cacheable(res)) await (await caches.open(MEDIA_CACHE)).put(req, res.clone());
    if (res.ok || !/\/assets\/img\//.test(url.pathname)) return res;
    return (await siblingVariant(url)) || res;
  } catch (e) {
    // Offline: another width of the same photo, or the same file under a different ?v= (icons).
    return (await siblingVariant(url)) || (await caches.match(req, { ignoreSearch: true })) || Response.error();
  }
}

async function staleWhileRevalidate(event, req, url) {
  const inRuntime = await matchIn(RUNTIME_CACHE, req);
  const hit = inRuntime || (await matchIn(MEDIA_CACHE, req)); // MEDIA holds files pinned by precache-all
  const target = inRuntime || !hit ? RUNTIME_CACHE : MEDIA_CACHE;
  const net = fetch(req).then(async (res) => {
    if (cacheable(res)) {
      await (await caches.open(target)).put(req, res.clone());
      if (target === RUNTIME_CACHE) trimRuntime();
    }
    return res;
  });
  if (hit) { event.waitUntil(net.catch(() => {})); return hit; }
  try {
    const res = await net;
    if (res.ok) return res;
    return (await derivativeOfOriginal(url)) || res;
  } catch (e) {
    const alt = await derivativeOfOriginal(url);
    if (alt) return alt;
    if (req.mode === 'navigate') return offlinePage('Not saved on this device yet', 'This file opens once you’re back online. Connect to Wi-Fi and try again.');
    return Response.error();
  }
}

async function matchIn(name, req, opts) {
  const cache = await caches.open(name);
  return cache.match(req, opts);
}

async function unredirect(res) {
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

// Offline and the exact width isn't cached → serve the nearest cached width of the same photo
// (e.g. the 800w from precache-all for a 480w gallery thumb), then the cached original.
async function siblingVariant(url) {
  const m = url.pathname.match(/\/assets\/img\/(.+)-(\d+)\.webp$/);
  if (!m) return null;
  const [, id, wantStr] = m;
  const want = Number(wantStr);
  const cache = await caches.open(MEDIA_CACHE);
  const widths = [];
  for (const k of await cache.keys()) {
    const km = new URL(k.url).pathname.match(/\/assets\/img\/(.+)-(\d+)\.webp$/);
    if (km && km[1] === id) widths.push(Number(km[2]));
  }
  widths.sort((a, b) => a - b);
  const w = widths.find((x) => x >= want) || widths[widths.length - 1];
  if (w) return cache.match(abs(`assets/img/${id}-${w}.webp`));
  if (!HAS_MEDIA) return null;
  for (const src in MEDIA.img) {
    if (MEDIA.img[src] && MEDIA.img[src].id === id) return caches.match(abs(encodePath(src)));
  }
  return null;
}

// Offline and an original isn't cached → serve its largest cached derivative instead.
async function derivativeOfOriginal(url) {
  const m = HAS_MEDIA && MEDIA.img[relPath(url)];
  if (!m || !Array.isArray(m.v)) return null;
  const cache = await caches.open(MEDIA_CACHE);
  for (const w of m.v.slice().reverse()) {
    const hit = await cache.match(variant(m, w));
    if (hit) return hit;
  }
  return null;
}

let trimTimer = 0;
function trimRuntime() {
  clearTimeout(trimTimer);
  trimTimer = setTimeout(async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const keys = await cache.keys(); // insertion order; put() re-appends, so this is oldest-used first
    if (keys.length <= RUNTIME_MAX) return;
    const isPdf = (k) => /\.pdf$/i.test(new URL(k.url).pathname);
    const order = keys.filter((k) => !isPdf(k)).concat(keys.filter(isPdf)); // menus are evicted last
    await Promise.all(order.slice(0, keys.length - RUNTIME_MAX).map((k) => cache.delete(k)));
  }, 1000);
}

function offlinePage(title, body) {
  const font = (f, file, w, st) => `@font-face{font-family:'${f}';src:url(${abs('assets/fonts/' + file)}) format('woff2');font-weight:${w};font-style:${st};font-display:swap}`;
  const css = font('Inter', 'inter-400.woff2', 400, 'normal') + font('Inter', 'inter-600.woff2', 600, 'normal') +
    font('Playfair Display', 'playfair-600.woff2', 600, 'normal') +
    "html{background:#07131F;color:#F4EFE4;font:16px/1.5 Inter,system-ui,-apple-system,sans-serif;-webkit-text-size-adjust:100%}" +
    'body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px;box-sizing:border-box;text-align:center}' +
    "img{width:120px;height:auto;margin:0 auto 28px;display:block;opacity:.9}h1{font:600 28px/1.2 'Playfair Display',Georgia,serif;margin:0 0 12px}" +
    'p{margin:0 auto 28px;max-width:30ch;color:#C9C3B6}.row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}' +
    '.b{font:600 16px Inter,system-ui,sans-serif;min-height:48px;padding:0 28px;border-radius:999px;border:1px solid rgba(244,239,228,.35);background:transparent;color:#F4EFE4;display:inline-flex;align-items:center;text-decoration:none;cursor:pointer}' +
    '.b--p{background:#F4EFE4;color:#0B1F33;border-color:#F4EFE4}.b:focus-visible{outline:3px solid #D4AF37;outline-offset:3px}';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07131F"><title>${title} · Iberostar Aruba</title><style>${css}</style></head><body><main><img src="${abs('assets/Logos/logo_iberostar_ivory.png')}" alt="Iberostar" onerror="this.remove()"><h1>${title}</h1><p>${body}</p><div class="row"><button type="button" class="b b--p" id="retry">Try again</button><a class="b" href="${abs('./')}">Open the app</a></div></main><script>document.getElementById('retry').addEventListener('click',()=>location.reload())</script></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

/* ---------------------------------------------------------------- messages */
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  const reply = (data) => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(data);
    else if (event.source) event.source.postMessage(data);
  };
  if (msg.type === 'skip-waiting') {
    self.skipWaiting();
  } else if (msg.type === 'clear') {
    event.waitUntil(Promise.all([caches.delete(MEDIA_CACHE), caches.delete(RUNTIME_CACHE)])
      .then(() => reply({ type: 'cleared' })));
  } else if (msg.type === 'warm') {
    event.waitUntil(warm(msg.urls).then((n) => reply({ type: 'warmed', count: n })).catch(() => {}));
  } else if (msg.type === 'precache-all') {
    event.waitUntil(precacheAll(reply));
  } else if (msg.type === 'status') {
    event.waitUntil((async () => {
      const count = async (n) => (await caches.has(n)) ? (await (await caches.open(n)).keys()).length : 0;
      reply({ type: 'status', version: VERSION, hasMedia: HAS_MEDIA, items: items().length, media: await count(MEDIA_CACHE), runtime: await count(RUNTIME_CACHE) });
    })());
  }
});

const items = () => Object.keys(CATALOG).map((k) => CATALOG[k]).filter((it) => it && typeof it === 'object');
const firstPhoto = (it) => (Array.isArray(it.gallery) ? it.gallery.find((g) => typeof g === 'string' && g) : '');

// One URL per photo at the requested width: the derivative when media.js knows it, else the original.
function photoURL(src, want) {
  const m = HAS_MEDIA && MEDIA.img[src];
  return m && Array.isArray(m.v) && m.v.length ? variant(m, pickW(m, want)) : abs(encodePath(src));
}

function warmList(extra) {
  const urls = new Set();
  for (const it of items()) {
    const g = firstPhoto(it);
    if (g) urls.add(photoURL(g, 480));
    for (const l of [it.logo, it.partnerLogo]) if (typeof l === 'string' && l) urls.add(photoURL(l, 160));
  }
  for (const h of TODAY_HERO) urls.add(photoURL(h, 800));
  for (const u of Array.isArray(extra) ? extra : []) {
    try { const x = new URL(u, SCOPE); if (x.origin === SCOPE.origin && !/\.mp4$/i.test(x.pathname)) urls.add(x.href); } catch (e) { /* skip */ }
  }
  return [...urls];
}

function precacheList() {
  const urls = new Set();
  const pdfs = new Set();
  for (const it of items()) {
    const photos = (Array.isArray(it.gallery) ? it.gallery : []).filter((g) => typeof g === 'string' && g);
    for (const g of photos) {
      const m = HAS_MEDIA && MEDIA.img[g];
      if (m && Array.isArray(m.v) && m.v.length) { urls.add(variant(m, pickW(m, 800))); urls.add(variant(m, pickW(m, 1600))); }
      else urls.add(abs(encodePath(g)));
    }
    for (const l of [it.logo, it.partnerLogo]) if (typeof l === 'string' && l) urls.add(photoURL(l, 160));
    if (typeof it.pdf === 'string' && it.pdf) pdfs.add(it.pdf);
    if (Array.isArray(it.pdfs)) for (const p of it.pdfs) if (p && typeof p.url === 'string' && p.url) pdfs.add(p.url);
  }
  if (HAS_MEDIA) {
    // Every derivative the pipeline wrote (catalog photos + Today heroes), plus menus and video posters.
    for (const src in MEDIA.img) {
      const m = MEDIA.img[src];
      if (m && Array.isArray(m.v) && m.v.length) { urls.add(variant(m, pickW(m, 800))); urls.add(variant(m, pickW(m, 1600))); }
    }
    for (const p in (MEDIA.pdf || {})) pdfs.add(p);
    for (const v in (MEDIA.video || {})) { const pv = MEDIA.video[v]; if (pv && pv.poster) urls.add(abs(pv.poster)); }
  } else {
    for (const h of TODAY_HERO) urls.add(abs(encodePath(h)));
  }
  for (const p of pdfs) if (!/^[a-z]+:/i.test(p)) urls.add(abs(encodePath(p)));
  return [...urls].filter((u) => new URL(u).origin === SCOPE.origin);
}

// Cache each URL unless present. Photos/logos land in MEDIA; precache-all also pins PDFs/originals
// there (not in the LRU runtime cache) so a deliberate "cache everything" is never trimmed.
async function fill(urls, onEach) {
  const media = await caches.open(MEDIA_CACHE);
  const runtime = await caches.open(RUNTIME_CACHE);
  const shell = await caches.open(SHELL);
  let i = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      let bytes = 0;
      let ok = false;
      try {
        const hit = (await media.match(u)) || (await runtime.match(u)) || (await shell.match(u));
        if (hit) {
          bytes = Number(hit.headers.get('content-length')) || (await hit.blob()).size;
          ok = true;
        } else {
          const ctl = new AbortController();
          const t = setTimeout(() => ctl.abort(), 40000);
          try {
            const res = await fetch(u, { signal: ctl.signal, credentials: 'same-origin' });
            if (cacheable(res)) {
              const blob = await res.clone().blob();
              bytes = blob.size;
              const x = new URL(u);
              const isShellType = /\.(html|js|css|webmanifest)$/i.test(x.pathname);
              const v = versionOf(x);
              // Shell-type files of another release would break SHELL's snapshot: fetched, not stored.
              if (!isShellType) await media.put(u, res);
              else if (v === VERSION || (v == null && !/\.html$/i.test(x.pathname))) await shell.put(u, res);
              ok = true;
            }
          } finally { clearTimeout(t); }
        }
      } catch (e) { /* offline / aborted → counted as failed, retried next time */ }
      onEach(ok, bytes);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
}

async function warm(extra) {
  if (self.navigator && navigator.connection && navigator.connection.saveData) return 0;
  const urls = warmList(extra);
  let n = 0;
  await fill(urls, (ok) => { if (ok) n++; });
  return n;
}

let precacheRun = null;
const precacheListeners = new Set();
function precacheAll(reply) {
  precacheListeners.add(reply);
  if (precacheRun) return precacheRun; // a second tap joins the running job instead of restarting it
  const send = (data) => precacheListeners.forEach((r) => { try { r(data); } catch (e) { /* client gone */ } });
  precacheRun = (async () => {
    const urls = precacheList();
    const s = { done: 0, total: urls.length, bytes: 0, failed: 0 };
    send({ type: 'progress', ...s });
    await fill(urls, (ok, bytes) => {
      s.done++; s.bytes += bytes; if (!ok) s.failed++;
      send({ type: 'progress', ...s });
    });
    send({ type: 'done', ...s });
  })().finally(() => { precacheRun = null; precacheListeners.clear(); });
  return precacheRun;
}
