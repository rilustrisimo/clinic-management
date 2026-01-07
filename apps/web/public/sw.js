const CACHE_VERSION = 'v1';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  clients.claim();
  // Broadcast initial queue size
  event.waitUntil((async () => {
    const size = await countQueue().catch(() => 0);
    const cs = await self.clients.matchAll({ includeUncontrolled: true });
    cs.forEach((c) => c.postMessage({ type: 'QUEUE_SIZE', size }));
  })());
});

// Background Sync: on 'flush-mutations' trigger a flush broadcast
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-mutations') {
    event.waitUntil((async () => {
      const cs = await self.clients.matchAll({ includeUncontrolled: true });
      cs.forEach((c) => c.postMessage({ type: 'FLUSH_MUTATIONS' }));
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Navigation requests: network-first with cache fallback (for offline route shell)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(url.pathname, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(url.pathname) || await caches.match('/');
        if (cached) return cached;
        // offline fallback route
        return caches.match('/offline') || Response.error();
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  if (req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || req.destination === 'font') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => undefined);
      return cached || (await network) || Response.error();
    })());
  }
});

// Listen for client messages about queued mutations. In a real app, we'd open an IndexedDB in SW. As a stub, we trigger a ping back to clients to flush.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'MUTATIONS_AVAILABLE') {
    // Ask all clients to attempt a flush (client lib handles retries/backoff)
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      for (const c of clients) c.postMessage({ type: 'FLUSH_MUTATIONS' });
    });
    // Also broadcast current queue size
    countQueue().then((size)=>{
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        for (const c of clients) c.postMessage({ type: 'QUEUE_SIZE', size });
      });
    }).catch(()=>{});
  }
  if (data.type === 'FLUSH_RESULT') {
    const payload = { type: 'FLUSH_RESULT', result: data.result };
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      for (const c of clients) c.postMessage(payload);
    });
  }
  if (data.type === 'CONFLICT_DETECTED') {
    const payload = { type: 'CONFLICT_DETECTED' };
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      for (const c of clients) c.postMessage(payload);
    });
  }
  if (data.type === 'QUEUE_SIZE_REQUEST') {
    countQueue().then((size)=>{
      if (event.source && 'postMessage' in event.source) {
        event.source.postMessage({ type: 'QUEUE_SIZE', size });
      } else {
        self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
          for (const c of clients) c.postMessage({ type: 'QUEUE_SIZE', size });
        });
      }
    }).catch(()=>{});
  }
});

// ---- IndexedDB helpers in SW for queue size ----
function openDB(name, version, upgrade) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (e) => upgrade(req.result, req.result.version || 0, e);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function countQueue() {
  try {
    const db = await openDB('clinic-cache', 1, (db) => {
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { autoIncrement: true });
      }
    });
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('mutations', 'readonly');
      const store = tx.objectStore('mutations');
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return 0;
  }
}
