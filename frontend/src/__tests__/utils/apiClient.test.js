import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import apiClient, { medicationApi, scheduleApi, settingsApi, notificationApi } from '../../utils/apiClient';

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.onLine
const mockNavigatorOnLine = (isOnline) => {
    Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: isOnline,
    });
};

describe('ApiClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigatorOnLine(true);
        fetch.mockClear();
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('Basic HTTP Methods', () => {
        it('should make GET request', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ data: 'test' }),
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await apiClient.get('/test');

            expect(fetch).toHaveBeenCalledWith('/api/test', {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'GET',
            });
            expect(result).toEqual({ data: 'test' });
        });

        it('should make POST request with data', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ id: 1 }),
            };
            fetch.mockResolvedValue(mockResponse);

            const testData = { name: 'test' };
            const result = await apiClient.post('/test', testData);

            expect(fetch).toHaveBeenCalledWith('/api/test', {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify(testData),
            });
            expect(result).toEqual({ id: 1 });
        });

        it('should make PUT request with data', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ updated: true }),
            };
            fetch.mockResolvedValue(mockResponse);

            const testData = { name: 'updated' };
            await apiClient.put('/test/1', testData);

            expect(fetch).toHaveBeenCalledWith('/api/test/1', {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'PUT',
                body: JSON.stringify(testData),
            });
        });

        it('should make DELETE request', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ deleted: true }),
            };
            fetch.mockResolvedValue(mockResponse);

            await apiClient.delete('/test/1');

            expect(fetch).toHaveBeenCalledWith('/api/test/1', {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'DELETE',
            });
        });

        it('should make PATCH request with data', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ patched: true }),
            };
            fetch.mockResolvedValue(mockResponse);

            const testData = { field: 'value' };
            await apiClient.patch('/test/1', testData);

            expect(fetch).toHaveBeenCalledWith('/api/test/1', {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'PATCH',
                body: JSON.stringify(testData),
            });
        });
    });

    describe('Error Handling', () => {
        it('should throw error when offline', async () => {
            mockNavigatorOnLine(false);

            await expect(apiClient.get('/test')).rejects.toThrow(
                'No internet connection. Please check your network and try again.'
            );

            expect(fetch).not.toHaveBeenCalled();
        });

        it('should handle client errors (4xx) without retry', async () => {
            const errorResponse = {
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: { message: 'Bad request' } }),
            };
            fetch.mockResolvedValue(errorResponse);

            await expect(apiClient.get('/test')).rejects.toThrow('Bad request');

            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should handle server errors (5xx) with retry', async () => {
            const serverError = {
                ok: false,
                status: 500,
            };
            const successResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ data: 'success' }),
            };

            fetch
                .mockResolvedValueOnce(serverError)
                .mockResolvedValueOnce(serverError)
                .mockResolvedValueOnce(successResponse);

            const result = await apiClient.get('/test');

            expect(fetch).toHaveBeenCalledTimes(3);
            expect(result).toEqual({ data: 'success' });
        });

        it('should respect custom retry count', async () => {
            const serverError = {
                ok: false,
                status: 500,
            };
            fetch.mockResolvedValue(serverError);

            await expect(apiClient.get('/test', { retries: 1 })).rejects.toThrow();

            expect(fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
        });

        it('should handle network errors with retry', async () => {
            fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    headers: new Map([['content-type', 'application/json']]),
                    json: () => Promise.resolve({ data: 'success' }),
                });

            const result = await apiClient.get('/test');

            expect(fetch).toHaveBeenCalledTimes(3);
            expect(result).toEqual({ data: 'success' });
        });

        it('should include error status and data in thrown errors', async () => {
            const errorResponse = {
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: { message: 'Not found', code: 'NOT_FOUND' } }),
            };
            fetch.mockResolvedValue(errorResponse);

            try {
                await apiClient.get('/test');
            } catch (error) {
                expect(error.message).toBe('Not found');
                expect(error.status).toBe(404);
                expect(error.data).toEqual({ error: { message: 'Not found', code: 'NOT_FOUND' } });
            }
        });
    });

    describe('Response Handling', () => {
        it('should return raw response for non-JSON content', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'text/plain']]),
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await apiClient.get('/test');

            expect(result).toBe(mockResponse);
        });

        it('should handle empty JSON responses', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve(null),
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await apiClient.get('/test');

            expect(result).toBe(null);
        });
    });

    describe('Custom Headers', () => {
        it('should merge custom headers with defaults', async () => {
            const mockResponse = {
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ data: 'test' }),
            };
            fetch.mockResolvedValue(mockResponse);

            await apiClient.get('/test', {
                headers: {
                    'Authorization': 'Bearer token',
                    'Custom-Header': 'value',
                },
            });

            expect(fetch).toHaveBeenCalledWith('/api/test', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer token',
                    'Custom-Header': 'value',
                },
                method: 'GET',
            });
        });
    });
});

