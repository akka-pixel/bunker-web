// ============================================================================
// PSG BUNKER — PHONE-FIRST UI VAULT & INSTANT OWNER ROLLOUT SERVICE WORKER
// Stores the complete UI shell in the student's phone on the first visit
// (0ms load, 0 CDN requests on subsequent opens — only fetches /api/* data).
// When the owner updates any UI file, CACHE_NAME changes automatically,
// deleting all old cached UI and rolling out the new UI to all phones.
// ============================================================================
const UI_VERSION = 'bunker-ui-036d03cb8f';
const CACHE_NAME = UI_VERSION;

const COMPLETE_UI_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/static/manifest.json',
    '/static/style.css?v=4.2.1',
    '/static/app.js?v=4.3.3',
    '/static/calendar.js?v=4.0.0',
    '/static/calendar.css',
    '/static/legal.js?v=1.0.1',
    '/static/all_calendars_cache.json',
    '/static/favicon.svg',
    '/static/favicon.png',
    '/static/favicon.ico',
    '/static/apple-touch-icon.png',
    '/static/icon.png',
    '/static/icon-192.png',
    '/static/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                COMPLETE_UI_ASSETS.map((url) =>
                    fetch(url, { cache: 'reload' })
                        .then((res) => {
                            if (res && res.status === 200) {
                                return cache.put(url, res);
                            }
                            return null;
                        })
                        .catch(() => cache.add(url).catch(() => null))
                )
            );
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                    return null;
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }
    if (data.type === 'PURGE_AND_ROLL_UI') {
        event.waitUntil(
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                .then(() => caches.open(CACHE_NAME))
                .then((cache) =>
                    Promise.allSettled(
                        COMPLETE_UI_ASSETS.map((url) =>
                            fetch(url, { cache: 'reload' })
                                .then((res) => (res && res.status === 200 ? cache.put(url, res) : null))
                                .catch(() => null)
                        )
                    )
                )
        );
    }
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // 1. Never intercept cross-origin live calendar requests (direct phone fetch to PSG Tech),
    //    real-time student data API calls (/api/*), or UI version probe (/ui-version.json)
    if (
        url.origin !== self.location.origin ||
        url.pathname.startsWith('/api/') ||
        url.pathname.endsWith('/ui-version.json') ||
        url.pathname.endsWith('/sw.js')
    ) {
        return;
    }

    // 1b. Network-first with phone cache fallback for Vercel calendar cache bundle
    if (url.pathname.endsWith('/all_calendars_cache.json')) {
        event.respondWith(
            fetch(req)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const clone = networkRes.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
                    }
                    return networkRes;
                })
                .catch(() => caches.match(req, { ignoreSearch: true }))
        );
        return;
    }

    // 2. PHONE CACHE-FIRST for complete UI shell (HTML, CSS, JS, JSON, Icons, Fonts, CDN libraries)
    //    Once cached on the first visit, the phone serves the entire UI locally in 0ms (0 Vercel CDN requests).
    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // First visit or newly rolled-out UI: fetch from network and store in phone cache
            return fetch(req)
                .then((networkRes) => {
                    if (
                        networkRes &&
                        networkRes.status === 200 &&
                        (networkRes.type === 'basic' || networkRes.type === 'cors') &&
                        !req.url.startsWith('chrome-extension')
                    ) {
                        const copy = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(req, copy);
                        });
                    }
                    return networkRes;
                })
                .catch(() => {
                    if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
                        return caches.match('/index.html', { ignoreSearch: true }) || caches.match('/', { ignoreSearch: true });
                    }
                    return new Response('Offline', { status: 503, statusText: 'Offline' });
                });
        })
    );
});
