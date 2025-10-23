import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useOnline, useNetworkRequest } from '../../hooks/useOnline';

// Mock navigator.onLine
const mockNavigatorOnLine = (isOnline) => {
    Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: isOnline,
    });
};

// Mock fetch
global.fetch = vi.fn();

describe('useOnline', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigatorOnLine(true);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('should return initial online status', () => {
        mockNavigatorOnLine(true);
        const { result } = renderHook(() => useOnline());

        expect(result.current.isOnline).toBe(true);
        expect(result.current.wasOffline).toBe(false);
    });

    it('should return initial offline status', () => {
        mockNavigatorOnLine(false);
        const { result } = renderHook(() => useOnline());

        expect(result.current.isOnline).toBe(false);
        expect(result.current.wasOffline).toBe(false);
    });

    it('should update status when going offline', () => {
        mockNavigatorOnLine(true);
        const { result } = renderHook(() => useOnline());

        expect(result.current.isOnline).toBe(true);

        act(() => {
            mockNavigatorOnLine(false);
            window.dispatchEvent(new Event('offline'));
        });

        expect(result.current.isOnline).toBe(false);
    });

    it('should update status when coming back online', () => {
        mockNavigatorOnLine(false);
        const { result } = renderHook(() => useOnline());

        expect(result.current.isOnline).toBe(false);

        act(() => {
            mockNavigatorOnLine(true);
            window.dispatchEvent(new Event('online'));
        });

        expect(result.current.isOnline).toBe(true);
    });

    it('should set wasOffline flag when reconnecting', async () => {
        mockNavigatorOnLine(false);
        const { result } = renderHook(() => useOnline());

        act(() => {
            mockNavigatorOnLine(true);
            window.dispatchEvent(new Event('online'));
        });

        expect(result.current.wasOffline).toBe(true);

        // Should clear the flag after timeout
        await waitFor(() => {
            expect(result.current.wasOffline).toBe(false);
        }, { timeout: 4000 });
    });

    it('should clean up event listeners on unmount', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() => useOnline());

        expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });
});

describe('useNetworkRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigatorOnLine(true);
        fetch.mockClear();
    });

    it('should make successful request when online', async () => {
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({ data: 'success' }),
        };
        fetch.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useNetworkRequest());

        const response = await result.current.makeRequest('/api/test');

        expect(fetch).toHaveBeenCalledWith('/api/test', {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        expect(response).toBe(mockResponse);
    });

    it('should throw error when offline', async () => {
        mockNavigatorOnLine(false);

        const { result } = renderHook(() => useNetworkRequest());

        await expect(result.current.makeRequest('/api/test')).rejects.toThrow(
            'No internet connection. Please check your network and try again.'
        );

        expect(fetch).not.toHaveBeenCalled();
    });

    it('should retry on server errors', async () => {
        const serverError = {
            ok: false,
            status: 500,
        };
        const successResponse = {
            ok: true,
            json: () => Promise.resolve({ data: 'success' }),
        };

        fetch
            .mockResolvedValueOnce(serverError)
            .mockResolvedValueOnce(serverError)
            .mockResolvedValueOnce(successResponse);

        const { result } = renderHook(() => useNetworkRequest());

        const response = await result.current.makeRequest('/api/test');

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(response).toBe(successResponse);
    });

    it('should not retry on client errors', async () => {
        const clientError = {
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: { message: 'Bad request' } }),
        };

        fetch.mockResolvedValue(clientError);

        const { result } = renderHook(() => useNetworkRequest());

        await expect(result.current.makeRequest('/api/test')).rejects.toThrow('Bad request');

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should respect custom retry count', async () => {
        const serverError = {
            ok: false,
            status: 500,
        };

        fetch.mockResolvedValue(serverError);

        const { result } = renderHook(() => useNetworkRequest());

        await expect(result.current.makeRequest('/api/test', {}, 1)).rejects.toThrow();

        expect(fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should handle network errors', async () => {
        fetch.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useNetworkRequest());

        await expect(result.current.makeRequest('/api/test')).rejects.toThrow('Network error');

        expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should merge custom headers', async () => {
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({ data: 'success' }),
        };
        fetch.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useNetworkRequest());

        await result.current.makeRequest('/api/test', {
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
        });
    });

    it('should implement exponential backoff', async () => {
        const serverError = {
            ok: false,
            status: 500,
        };

        fetch.mockResolvedValue(serverError);

        const { result } = renderHook(() => useNetworkRequest());

        const startTime = Date.now();

        await expect(result.current.makeRequest('/api/test', {}, 2)).rejects.toThrow();

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should have waited at least 1000ms (1s) + 2000ms (2s) = 3000ms for exponential backoff
        expect(duration).toBeGreaterThan(2900); // Allow some tolerance
    });
});