// CanadaLawyers Service Worker
// Founder: Arthur Kostaras
// Version: 1.0.0

const CACHE_NAME = 'canadalawyers-v1.0.0';
const APP_PREFIX = 'canadalawyers-';
const VERSION = 'v1.0.0';
const CACHE_KEY = APP_PREFIX + VERSION;

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Slab:wght@400;700&display=swap'
];

// Dynamic cache for API calls and external resources
const DYNAMIC_CACHE = 'canadalawyers-dynamic-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('CanadaLawyers Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_KEY)
      .then((cache) => {
        console.log('CanadaLawyers Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('CanadaLawyers Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('CanadaLawyers Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('CanadaLawyers Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.indexOf(APP_PREFIX) === 0 && cacheName !== CACHE_KEY) {
              console.log('CanadaLawyers Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('CanadaLawyers Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('CanadaLawyers Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                console.log('CanadaLawyers Service Worker: Caching dynamic content:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.log('CanadaLawyers Service Worker: Network request failed:', error);
            
            // Serve offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // For other requests, you might want to return a default offline response
            return new Response('Offline - CanadaLawyers will sync when connection is restored', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('CanadaLawyers Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync operations here
      syncOfflineData()
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('CanadaLawyers Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update from CanadaLawyers',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
      },
      {
        action: 'close',
        title: 'Close',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CanadaLawyers', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('CanadaLawyers Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/index.html#slide-1')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/index.html')
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('CanadaLawyers Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage(VERSION);
  }
});

// Helper function for background sync
async function syncOfflineData() {
  try {
    console.log('CanadaLawyers Service Worker: Syncing offline data...');
    
    // Implement your offline data synchronization logic here
    // For example: sync user preferences, cached form data, etc.
    
    // Notify main app that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('CanadaLawyers Service Worker: Offline data sync complete');
  } catch (error) {
    console.error('CanadaLawyers Service Worker: Sync failed:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(
      syncOfflineData()
    );
  }
});

// Handle app updates
self.addEventListener('appinstalled', (event) => {
  console.log('CanadaLawyers PWA: App installed successfully');
});

// Performance monitoring
self.addEventListener('fetch', (event) => {
  const startTime = performance.now();
  
  event.respondWith(
    fetch(event.request).then((response) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log performance metrics (you could send these to analytics)
      console.log(`CanadaLawyers Performance: ${event.request.url} took ${duration}ms`);
      
      return response;
    })
  );
});

console.log('CanadaLawyers Service Worker: Script loaded successfully');
console.log('Founder: Arthur Kostaras');
console.log('Email: arthur@negotiateandwin.com');
console.log('Phone: 647.956.7290');
