/**
 * Local Storage utilities for medication management system
 * Provides safe storage and retrieval of user preferences and offline data
 */

// Storage keys
export const STORAGE_KEYS = {
    USER_PREFERENCES: 'medicationApp_preferences',
    OFFLINE_QUEUE: 'medicationApp_offlineQueue',
    CACHED_MEDICATIONS: 'medicationApp_cachedMedications',
    CACHED_SCHEDULE: 'medicationApp_cachedSchedule',
    LAST_SYNC: 'medicationApp_lastSync',
    APP_VERSION: 'medicationApp_version',
    NOTIFICATION_SETTINGS: 'medicationApp_notificationSettings',
    THEME_SETTINGS: 'medicationApp_themeSettings',
};

// Default values
export const DEFAULT_PREFERENCES = {
    theme: 'light',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    defaultView: 'dashboard',
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    showBuyAlerts: true,
    lowInventoryThreshold: 24, // hours
    enableNotifications: true,
    notificationSound: true,
    language: 'en',
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
    enabled: true,
    sound: true,
    vibration: true,
    medicationReminders: true,
    lowInventoryAlerts: true,
    systemUpdates: false,
    quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
    },
};

// Storage utilities
class LocalStorageManager {
    constructor() {
        this.isAvailable = this.checkAvailability();
    }

