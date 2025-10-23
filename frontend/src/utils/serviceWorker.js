/**
 * Service Worker registration and management utilities
 */

// Check if service workers are supported
export const isServiceWorkerSupported = () => {
    return 'serviceWorker' in navigator;
};

// Register service worker
export const registerServiceWorker = async () => {
    if (!isServiceWorkerSupported()) {
        console.log('Service Worker: Not supported in this browser');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        console.log('Service Worker: Registered successfully', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker is available
                        console.log('Service Worker: New version available');

                        // Notify the app about the update
                        window.dispatchEvent(new CustomEvent('sw-update-available', {
                            detail: { registration }
                        }));
                    }
                });
            }
        });

        return registration;
    } catch (error) {
        console.error('Service Worker: Registration failed', error);
        return null;
    }
};

// Unregister service worker
export const unregisterServiceWorker = async () => {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const result = await registration.unregister();
            console.log('Service Worker: Unregistered successfully');
            return result;
        }
        return false;
    } catch (error) {
        console.error('Service Worker: Unregistration failed', error);
        return false;
    }
};

// Update service worker
export const updateServiceWorker = async () => {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.update();
            console.log('Service Worker: Update check completed');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Service Worker: Update failed', error);
        return false;
    }
};

// Skip waiting and activate new service worker
export const skipWaitingAndActivate = async () => {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
            // Send message to service worker to skip waiting
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });

            // Wait for the new service worker to take control
            return new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('Service Worker: New version activated');
                    resolve(true);
                }, { once: true });
            });
        }
        return false;
    } catch (error) {
        console.error('Service Worker: Skip waiting failed', error);
        return false;
    }
};

// Get cache status
export const getCacheStatus = async () => {
    if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
        return null;
    }

    return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'CACHE_STATUS') {
                resolve(event.data.payload);
            } else {
                reject(new Error('Unexpected response'));
            }
        };

        navigator.serviceWorker.controller.postMessage(
            { type: 'GET_CACHE_STATUS' },
            [messageChannel.port2]
        );
    });
};

// Clear all caches
export const clearAllCaches = async () => {
    if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
        return false;
    }

    return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'CACHE_CLEARED') {
                resolve(true);
            } else {
                reject(new Error('Unexpected response'));
            }
        };

        navigator.serviceWorker.controller.postMessage(
            { type: 'CLEAR_CACHE' },
            [messageChannel.port2]
        );
    });
};

// Retry failed requests
export const retryFailedRequests = async () => {
    if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
        return null;
    }

    return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'RETRY_RESULTS') {
                resolve(event.data.payload);
            } else {
                reject(new Error('Unexpected response'));
            }
        };

        navigator.serviceWorker.controller.postMessage(
            { type: 'RETRY_FAILED_REQUESTS' },
            [messageChannel.port2]
        );
    });
};

// Check if app is running in standalone mode (PWA)
export const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
};

// Get network status
export const getNetworkStatus = () => {
    return {
        online: navigator.onLine,
        connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
        effectiveType: navigator.connection?.effectiveType || 'unknown',
        downlink: navigator.connection?.downlink || 0,
        rtt: navigator.connection?.rtt || 0,
    };
};

// Service worker event listeners
export const setupServiceWorkerListeners = (callbacks = {}) => {
    if (!isServiceWorkerSupported()) {
        return () => { }; // Return empty cleanup function
    }

    const {
        onUpdateAvailable = () => { },
        onUpdateReady = () => { },
        onOffline = () => { },
        onOnline = () => { },
        onControllerChange = () => { },
    } = callbacks;

    // Service worker update available
    const handleUpdateAvailable = (event) => {
        onUpdateAvailable(event.detail);
    };

    // Network status changes
    const handleOffline = () => {
        console.log('App: Gone offline');
        onOffline();
    };

    const handleOnline = () => {
        console.log('App: Back online');
        onOnline();

        // Retry failed requests when back online
        retryFailedRequests().then(results => {
            if (results && (results.success > 0 || results.failed > 0)) {
                console.log('Service Worker: Retry results:', results);
            }
        });
    };

    // Service worker controller change
    const handleControllerChange = () => {
        console.log('Service Worker: Controller changed');
        onControllerChange();
    };

    // Add event listeners
    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    // Return cleanup function
    return () => {
        window.removeEventListener('sw-update-available', handleUpdateAvailable);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);

        if (navigator.serviceWorker) {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        }
    };
};

// Initialize service worker with default configuration
export const initializeServiceWorker = async (options = {}) => {
    const {
        enableAutoUpdate = true,
        updateCheckInterval = 60000, // 1 minute
        onUpdateAvailable,
        onOffline,
        onOnline,
    } = options;

    try {
        // Register service worker
        const registration = await registerServiceWorker();

        if (!registration) {
            console.log('Service Worker: Registration failed or not supported');
            return null;
        }

        // Setup event listeners
        const cleanup = setupServiceWorkerListeners({
            onUpdateAvailable: (detail) => {
                console.log('Service Worker: Update available');
                if (onUpdateAvailable) {
                    onUpdateAvailable(detail);
                }
            },
            onOffline: () => {
                console.log('App: Offline mode activated');
                if (onOffline) {
                    onOffline();
                }
            },
            onOnline: () => {
                console.log('App: Online mode restored');
                if (onOnline) {
                    onOnline();
                }
            },
        });

        // Setup automatic update checks
        let updateInterval;
        if (enableAutoUpdate) {
            updateInterval = setInterval(() => {
                updateServiceWorker();
            }, updateCheckInterval);
        }

        // Return service worker manager
        return {
            registration,
            cleanup: () => {
                cleanup();
                if (updateInterval) {
                    clearInterval(updateInterval);
                }
            },
            update: updateServiceWorker,
            skipWaiting: skipWaitingAndActivate,
            getCacheStatus,
            clearCaches: clearAllCaches,
            retryFailedRequests,
            getNetworkStatus,
            isStandalone: isStandalone(),
        };
    } catch (error) {
        console.error('Service Worker: Initialization failed', error);
        return null;
    }
};