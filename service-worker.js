// service-worker.js — Budget Manager PWA
// Cache-first stratégia: minden helyi asset és CDN erőforrás cache-elése

const CACHE_NAME = 'budget-manager-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icon-192.svg',
  './icon-512.svg'
];

// CDN erőforrások, amiket first-use után cache-elünk
const CDN_PREFIXES = [
  'https://unpkg.com/dexie',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/tesseract.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js'
];

// Telepítés: azonnal cache-eljük az összes helyi assetet
self.addEventListener('install', event => {
  console.log('[SW] Install — cache-elés');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cache megnyitva, assetek hozzáadása');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] Cache addAll hiba (néhány fájl lehet hiányzik):', err);
      });
    })
  );
  // Azonnal aktiválódjon, ne várjon a régi SW lezárására
  self.skipWaiting();
});

// Aktiválás: régi cache-ek törlése
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Régi cache törlése:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Az új SW azonnal átveszi az irányítást
  return self.clients.claim();
});

// Fetch: cache-first, hálózati fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Csak GET kéréseket cache-elünk
  if (event.request.method !== 'GET') return;

  // CDN erőforrások: cache-first használat után
  const isCDN = CDN_PREFIXES.some(prefix => url.href.startsWith(prefix));

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Cache találat — azonnal visszaadjuk
        return cachedResponse;
      }

      // Nincs cache-ben: hálózati kérés
      return fetch(event.request).then(response => {
        // Csak sikeres válaszokat cache-elünk
        if (!response || response.status !== 200 || response.type !== 'basic' && !isCDN) {
          return response;
        }

        // Klónozzuk a választ, mert a cache.put és a visszaadás is elfogyasztja
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Hálózati hiba esetén — ha van cached válasz, azt adjuk
        // (itt már nincs, mert fentebb nem volt találat)
        return new Response('Offline — Az erőforrás nem elérhető.', {
          status: 503,
          statusText: 'Offline'
        });
      });
    })
  );
});

// Üzenetkezelés: skipWaiting hívás a kliensből
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
