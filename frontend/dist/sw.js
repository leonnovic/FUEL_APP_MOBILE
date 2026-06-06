/* FuelPro Service Worker — cross-platform offline + smart caching
 * Strategy:
 *   - /api/*  -> network-first, fall back to cache, fall back to JSON error
 *   - HTML    -> network-first, fall back to cached /index.html (SPA shell)
 *   - assets  -> cache-first, populate on miss
 *   - others  -> pass-through
 */
const CACHE_VERSION = 'fuelpro-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/logo-main.png',
  '/logo-small.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => !n.startsWith(CACHE_VERSION))
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Listen for skipWaiting messages from the page so users get fresh JS without manual refresh
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isHtmlRequest(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200 && fresh.type === 'basic') {
      const clone = fresh.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone));
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (isHtmlRequest(request)) {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are offline and this resource is not cached.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200 && fresh.type === 'basic') {
      const clone = fresh.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone));
    }
    return fresh;
  } catch {
    return new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }
  event.respondWith(cacheFirst(request, RUNTIME_CACHE));
});

// ---------------------------------------------------------------------------
// Web Push handling (cross-platform: Chrome/Edge/Firefox/Android + iOS 16.4+ PWA)
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = { title: 'FuelPro', body: 'You have a new notification.', url: '/', icon: '/logo-small.png', tag: 'fuelpro' };
  try {
    if (event.data) {
      const text = event.data.text();
      try { payload = { ...payload, ...JSON.parse(text) }; }
      catch { payload.body = text || payload.body; }
    }
  } catch { /* ignore */ }

  const opts = {
    body: payload.body,
    icon: payload.icon || '/logo-small.png',
    badge: '/logo-small.png',
    tag: payload.tag || 'fuelpro',
    renotify: !!payload.tag,
    data: { url: payload.url || '/' },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(payload.title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab on the same origin if any
      for (const client of clientList) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin && 'focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl);
            return;
          }
        } catch { /* ignore */ }
      }
      // Otherwise open a fresh window
      if (self.clients.openWindow) self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Browser rotated the subscription — try to re-subscribe with stored VAPID key
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(STATIC_CACHE);
      const stored = await cache.match('/_vapid_pubkey');
      let appKey = null;
      if (stored) appKey = await stored.text();
      else {
        // Best-effort: fetch from API
        const r = await fetch('/api/push/public-key');
        if (r.ok) { const j = await r.json(); appKey = j.public_key; }
      }
      if (!appKey) return;
      const arr = Uint8Array.from(atob((appKey + '='.repeat((4 - appKey.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
      await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr });
    } catch { /* ignore */ }
  })());
});
