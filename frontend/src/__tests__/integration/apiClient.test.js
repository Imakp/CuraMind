import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import apiClient, { medicationApi } from '../../utils/apiClient';

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
});

describe('API Client Integration Tests', () => {
    beforeEach(() => {
        fetch.mockClear();
        navigator.onLine = true;
        // Reset interceptors
        apiClient.requestInterceptors = [];
        apiClient.responseInterceptors = [];
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Clean up interceptors
        apiClient.requestInterceptors = [];
        apiClient.responseInterceptors = [];
    });

    describe('Basic API Operations', () => {
        it('should make successful GET request', async () => {
            const mockData = { data: [{ id: 1, name: 'Test Medication' }] };
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            const result = await apiClient.get('/medications');

            expect(fetch).toHaveBeenCalledWith('/api/medications', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            expect(result).toEqual(mockData);
        });

        it('should make successful POST request', async () => {
            const mockData = { data: { id: 1, name: 'New Medication' } };
            const postData = { name: 'New Medication', strength: '10mg' };

            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            const result = await apiClient.post('/medications', postData);

            expect(fetch).toHaveBeenCalledWith('/api/medications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData),
            });
            expect(result).toEqual(mockData);
        });

        it('should handle 4xx client errors without retry', async () => {
            const errorData = { error: { message: 'Validation failed' } };
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve(errorData),
            });

            await expect(apiClient.get('/medications')).rejects.toThrow('Validation failed');
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should retry on 5xx server errors', async () => {
            // First two attempts fail with 500
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            // Third attempt succeeds
            const mockData = { data: [] };
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            const result = await apiClient.get('/medications', { retries: 2 });

            expect(fetch).toHaveBeenCalledTimes(3);
            expect(result).toEqual(mockData);
        });

        it('should throw error after max retries', async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 500,
            });

            await expect(apiClient.get('/medications', { retries: 2 })).rejects.toThrow('Server error: 500');
            expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });

    describe('Offline Handling', () => {
        it('should throw error for GET requests when offline', async () => {
            navigator.onLine = false;

            await expect(apiClient.get('/medications')).rejects.toThrow('No internet connection');
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should queue POST requests when offline if callback is set', async () => {
            navigator.onLine = false;
            const queueCallback = vi.fn();
            apiClient.setOfflineQueueCallback(queueCallback);

            const postData = { name: 'Test Medication' };
            const result = await apiClient.post('/medications', postData);

            expect(queueCallback).toHaveBeenCalledWith({
                type: 'api_request',
                endpoint: '/api/medications',
                method: 'POST',
                data: postData,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            expect(result).toEqual({
                success: true,
                queued: true,
                message: 'Operation queued for when connection is restored',
            });
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should not queue requests when queueWhenOffline is false', async () => {
            navigator.onLine = false;
            const queueCallback = vi.fn();
            apiClient.setOfflineQueueCallback(queueCallback);

            await expect(
                apiClient.post('/medications', {}, { queueWhenOffline: false })
            ).rejects.toThrow('No internet connection');

            expect(queueCallback).not.toHaveBeenCalled();
        });
    });

    describe('Request and Response Interceptors', () => {
        it('should apply request interceptors', async () => {
            const requestInterceptor = vi.fn((config) => ({
                ...config,
                headers: {
                    ...config.headers,
                    'X-Custom-Header': 'test-value',
                },
            }));

            apiClient.addRequestInterceptor(requestInterceptor);

            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ data: [] }),
            });

            await apiClient.get('/medications');

            expect(requestInterceptor).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith('/api/medications', expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Custom-Header': 'test-value',
                }),
            }));
        });

        it('should apply response interceptors', async () => {
            const responseInterceptor = vi.fn((data) => ({
                ...data,
                intercepted: true,
            }));

            apiClient.addResponseInterceptor(responseInterceptor);

            const mockData = { data: [] };
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            const result = await apiClient.get('/medications');

            expect(responseInterceptor).toHaveBeenCalledWith(mockData, expect.any(Object));
            expect(result).toEqual({
                ...mockData,
                intercepted: true,
            });
        });
    });

    describe('Medication API', () => {
        it('should fetch all medications with parameters', async () => {
            const mockData = { data: [] };
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            const params = { active: true, date: '2023-01-01' };
            await medicationApi.getAll(params);

            expect(fetch).toHaveBeenCalledWith(
                '/api/medications?active=true&date=2023-01-01',
                expect.any(Object)
            );
        });

        it('should create medication', async () => {
            const mockData = { data: { id: 1, name: 'Test Med' } };
            const medicationData = { name: 'Test Med', strength: '10mg' };

            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            await medicationApi.create(medicationData);

            expect(fetch).toHaveBeenCalledWith('/api/medications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(medicationData),
            });
        });

        it('should mark dose as given', async () => {
            const mockData = { success: true };
            const doseData = { dose_amount: 1, timestamp: '2023-01-01T10:00:00Z' };

            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            await medicationApi.markDoseGiven(1, doseData);

            expect(fetch).toHaveBeenCalledWith('/api/medications/1/mark-dose-given', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(doseData),
            });
        });

        it('should update inventory', async () => {
            const mockData = { success: true };
            const inventoryData = { total_tablets: 50, reason: 'Refill' };

            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(mockData),
            });

            await medicationApi.updateInventory(1, inventoryData);

            expect(fetch).toHaveBeenCalledWith('/api/medications/1/update-inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inventoryData),
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(apiClient.get('/medications', { retries: 0 })).rejects.toThrow('Network error');
        });

        it('should handle malformed JSON responses', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.reject(new Error('Invalid JSON')),
            });

            await expect(apiClient.get('/medications', { retries: 0 })).rejects.toThrow('Invalid JSON');
        });

        it('should handle responses without content-type', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map(),
                status: 200
            };
            fetch.mockResolvedValueOnce(mockResponse);

            const result = await apiClient.get('/medications');
            expect(result).toEqual(mockResponse);
        });
    });
});