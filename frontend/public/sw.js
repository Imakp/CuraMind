// Service Worker for Medication Management System
// Provides offline functionality and caching

const CACHE_NAME = 'medication-app-v1';
const STATIC_CACHE_NAME = 'medication-app-static-v1';
const API_CACHE_NAME = 'medication-app-api-v1';

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/static/js/bundle.js',
    '/static/css/main.css',
    // Add other static assets as needed
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/medications',
    '/api/schedule/daily',
    '/api/settings/routes',
    '/api/settings/frequencies',
    '/api/notifications',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE_NAME).then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, { cache: 'reload' })));
            }),
            // Initialize API cache
            caches.open(API_CACHE_NAME).then((cache) => {
                console.log('Service Worker: Initializing API cache');
                return Promise.resolve();
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            // Force activation of new service worker
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== API_CACHE_NAME && 
                        cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            // Take control of all pages
            return self.clients.claim();
        })
    );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests for caching
    if (request.method !== 'GET') {
        // For POST/PUT/DELETE requests, try network first
        event.respondWith(handleMutationRequest(request));
        return;
    }

    // Handle different types of requests
    if (url.pathname.startsWith('/api/')) {
        // API requests - network first with cache fallback
        event.respondWith(handleApiRequest(request));
    } else {
        // Static files - cache first with network fallback
        event.respondWith(handleStaticRequest(request));
    }
});

// Handle API requests (network first, cache fallback)
async function handleApiRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(API_CACHE_NAME);
            
            // Only cache GET requests for specific endpoints
            if (shouldCacheApiEndpoint(url.pathname)) {
                cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
        }
        
        throw new Error(`Network response not ok: ${networkResponse.status}`);
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache for:', request.url);
        
        // Try cache fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Add offline indicator header
            const response = cachedResponse.clone();
            response.headers.set('X-Served-By', 'service-worker-cache');
            return response;
        }
        
        // Return offline response for specific endpoints
        return createOfflineResponse(url.pathname);
    }
}

// Handle static file requests (cache first, network fallback)
async function handleStaticRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache the response
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Failed to fetch static resource:', request.url);
        
        // Return fallback for HTML requests
        if (request.destination === 'document') {
            const cache = await caches.open(STATIC_CACHE_NAME);
            return cache.match('/index.html');
        }
        
        throw error;
    }
}

// Handle mutation requests (POST, PUT, DELETE)
async function handleMutationRequest(request) {
    try {
        // Try network first
        const response = await fetch(request);
        
        if (response.ok) {
            // Invalidate related cache entries on successful mutations
            await invalidateRelatedCache(request);
        }
        
        return response;
    } catch (error) {
        console.log('Service Worker: Mutation request failed:', request.url);
        
        // Store failed requests for retry when online
        await storeFailedRequest(request);
        
        // Return a response indicating the request was queued
        return new Response(
            JSON.stringify({
                success: false,
                queued: true,
                message: 'Request queued for when connection is restored',
                timestamp: new Date().toISOString()
            }),
            {
                status: 202, // Accepted
                headers: {
                    'Content-Type': 'application/json',
                    'X-Queued-Request': 'true'
                }
            }
        );
    }
}

// Check if API endpoint should be cached
function shouldCacheApiEndpoint(pathname) {
    return API_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
}

// Create offline response for specific endpoints
function createOfflineResponse(pathname) {
    let offlineData = {};
    
    if (pathname.startsWith('/api/medications')) {
        offlineData = {
            data: [],
            message: 'Offline - showing cached data',
            offline: true
        };
    } else if (pathname.startsWith('/api/schedule/daily')) {
        offlineData = {
            data: {
                total_medications: 0,
                total_doses: 0,
                schedule: {},
                skipped_medications: []
            },
            message: 'Offline - no schedule data available',
            offline: true
        };
    } else if (pathname.startsWith('/api/notifications')) {
        offlineData = {
            data: [],
            message: 'Offline - no notifications available',
            offline: true
        };
    } else {
        offlineData = {
            error: {
                message: 'Service unavailable offline',
                code: 'OFFLINE'
            }
        };
    }
    
    return new Response(JSON.stringify(offlineData), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'X-Served-By': 'service-worker-offline'
        }
    });
}

// Invalidate cache entries related to a mutation
async function invalidateRelatedCache(request) {
    const url = new URL(request.url);
    const cache = await caches.open(API_CACHE_NAME);
    
    // Invalidate related cache entries based on the request
    if (url.pathname.includes('/medications')) {
        // Invalidate medication-related caches
        const keys = await cache.keys();
        const medicationKeys = keys.filter(key => 
            key.url.includes('/api/medications') || 
            key.url.includes('/api/schedule')
        );
        
        await Promise.all(medicationKeys.map(key => cache.delete(key)));
    }
}

// Store failed requests for retry
async function storeFailedRequest(request) {
    try {
        const requestData = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: request.method !== 'GET' ? await request.text() : null,
            timestamp: new Date().toISOString()
        };
        
        // Store in IndexedDB or localStorage
        const existingRequests = JSON.parse(
            localStorage.getItem('sw_failed_requests') || '[]'
        );
        
        existingRequests.push(requestData);
        localStorage.setItem('sw_failed_requests', JSON.stringify(existingRequests));
        
        console.log('Service Worker: Stored failed request for retry');
    } catch (error) {
        console.error('Service Worker: Failed to store request for retry:', error);
    }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
            });
            break;
            
        case 'RETRY_FAILED_REQUESTS':
            retryFailedRequests().then(results => {
                event.ports[0].postMessage({ type: 'RETRY_RESULTS', payload: results });
            });
            break;
            
        default:
            console.log('Service Worker: Unknown message type:', type);
    }
});

// Get cache status
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        status[cacheName] = keys.length;
    }
    
    return status;
}

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('Service Worker: All caches cleared');
}

// Retry failed requests
async function retryFailedRequests() {
    try {
        const failedRequests = JSON.parse(
            localStorage.getItem('sw_failed_requests') || '[]'
        );
        
        if (failedRequests.length === 0) {
            return { success: 0, failed: 0 };
        }
        
        const results = { success: 0, failed: 0 };
        
        for (const requestData of failedRequests) {
            try {
                const response = await fetch(requestData.url, {
                    method: requestData.method,
                    headers: requestData.headers,
                    body: requestData.body
                });
                
                if (response.ok) {
                    results.success++;
                } else {
                    results.failed++;
                }
            } catch (error) {
                results.failed++;
            }
        }
        
        // Clear the failed requests if any succeeded
        if (results.success > 0) {
            localStorage.removeItem('sw_failed_requests');
        }
        
        return results;
    } catch (error) {
        console.error('Service Worker: Error retrying failed requests:', error);
        return { success: 0, failed: 0, error: error.message };
    }
}

// Background sync for retrying failed requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'retry-failed-requests') {
        event.waitUntil(retryFailedRequests());
    }
});

console.log('Service Worker: Script loaded');