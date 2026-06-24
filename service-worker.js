const CACHE_NAME = 'budget-manager-v3';
const ASSETS = ['/'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS).catch(err => {
                console.log('Cache addAll error (nem kritikus):', err);
            });
        })
    );
});

self.addEventListener('fetch', event => {
    // Csak http/https kéréseket kezelünk
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).then(response => {
                // Csak sikeres válaszokat cache-elünk
                if (!response || response.status !== 200) {
                    return response;
                }
                
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                
                return response;
            }).catch(err => {
                console.log('Fetch error (lehet offline):', err);
                return new Response('Offline mód - az alkalmazás nem elérhető', {
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