describe('Medication API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigatorOnLine(true);
        fetch.mockClear();
    });

    it('should get all medications with params', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: [] }),
        };
        fetch.mockResolvedValue(mockResponse);

        await medicationApi.getAll({ active: true, date: '2023-01-01' });

        expect(fetch).toHaveBeenCalledWith('/api/medications?active=true&date=2023-01-01', expect.any(Object));
    });

    it('should get medication by id', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: { id: 1 } }),
        };
        fetch.mockResolvedValue(mockResponse);

        await medicationApi.getById(1);

        expect(fetch).toHaveBeenCalledWith('/api/medications/1', expect.any(Object));
    });

    it('should create medication', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: { id: 1 } }),
        };
        fetch.mockResolvedValue(mockResponse);

        const medicationData = { name: 'Test Med' };
        await medicationApi.create(medicationData);

        expect(fetch).toHaveBeenCalledWith('/api/medications', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify(medicationData),
        });
    });

    it('should mark dose as given', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ success: true }),
        };
        fetch.mockResolvedValue(mockResponse);

        const doseData = { dose_amount: 1, timestamp: '2023-01-01T10:00:00Z' };
        await medicationApi.markDoseGiven(1, doseData);

        expect(fetch).toHaveBeenCalledWith('/api/medications/1/mark-dose-given', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify(doseData),
        });
    });
});

describe('Schedule API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigatorOnLine(true);
        fetch.mockClear();
    });

    it('should get daily schedule', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: {} }),
        };
        fetch.mockResolvedValue(mockResponse);

        await scheduleApi.getDaily('2023-01-01');

        expect(fetch).toHaveBeenCalledWith('/api/schedule/daily?date=2023-01-01', expect.any(Object));
    });
});

describe('Settings API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigatorOnLine(true);
        fetch.mockClear();
    });

    it('should get routes', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: [] }),
        };
        fetch.mockResolvedValue(mockResponse);

        await settingsApi.getRoutes();

        expect(fetch).toHaveBeenCalledWith('/api/settings/routes', expect.any(Object));
    });

    it('should create route', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: { id: 1 } }),
        };
        fetch.mockResolvedValue(mockResponse);

        const routeData = { name: 'Oral' };
        await settingsApi.createRoute(routeData);

        expect(fetch).toHaveBeenCalledWith('/api/settings/routes', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify(routeData),
        });
    });
});

describe('Notification API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigatorOnLine(true);
        fetch.mockClear();
    });

    it('should get all notifications', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ data: [] }),
        };
        fetch.mockResolvedValue(mockResponse);

        await notificationApi.getAll();

        expect(fetch).toHaveBeenCalledWith('/api/notifications', expect.any(Object));
    });

    it('should mark notification as read', async () => {
        const mockResponse = {
            ok: true,
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ success: true }),
        };
        fetch.mockResolvedValue(mockResponse);

        await notificationApi.markAsRead(1);

        expect(fetch).toHaveBeenCalledWith('/api/notifications/1/mark-read', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({}),
        });
    });
});