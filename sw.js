/* TRAILCOMMAND service worker – offline aplikacija + keš pločica mape
   Postavi ovaj fajl pored index.html (isti folder) na HTTPS hostu (GitHub Pages / Netlify). */
const APP_CACHE = 'trailcommand-app-v1';
const TILE_CACHE = 'trailcommand-tiles-v1';
const LIB_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];
const TILE_HOSTS = ['tile.openstreetmap.org', 'tile.opentopomap.org', 'server.arcgisonline.com'];
const MAX_TILES = 4000;

self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(['./', './index.html']).catch(() => {}))); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const isTile = TILE_HOSTS.some(h => url.hostname.endsWith(h));
  const isLib = LIB_HOSTS.some(h => url.hostname.endsWith(h));
  if (isTile) {
    /* pločice: cache-first, ograničen broj */
    e.respondWith(caches.open(TILE_CACHE).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      try { const res = await fetch(e.request); if (res.ok || res.type === 'opaque') { c.put(e.request, res.clone()); trimCache(c); } return res; } catch (err) { return new Response('', { status: 503 }); }
    }));
    return;
  }
  if (isLib || url.origin === location.origin) {
    /* app i biblioteke: network-first, fallback keš */
    e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 503 })))));
  }
});
let trimming = false;
async function trimCache(c) { if (trimming) return; trimming = true; const keys = await c.keys(); if (keys.length > MAX_TILES) for (const k of keys.slice(0, keys.length - MAX_TILES)) await c.delete(k); trimming = false; }
