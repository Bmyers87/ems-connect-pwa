const CACHE_NAME = 'ems-connect-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
    // Add any other critical assets your app needs to function offline
];

// Install event: caching static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache during install:', error);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Ensures the service worker takes control of the page immediately
});

// Fetch event: serve from cache or network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and can only be consumed once. We must clone it so that
                        // the browser can consume one and we can consume the other.
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
            .catch((error) => {
                console.error('Fetch failed for:', event.request.url, error);
                // Optionally, return an offline page here
                // return caches.match('/offline.html');
            })
    );
});

// Push event: Handle incoming push notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'EMS Connect Alert';
    const options = {
        body: data.body || 'New update from EMS Connect.',
        icon: data.icon || '/icons/icon-192x192.png', // Default icon for notifications
        badge: data.badge || '/icons/icon-72x72.png', // Smaller icon for notifications (Android)
        data: {
            url: data.url || '/', // URL to open when notification is clicked
            // Any other data you want to associate with the notification
        },
        vibrate: [200, 100, 200], // Example vibration pattern
        actions: [
            {action: 'open_url', title: 'View App', icon: '/icons/icon-96x96.png'},
            {action: 'dismiss', title: 'Dismiss', icon: '/icons/icon-96x96.png'} // Example action
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event: Handle user interaction with notifications
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    if (event.action === 'open_url' && event.notification.data && event.notification.data.url) {
        // Open the app or a specific URL
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    } else {
        // Default behavior: open the app's start URL
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === self.location.origin + '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(self.location.origin + '/');
            })
        );
    }
});