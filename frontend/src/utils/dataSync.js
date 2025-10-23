/**
 * Data synchronization utilities for offline/online data management
 */

import { offlineQueue, cachedData, syncManager } from './localStorage';
import { medicationApi, scheduleApi } from './apiClient';

// Sync status constants
export const SYNC_STATUS = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SUCCESS: 'success',
    ERROR: 'error',
    CONFLICT: 'conflict',
};

// Sync event types
export const SYNC_EVENTS = {
    START: 'sync:start',
    PROGRESS: 'sync:progress',
    SUCCESS: 'sync:success',
    ERROR: 'sync:error',
    COMPLETE: 'sync:complete',
};

class DataSynchronizer {
    constructor() {
        this.status = SYNC_STATUS.IDLE;
        this.listeners = new Map();
        this.syncInProgress = false;
        this.lastSyncResult = null;
    }

    // Add event listener
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    // Remove event listener
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    // Emit event
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Sync event listener error:', error);
                }
            });
        }
    }

    // Check if sync is needed
    needsSync() {
        return syncManager.needsSync() || offlineQueue.getCount() > 0;
    }

    // Perform full synchronization
    async sync(options = {}) {
        if (this.syncInProgress) {
            console.log('Sync already in progress');
            return this.lastSyncResult;
        }

        const {
            force = false,
            includeCache = true,
            retryFailedOperations = true,
        } = options;

        this.syncInProgress = true;
        this.status = SYNC_STATUS.SYNCING;

        const syncResult = {
            startTime: new Date().toISOString(),
            endTime: null,
            success: false,
            operations: {
                queued: 0,
                successful: 0,
                failed: 0,
            },
            cache: {
                medications: false,
                schedule: false,
            },
            errors: [],
        };

        this.emit(SYNC_EVENTS.START, { force, includeCache });

        try {
            // Step 1: Process offline queue
            if (retryFailedOperations) {
                await this.processOfflineQueue(syncResult);
            }

            // Step 2: Sync cached data
            if (includeCache) {
                await this.syncCachedData(syncResult);
            }

            // Step 3: Update last sync timestamp
            syncManager.setLastSync();

            syncResult.success = true;
            syncResult.endTime = new Date().toISOString();
            this.status = SYNC_STATUS.SUCCESS;

            this.emit(SYNC_EVENTS.SUCCESS, syncResult);

        } catch (error) {
            console.error('Sync failed:', error);

            syncResult.success = false;
            syncResult.endTime = new Date().toISOString();
            syncResult.errors.push({
                type: 'sync_error',
                message: error.message,
                timestamp: new Date().toISOString(),
            });

            this.status = SYNC_STATUS.ERROR;
            this.emit(SYNC_EVENTS.ERROR, { error, syncResult });

        } finally {
            this.syncInProgress = false;
            this.lastSyncResult = syncResult;

            this.emit(SYNC_EVENTS.COMPLETE, syncResult);
        }

        return syncResult;
    }

    // Process offline queue operations
    async processOfflineQueue(syncResult) {
        const queue = offlineQueue.get();
        syncResult.operations.queued = queue.length;

        if (queue.length === 0) {
            return;
        }

        this.emit(SYNC_EVENTS.PROGRESS, {
            step: 'processing_queue',
            total: queue.length,
            completed: 0,
        });

        for (let i = 0; i < queue.length; i++) {
            const operation = queue[i];

            try {
                await this.processQueuedOperation(operation);
                offlineQueue.remove(operation.id);
                syncResult.operations.successful++;

                this.emit(SYNC_EVENTS.PROGRESS, {
                    step: 'processing_queue',
                    total: queue.length,
                    completed: i + 1,
                    operation: operation.type,
                });

            } catch (error) {
                console.error('Failed to process queued operation:', error);

                syncResult.operations.failed++;
                syncResult.errors.push({
                    type: 'queue_operation_error',
                    operation: operation.id,
                    message: error.message,
                    timestamp: new Date().toISOString(),
                });

                // Remove operation if it's too old or has failed too many times
                if (this.shouldRemoveFailedOperation(operation)) {
                    offlineQueue.remove(operation.id);
                }
            }
        }
    }

    // Process a single queued operation
    async processQueuedOperation(operation) {
        const { type, endpoint, method, data, headers } = operation;

        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    // Check if a failed operation should be removed
    shouldRemoveFailedOperation(operation) {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const operationAge = Date.now() - new Date(operation.timestamp).getTime();

        return operationAge > maxAge;
    }

    // Sync cached data with server
    async syncCachedData(syncResult) {
        this.emit(SYNC_EVENTS.PROGRESS, {
            step: 'syncing_cache',
            total: 2,
            completed: 0,
        });

        // Sync medications if cache is invalid or force refresh
        if (!cachedData.medications.isValid()) {
            try {
                const medications = await medicationApi.getAll();
                cachedData.medications.set(medications.data || []);
                syncResult.cache.medications = true;

                this.emit(SYNC_EVENTS.PROGRESS, {
                    step: 'syncing_cache',
                    total: 2,
                    completed: 1,
                    item: 'medications',
                });

            } catch (error) {
                console.error('Failed to sync medications:', error);
                syncResult.errors.push({
                    type: 'cache_sync_error',
                    item: 'medications',
                    message: error.message,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        // Sync today's schedule if cache is invalid
        const today = new Date().toISOString().split('T')[0];
        if (!cachedData.schedule.isValid(today)) {
            try {
                const response = await fetch(`/api/schedule/daily?date=${today}`);
                const result = await response.json();

                if (response.ok) {
                    cachedData.schedule.set(today, result.data);
                    syncResult.cache.schedule = true;
                }

                this.emit(SYNC_EVENTS.PROGRESS, {
                    step: 'syncing_cache',
                    total: 2,
                    completed: 2,
                    item: 'schedule',
                });

            } catch (error) {
                console.error('Failed to sync schedule:', error);
                syncResult.errors.push({
                    type: 'cache_sync_error',
                    item: 'schedule',
                    message: error.message,
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }

    // Get sync status
    getStatus() {
        return {
            status: this.status,
            inProgress: this.syncInProgress,
            lastSync: syncManager.getLastSync(),
            timeSinceLastSync: syncManager.getTimeSinceLastSync(),
            needsSync: this.needsSync(),
            queuedOperations: offlineQueue.getCount(),
            lastResult: this.lastSyncResult,
        };
    }

    // Force sync
    async forceSync() {
        return this.sync({ force: true, includeCache: true });
    }

    // Sync only offline queue
    async syncQueue() {
        return this.sync({ force: false, includeCache: false });
    }

    // Sync only cache
    async syncCache() {
        return this.sync({ force: false, includeCache: true, retryFailedOperations: false });
    }

    // Clear all cached data and force full sync
    async clearAndSync() {
        cachedData.medications.clear();
        cachedData.schedule.clear();
        return this.forceSync();
    }
}

// Create singleton instance
const dataSynchronizer = new DataSynchronizer();

// Auto-sync when coming back online
let autoSyncEnabled = true;

const handleOnline = () => {
    if (autoSyncEnabled && dataSynchronizer.needsSync()) {
        console.log('Back online, starting auto-sync...');
        dataSynchronizer.sync().catch(error => {
            console.error('Auto-sync failed:', error);
        });
    }
};

// Setup auto-sync listeners
if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
}

// Periodic sync check (every 5 minutes when online)
let periodicSyncInterval;

const startPeriodicSync = (interval = 5 * 60 * 1000) => {
    if (periodicSyncInterval) {
        clearInterval(periodicSyncInterval);
    }

    periodicSyncInterval = setInterval(() => {
        if (navigator.onLine && dataSynchronizer.needsSync()) {
            dataSynchronizer.sync().catch(error => {
                console.error('Periodic sync failed:', error);
            });
        }
    }, interval);
};

const stopPeriodicSync = () => {
    if (periodicSyncInterval) {
        clearInterval(periodicSyncInterval);
        periodicSyncInterval = null;
    }
};

// Configuration
export const syncConfig = {
    enableAutoSync: (enabled = true) => {
        autoSyncEnabled = enabled;
    },

    enablePeriodicSync: (interval = 5 * 60 * 1000) => {
        startPeriodicSync(interval);
    },

    disablePeriodicSync: () => {
        stopPeriodicSync();
    },

    isAutoSyncEnabled: () => autoSyncEnabled,
    isPeriodicSyncEnabled: () => !!periodicSyncInterval,
};

// Export the synchronizer instance and utilities
export default dataSynchronizer;

export {
    dataSynchronizer as dataSync,
    DataSynchronizer,
};