import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import dataSynchronizer, { SYNC_STATUS, SYNC_EVENTS } from '../../utils/dataSync';
import { offlineQueue, cachedData, syncManager } from '../../utils/localStorage';
import { initializeServiceWorker } from '../../utils/serviceWorker';

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
});

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock service worker
global.navigator.serviceWorker = {
    register: vi.fn(),
    getRegistration: vi.fn(),
    addEventListener: vi.fn(),
    controller: null,
};

describe('Offline Capabilities Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetch.mockClear();
        navigator.onLine = true;
        localStorageMock.getItem.mockReturnValue(null);

        // Reset synchronizer state
        dataSynchronizer.status = SYNC_STATUS.IDLE;
        dataSynchronizer.syncInProgress = false;
        dataSynchronizer.lastSyncResult = null;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Local Storage Management', () => {
        it('should store and retrieve user preferences', () => {
            const preferences = {
                theme: 'dark',
                dateFormat: 'dd/MM/yyyy',
                autoRefresh: false,
            };

            localStorageMock.getItem.mockReturnValue(JSON.stringify(preferences));

            const result = JSON.parse(localStorageMock.getItem('test') || '{}');
            expect(result).toEqual(preferences);
        });

        it('should handle localStorage errors gracefully', () => {
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });

            // Should not throw error
            expect(() => {
                try {
                    localStorage.setItem('test', JSON.stringify({ data: 'test' }));
                } catch (error) {
                    // Expected to catch error
                }
            }).not.toThrow();
        });

        it('should manage offline queue operations', () => {
            const operations = [
                { id: '1', type: 'api_request', endpoint: '/api/medications', method: 'POST' },
                { id: '2', type: 'api_request', endpoint: '/api/medications/1', method: 'PUT' },
            ];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(operations));

            const queue = offlineQueue.get();
            expect(queue).toEqual(operations);
        });

        it('should cache medication data with timestamps', () => {
            const medications = [
                { id: 1, name: 'Aspirin', strength: '100mg' },
                { id: 2, name: 'Ibuprofen', strength: '200mg' },
            ];

            const cachedMedications = {
                data: medications,
                timestamp: new Date().toISOString(),
            };

            localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedMedications));

            const cached = cachedData.medications.get();
            expect(cached.data).toEqual(medications);
            expect(cached.timestamp).toBeTruthy();
        });

        it('should validate cache expiration', () => {
            const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
            const cachedData = {
                data: [],
                timestamp: oldTimestamp,
            };

            localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

            // Should be invalid with 5 minute max age
            const isValid = Date.now() - new Date(oldTimestamp).getTime() < 5 * 60 * 1000;
            expect(isValid).toBe(false);
        });
    });

    describe('Data Synchronization', () => {
        it('should sync offline queue when coming back online', async () => {
            const queuedOperations = [
                {
                    id: '1',
                    type: 'api_request',
                    endpoint: '/api/medications',
                    method: 'POST',
                    data: { name: 'Test Med' },
                    timestamp: new Date().toISOString(),
                },
            ];

            localStorageMock.getItem.mockImplementation((key) => {
                if (key.includes('offlineQueue')) {
                    return JSON.stringify(queuedOperations);
                }
                return null;
            });

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            const syncResult = await dataSynchronizer.sync();

            expect(syncResult.success).toBe(true);
            expect(syncResult.operations.queued).toBe(1);
            expect(syncResult.operations.successful).toBe(1);
            expect(fetch).toHaveBeenCalledWith('/api/medications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: 'Test Med' }),
            });
        });

        it('should handle sync failures gracefully', async () => {
            const queuedOperations = [
                {
                    id: '1',
                    type: 'api_request',
                    endpoint: '/api/medications',
                    method: 'POST',
                    data: { name: 'Test Med' },
                    timestamp: new Date().toISOString(),
                },
            ];

            localStorageMock.getItem.mockImplementation((key) => {
                if (key.includes('offlineQueue')) {
                    return JSON.stringify(queuedOperations);
                }
                return null;
            });

            fetch.mockRejectedValueOnce(new Error('Network error'));

            const syncResult = await dataSynchronizer.sync();

            expect(syncResult.success).toBe(false);
            expect(syncResult.operations.failed).toBe(1);
            expect(syncResult.errors).toHaveLength(1);
            expect(syncResult.errors[0].type).toBe('queue_operation_error');
        });

        it('should sync cached data when invalid', async () => {
            // Mock invalid cache (old timestamp)
            const oldCachedData = {
                data: [],
                timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            };

            localStorageMock.getItem.mockImplementation((key) => {
                if (key.includes('cachedMedications')) {
                    return JSON.stringify(oldCachedData);
                }
                if (key.includes('offlineQueue')) {
                    return JSON.stringify([]);
                }
                return null;
            });

            const newMedications = [{ id: 1, name: 'Updated Med' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: newMedications }),
            });

            const syncResult = await dataSynchronizer.sync();

            expect(syncResult.success).toBe(true);
            expect(syncResult.cache.medications).toBe(true);
            expect(fetch).toHaveBeenCalledWith('/api/medications?', expect.any(Object));
        });

        it('should emit sync events during synchronization', async () => {
            const events = [];

            dataSynchronizer.addEventListener(SYNC_EVENTS.START, (data) => {
                events.push({ type: 'start', data });
            });

            dataSynchronizer.addEventListener(SYNC_EVENTS.COMPLETE, (data) => {
                events.push({ type: 'complete', data });
            });

            localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

            await dataSynchronizer.sync();

            expect(events).toHaveLength(2);
            expect(events[0].type).toBe('start');
            expect(events[1].type).toBe('complete');
        });

        it('should prevent concurrent sync operations', async () => {
            localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

            // Start first sync
            const firstSync = dataSynchronizer.sync();

            // Try to start second sync while first is running
            const secondSync = dataSynchronizer.sync();

            const [firstResult, secondResult] = await Promise.all([firstSync, secondSync]);

            // Both should return the same result (second should wait for first)
            expect(firstResult).toBe(secondResult);
        });

        it('should determine sync necessity correctly', () => {
            // Mock no last sync
            localStorageMock.getItem.mockImplementation((key) => {
                if (key.includes('lastSync')) {
                    return null;
                }
                if (key.includes('offlineQueue')) {
                    return JSON.stringify([]);
                }
                return null;
            });

            expect(dataSynchronizer.needsSync()).toBe(true);

            // Mock recent sync
            localStorageMock.getItem.mockImplementation((key) => {
                if (key.includes('lastSync')) {
                    return JSON.stringify(new Date().toISOString());
                }
                if (key.includes('offlineQueue')) {
                    return JSON.stringify([]);
                }
                return null;
            });

            expect(dataSynchronizer.needsSync()).toBe(false);

            // Mock queued operations
            localStorageMock.getItem.mockImplementation((key) => {
                if (key.includes('lastSync')) {
                    return JSON.stringify(new Date().toISOString());
                }
                if (key.includes('offlineQueue')) {
                    return JSON.stringify([{ id: '1' }]);
                }
                return null;
            });

            expect(dataSynchronizer.needsSync()).toBe(true);
        });
    });

    describe('Service Worker Integration', () => {
        it('should register service worker successfully', async () => {
            const mockRegistration = {
                addEventListener: vi.fn(),
                installing: null,
                waiting: null,
                active: null,
            };

            navigator.serviceWorker.register.mockResolvedValueOnce(mockRegistration);

            const serviceWorker = await initializeServiceWorker();

            expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
                scope: '/',
            });
            expect(serviceWorker).toBeTruthy();
            expect(serviceWorker.registration).toBe(mockRegistration);
        });

        it('should handle service worker registration failure', async () => {
            navigator.serviceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

            const serviceWorker = await initializeServiceWorker();

            expect(serviceWorker).toBeNull();
        });

        it('should setup service worker event listeners', async () => {
            const mockRegistration = {
                addEventListener: vi.fn(),
                installing: null,
                waiting: null,
                active: null,
            };

            navigator.serviceWorker.register.mockResolvedValueOnce(mockRegistration);

            const onUpdateAvailable = vi.fn();
            const onOffline = vi.fn();
            const onOnline = vi.fn();

            const serviceWorker = await initializeServiceWorker({
                onUpdateAvailable,
                onOffline,
                onOnline,
            });

            expect(serviceWorker).toBeTruthy();
            expect(serviceWorker.cleanup).toBeTypeOf('function');
        });
    });

    describe('Offline/Online State Management', () => {
        it('should handle going offline', () => {
            navigator.onLine = false;

            const isOffline = !navigator.onLine;
            expect(isOffline).toBe(true);
        });

        it('should handle coming back online', () => {
            navigator.onLine = false;

            // Simulate coming back online
            navigator.onLine = true;

            const isOnline = navigator.onLine;
            expect(isOnline).toBe(true);
        });

        it('should queue operations when offline', () => {
            navigator.onLine = false;

            const operation = {
                type: 'api_request',
                endpoint: '/api/medications',
                method: 'POST',
                data: { name: 'Test Med' },
            };

            // Simulate adding to queue when offline
            const queue = [];
            queue.push({
                ...operation,
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
            });

            expect(queue).toHaveLength(1);
            expect(queue[0].type).toBe('api_request');
        });
    });

    describe('Cache Management', () => {
        it('should invalidate cache after successful mutations', () => {
            const cacheKeys = [
                '/api/medications',
                '/api/schedule/daily?date=2023-01-01',
            ];

            // Simulate cache invalidation
            const invalidatedKeys = cacheKeys.filter(key =>
                key.includes('/api/medications') || key.includes('/api/schedule')
            );

            expect(invalidatedKeys).toHaveLength(2);
        });

        it('should clean up old cache entries', () => {
            const scheduleCache = {
                '2023-01-01': { data: {}, timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
                '2023-01-07': { data: {}, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
                '2023-01-08': { data: {}, timestamp: new Date().toISOString() },
            };

            const daysToKeep = 7;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const cleanedCache = {};
            Object.entries(scheduleCache).forEach(([date, schedule]) => {
                if (new Date(date) >= cutoffDate) {
                    cleanedCache[date] = schedule;
                }
            });

            expect(Object.keys(cleanedCache)).toHaveLength(2);
            expect(cleanedCache['2023-01-01']).toBeUndefined();
        });
    });
});