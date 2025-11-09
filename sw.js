// sw.js (最小限のキャッシュファースト戦略)

const CACHE_NAME = 'crossroad-navigator-cache-v1';
const urlsToCache = [
    'index.html',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap'
];

// インストールイベント
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // 必須アセットのキャッシュ
                // cdn.tailwindcss.com はfetchエラーになることがあるため、
                // リクエストだけ作成し、失敗してもインストールは続行する
                const tailwindRequest = new Request('https://cdn.tailwindcss.com', { mode: 'no-cors' });
                cache.add(tailwindRequest).catch(err => console.warn('Tailwind CSS cache failed (expected in no-cors):', err));
                
                // 他のアセットは通常通りキャッシュ
                return cache.addAll(urlsToCache.filter(url => !url.includes('tailwindcss')));
            })
    );
});

// フェッチイベント (キャッシュファースト)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // キャッシュがあればそれを返す
                if (response) {
                    return response;
                }
                
                // キャッシュがなければネットワークから取得
                return fetch(event.request).then(
                    response => {
                        // ネットワークから取得したレスポンスが有効かチェック
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            if (event.request.url.includes('placehold.co')) return response; // プレースホルダー画像はそのまま返す
                            // no-corsリクエスト（Tailwindなど）は opaque レスポンスになる
                            if (response && response.type === 'opaque') {
                                // オペークレスポンスをキャッシュ（コピー）
                                let responseToCache = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request, responseToCache);
                                    });
                                return response;
                            }
                        }

                        // 有効なレスポンスをキャッシュして返す
                        let responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                ).catch(err => {
                    // ネットワークエラー
                    console.error('Fetch error:', err);
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
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