    // Check if localStorage is available
    checkAvailability() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('LocalStorage not available:', error);
            return false;
        }
    }

    // Safe get item with error handling
    getItem(key, defaultValue = null) {
        if (!this.isAvailable) {
            return defaultValue;
        }

        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage (${key}):`, error);
            return defaultValue;
        }
    }

    // Safe set item with error handling
    setItem(key, value) {
        if (!this.isAvailable) {
            console.warn('LocalStorage not available, cannot save:', key);
            return false;
        }

        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage (${key}):`, error);

            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded(key, value);
            }

            return false;
        }
    }

    // Remove item
    removeItem(key) {
        if (!this.isAvailable) {
            return false;
        }

        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from localStorage (${key}):`, error);
            return false;
        }
    }

    // Clear all app data
    clearAll() {
        if (!this.isAvailable) {
            return false;
        }

        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Handle quota exceeded by clearing old data
    handleQuotaExceeded(key, value) {
        console.warn('LocalStorage quota exceeded, attempting to free space');

        // Priority order for cleanup (least important first)
        const cleanupOrder = [
            STORAGE_KEYS.CACHED_SCHEDULE,
            STORAGE_KEYS.CACHED_MEDICATIONS,
            STORAGE_KEYS.OFFLINE_QUEUE,
        ];

        for (const cleanupKey of cleanupOrder) {
            if (cleanupKey !== key) {
                this.removeItem(cleanupKey);

                // Try to save again
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    console.log('Successfully saved after cleanup');
                    return;
                } catch (error) {
                    // Continue with next cleanup item
                }
            }
        }

        console.error('Unable to free enough space in localStorage');
    }

    // Get storage usage information
    getStorageInfo() {
        if (!this.isAvailable) {
            return null;
        }

        const info = {
            available: true,
            keys: {},
            totalSize: 0,
        };

        Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
            const item = localStorage.getItem(key);
            const size = item ? new Blob([item]).size : 0;

            info.keys[name] = {
                key,
                size,
                exists: !!item,
            };

            info.totalSize += size;
        });

        return info;
    }
}

// Create singleton instance
const storage = new LocalStorageManager();

// User preferences management
export const userPreferences = {
    get: () => storage.getItem(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES),

    set: (preferences) => storage.setItem(STORAGE_KEYS.USER_PREFERENCES, {
        ...DEFAULT_PREFERENCES,
        ...preferences,
    }),

    update: (updates) => {
        const current = userPreferences.get();
        return userPreferences.set({ ...current, ...updates });
    },

    reset: () => userPreferences.set(DEFAULT_PREFERENCES),

    getSetting: (key) => {
        const prefs = userPreferences.get();
        return prefs[key];
    },

    setSetting: (key, value) => {
        const prefs = userPreferences.get();
        prefs[key] = value;
        return userPreferences.set(prefs);
    },
};

// Notification settings management
export const notificationSettings = {
    get: () => storage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, DEFAULT_NOTIFICATION_SETTINGS),

    set: (settings) => storage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...settings,
    }),

    update: (updates) => {
        const current = notificationSettings.get();
        return notificationSettings.set({ ...current, ...updates });
    },

    reset: () => notificationSettings.set(DEFAULT_NOTIFICATION_SETTINGS),
};

// Offline queue management
export const offlineQueue = {
    get: () => storage.getItem(STORAGE_KEYS.OFFLINE_QUEUE, []),

    add: (operation) => {
        const queue = offlineQueue.get();
        const newOperation = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...operation,
        };
        queue.push(newOperation);
        return storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    },

    remove: (id) => {
        const queue = offlineQueue.get();
        const filtered = queue.filter(op => op.id !== id);
        return storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, filtered);
    },

    clear: () => storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, []),

    getCount: () => offlineQueue.get().length,
};

// Cached data management
export const cachedData = {
    // Medications cache
    medications: {
        get: () => storage.getItem(STORAGE_KEYS.CACHED_MEDICATIONS, null),
        set: (data) => storage.setItem(STORAGE_KEYS.CACHED_MEDICATIONS, {
            data,
            timestamp: new Date().toISOString(),
        }),
        isValid: (maxAge = 300000) => { // 5 minutes default
            const cached = cachedData.medications.get();
            if (!cached) return false;

            const age = Date.now() - new Date(cached.timestamp).getTime();
            return age < maxAge;
        },
        clear: () => storage.removeItem(STORAGE_KEYS.CACHED_MEDICATIONS),
    },

    // Schedule cache
    schedule: {
        get: (date) => {
            const allSchedules = storage.getItem(STORAGE_KEYS.CACHED_SCHEDULE, {});
            return allSchedules[date] || null;
        },
        set: (date, data) => {
            const allSchedules = storage.getItem(STORAGE_KEYS.CACHED_SCHEDULE, {});
            allSchedules[date] = {
                data,
                timestamp: new Date().toISOString(),
            };
            return storage.setItem(STORAGE_KEYS.CACHED_SCHEDULE, allSchedules);
        },
        isValid: (date, maxAge = 300000) => { // 5 minutes default
            const cached = cachedData.schedule.get(date);
            if (!cached) return false;

            const age = Date.now() - new Date(cached.timestamp).getTime();
            return age < maxAge;
        },
        clear: () => storage.removeItem(STORAGE_KEYS.CACHED_SCHEDULE),
        clearOld: (daysToKeep = 7) => {
            const allSchedules = storage.getItem(STORAGE_KEYS.CACHED_SCHEDULE, {});
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const filtered = {};
            Object.entries(allSchedules).forEach(([date, schedule]) => {
                if (new Date(date) >= cutoffDate) {
                    filtered[date] = schedule;
                }
            });

            return storage.setItem(STORAGE_KEYS.CACHED_SCHEDULE, filtered);
        },
    },
};

// Sync management
export const syncManager = {
    getLastSync: () => storage.getItem(STORAGE_KEYS.LAST_SYNC, null),

    setLastSync: (timestamp = new Date().toISOString()) =>
        storage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp),

    getTimeSinceLastSync: () => {
        const lastSync = syncManager.getLastSync();
        if (!lastSync) return null;

        return Date.now() - new Date(lastSync).getTime();
    },

    needsSync: (maxAge = 300000) => { // 5 minutes default
        const timeSince = syncManager.getTimeSinceLastSync();
        return timeSince === null || timeSince > maxAge;
    },
};

// App version management
export const appVersion = {
    get: () => storage.getItem(STORAGE_KEYS.APP_VERSION, null),
    set: (version) => storage.setItem(STORAGE_KEYS.APP_VERSION, version),

    checkForUpdate: (currentVersion) => {
        const storedVersion = appVersion.get();
        if (!storedVersion) {
            appVersion.set(currentVersion);
            return { isFirstRun: true, isUpdate: false };
        }

        const isUpdate = storedVersion !== currentVersion;
        if (isUpdate) {
            appVersion.set(currentVersion);
        }

        return { isFirstRun: false, isUpdate, previousVersion: storedVersion };
    },
};

// Cleanup utilities
export const cleanup = {
    // Remove expired cache entries
    removeExpiredCache: () => {
        cachedData.schedule.clearOld();

        // Check if medications cache is expired
        if (!cachedData.medications.isValid()) {
            cachedData.medications.clear();
        }
    },

    // Perform full cleanup
    performMaintenance: () => {
        cleanup.removeExpiredCache();

        // Log storage info
        const info = storage.getStorageInfo();
        if (info) {
            console.log('Storage maintenance completed. Usage:', info);
        }
    },
};

// Export the storage manager instance
export default storage;

// Export utility functions
export {
    storage as localStorage,
    LocalStorageManager,
};