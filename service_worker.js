const CACHE_NAME = 'budget-manager-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Külső CDN assetek, amiket külön kell cache-elni
const CDN_ASSETS = [
    'https://unpkg.com/dexie/dist/dexie.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Először a helyi fájlokat cache-eljük
            return cache.addAll(ASSETS).then(() => {
                // Majd próbáljuk a CDN asseteket is
                return Promise.allSettled(
                    CDN_ASSETS.map(url => 
                        cache.add(url).catch(err => 
                            console.warn('Failed to cache CDN asset:', url, err)
                        )
                    )
                );
            });
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Ha cache-elve van, használjuk a cache-elt verziót
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // Ha nincs cache-elve, próbáljuk letölteni és cache-elni
            return fetch(event.request).then(response => {
                // Csak sikeres válaszokat cache-elünk
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                const responseToCache = response.clone();
                
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                
                return response;
            }).catch(error => {
                // Offline fallback
                console.warn('Fetch failed, returning offline page:', error);
                return new Response('Offline - Az alkalmazás nem elérhető', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            });
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});
