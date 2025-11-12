// sw.js (最小限のキャッシュファースト戦略)

const CACHE_NAME = 'crossroad-navigator-cache-v1';
const urlsToCache = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap'
];

// インストールイベント
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Tailwind は no-cors（opaque）で入れる
        const tailwindRequest = new Request('https://cdn.tailwindcss.com', { mode: 'no-cors' });
        cache.add(tailwindRequest).catch(err => console.warn('Tailwind CSS cache failed (expected in no-cors):', err));

        // それ以外を通常キャッシュ
        const rest = urlsToCache.filter(url => url !== 'https://cdn.tailwindcss.com');
        return cache.addAll(rest);
      })
      .then(() => self.skipWaiting())
  );
});

// フェッチイベント (キャッシュファースト)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      return fetch(event.request).then(networkResponse => {
        // 有効レスポンスをキャッシュ
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const respClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        }
        return networkResponse;
      }).catch(err => {
        // ネットワークエラー時の簡易ハンドリング（必要ならプレースホルダ返却など）
        return caches.match('index.html');
      });
    })
  );
});

// Activateイベント (古いキャッシュの削除)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
