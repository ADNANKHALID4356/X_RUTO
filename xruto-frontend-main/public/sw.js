const CACHE_NAME = 'xruto-v1.0.0';
const STATIC_CACHE_NAME = 'xruto-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'xruto-dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/App.css',
  '/src/index.css',
  // Add your main CSS and JS files here when built
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
  '/api/orders/eligible',
  '/api/orders/get-routes',
  '/api/admin/drivers',
  '/api/admin/depots',
  '/api/admin/settings'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Default: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Network-first strategy for API requests (with offline fallback)
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API request failed, checking cache:', url.pathname);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', url.pathname);
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (url.pathname === '/api/orders/eligible') {
      return new Response(JSON.stringify({
        success: false,
        offline: true,
        message: 'You are offline. Please check your connection.',
        orders: []
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    throw error;
  }
}

// Cache-first strategy for static assets
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests (SPA routing)
async function handleNavigation(request) {
  try {
    // Try network first for navigation
    return await fetch(request);
  } catch (error) {
    // Fallback to cached index.html for SPA
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ultimate fallback - offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>xRuto - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0D0B1F; color: white; }
            .offline-container { max-width: 400px; margin: 0 auto; }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>xRuto Delivery System</h1>
            <h2>You're Offline</h2>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 200
    });
  }
}

// Helper function to identify static assets
function isStaticAsset(url) {
  return url.includes('/assets/') || 
         url.includes('.js') || 
         url.includes('.css') || 
         url.includes('.png') || 
         url.includes('.jpg') || 
         url.includes('.svg') || 
         url.includes('.ico');
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'delivery-status-update') {
    event.waitUntil(syncDeliveryStatusUpdates());
  }
  
  if (event.tag === 'upload-orders') {
    event.waitUntil(syncOrderUploads());
  }
});

// Sync delivery status updates when back online
async function syncDeliveryStatusUpdates() {
  try {
    const pendingUpdates = await getStoredUpdates('delivery-updates');
    
    for (const update of pendingUpdates) {
      try {
        await fetch('/api/orders/delivery-status/' + update.orderId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update.data)
        });
        
        // Remove from storage after successful sync
        await removeStoredUpdate('delivery-updates', update.id);
        console.log('[SW] Synced delivery update:', update.orderId);
      } catch (error) {
        console.error('[SW] Failed to sync delivery update:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync order uploads when back online
async function syncOrderUploads() {
  try {
    const pendingOrders = await getStoredUpdates('order-uploads');
    
    for (const orderUpload of pendingOrders) {
      try {
        await fetch('/api/orders/upload-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderUpload.data)
        });
        
        await removeStoredUpdate('order-uploads', orderUpload.id);
        console.log('[SW] Synced order upload:', orderUpload.id);
      } catch (error) {
        console.error('[SW] Failed to sync order upload:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Helper functions for IndexedDB storage (simplified)
async function getStoredUpdates(storeName) {
  // Implement IndexedDB operations for offline storage
  return []; // Placeholder
}

async function removeStoredUpdate(storeName, id) {
  // Implement IndexedDB remove operation
  return true; // Placeholder
}

// Push notification handling
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New delivery update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('xRuto Delivery Update', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/driver-routes')
    );
  }
});

console.log('[SW] Service Worker script loaded successfully');