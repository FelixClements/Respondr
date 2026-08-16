const CACHE_NAME = 'respondr-v2';
const STATIC_ASSETS = [
  '/static/style.css?v=5',
  '/static/app.js?v=3',
  '/static/status.js?v=4',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith('/static/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg');

  const isPage =
    url.pathname === '/' ||
    url.pathname === '/chats' ||
    url.pathname === '/settings' ||
    url.pathname === '/notifications' ||
    url.pathname === '/logs' ||
    url.pathname === '/history' ||
    url.pathname === '/ignored' ||
    url.pathname === '/qr' ||
    url.pathname === '/login';

  const isApi = url.pathname.startsWith('/api/');

  if (!isStatic && !isPage && !isApi) return;

  function fromCache(request) {
    return caches.match(request);
  }

  function updateCache(request, response) {
    if (response && response.status === 200 && response.type === 'basic') {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
  }

  // Static assets: cache-first, update in background
  if (isStatic) {
    event.respondWith(
      fromCache(event.request).then((cached) => {
        const fetched = fetch(event.request)
          .then((response) => {
            updateCache(event.request, response);
            return response;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // Pages and API: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        updateCache(event.request, response);
        return response;
      })
      .catch(() => fromCache(event.request))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: event.data ? event.data.text() : 'Respondr' };
  }

  const title = payload.title || 'Respondr';
  const options = {
    body: payload.body || 'You have a new notification',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/' },
    requireInteraction: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).pathname === target && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(target);
      })
  );
});
