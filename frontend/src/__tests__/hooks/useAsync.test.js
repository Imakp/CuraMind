import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAsync, useAsyncBatch } from '../../hooks/useAsync';

describe('useAsync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('should handle successful async operation', async () => {
        const mockAsyncFunction = vi.fn().mockResolvedValue('success');

        const { result } = renderHook(() => useAsync(mockAsyncFunction, false));

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.data).toBe(null);

        await act(async () => {
            await result.current.execute();
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.data).toBe('success');
        expect(mockAsyncFunction).toHaveBeenCalledTimes(1);
    });

    it('should handle async operation errors', async () => {
        const mockError = new Error('Test error');
        const mockAsyncFunction = vi.fn().mockRejectedValue(mockError);

        const { result } = renderHook(() => useAsync(mockAsyncFunction, false));

        await act(async () => {
            try {
                await result.current.execute();
            } catch (error) {
                // Expected to throw
            }
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(mockError);
        expect(result.current.data).toBe(null);
    });

    it('should set loading state during execution', async () => {
        let resolvePromise;
        const mockAsyncFunction = vi.fn(() => new Promise(resolve => {
            resolvePromise = resolve;
        }));

        const { result } = renderHook(() => useAsync(mockAsyncFunction, false));

        act(() => {
            result.current.execute();
        });

        expect(result.current.loading).toBe(true);

        await act(async () => {
            resolvePromise('success');
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it('should execute immediately when immediate is true', async () => {
        const mockAsyncFunction = vi.fn().mockResolvedValue('immediate');

        renderHook(() => useAsync(mockAsyncFunction, true));

        await waitFor(() => {
            expect(mockAsyncFunction).toHaveBeenCalledTimes(1);
        });
    });

    it('should not execute immediately when immediate is false', () => {
        const mockAsyncFunction = vi.fn().mockResolvedValue('not immediate');

        renderHook(() => useAsync(mockAsyncFunction, false));

        expect(mockAsyncFunction).not.toHaveBeenCalled();
    });

    it('should handle component unmount gracefully', async () => {
        const mockAsyncFunction = vi.fn().mockResolvedValue('success');

        const { result, unmount } = renderHook(() => useAsync(mockAsyncFunction, false));

        act(() => {
            result.current.execute();
        });

        unmount();

        // Should not update state after unmount
        await waitFor(() => {
            expect(result.current.loading).toBe(true); // Should remain in loading state
        });
    });

    it('should allow manual data and error setting', () => {
        const mockAsyncFunction = vi.fn();

        const { result } = renderHook(() => useAsync(mockAsyncFunction, false));

        act(() => {
            result.current.setData('manual data');
        });

        expect(result.current.data).toBe('manual data');

        const testError = new Error('manual error');
        act(() => {
            result.current.setError(testError);
        });

        expect(result.current.error).toBe(testError);
    });
});

describe('useAsyncBatch', () => {
    it('should manage multiple async operations', async () => {
        const mockAsyncFunction1 = vi.fn().mockResolvedValue('result1');
        const mockAsyncFunction2 = vi.fn().mockResolvedValue('result2');

        const { result } = renderHook(() => useAsyncBatch());

        act(() => {
            result.current.addOperation('op1', mockAsyncFunction1);
            result.current.addOperation('op2', mockAsyncFunction2);
        });

        const op1 = result.current.getOperation('op1');
        const op2 = result.current.getOperation('op2');

        expect(op1.loading).toBe(false);
        expect(op2.loading).toBe(false);

        await act(async () => {
            await op1.execute();
        });

        expect(result.current.getOperation('op1').data).toBe('result1');
        expect(result.current.getOperation('op2').data).toBe(null);
    });

    it('should track loading state across operations', async () => {
        const mockAsyncFunction1 = vi.fn().mockResolvedValue('result1');
        const mockAsyncFunction2 = vi.fn().mockResolvedValue('result2');

        const { result } = renderHook(() => useAsyncBatch());

        act(() => {
            result.current.addOperation('op1', mockAsyncFunction1);
            result.current.addOperation('op2', mockAsyncFunction2);
        });

        expect(result.current.isAnyLoading()).toBe(false);

        act(() => {
            result.current.getOperation('op1').execute();
        });

        expect(result.current.isAnyLoading()).toBe(true);

        await waitFor(() => {
            expect(result.current.isAnyLoading()).toBe(false);
        });
    });

    it('should track error state across operations', async () => {
        const mockAsyncFunction1 = vi.fn().mockRejectedValue(new Error('error1'));
        const mockAsyncFunction2 = vi.fn().mockResolvedValue('result2');

        const { result } = renderHook(() => useAsyncBatch());

        act(() => {
            result.current.addOperation('op1', mockAsyncFunction1);
            result.current.addOperation('op2', mockAsyncFunction2);
        });

        expect(result.current.hasAnyError()).toBe(false);

        await act(async () => {
            try {
                await result.current.getOperation('op1').execute();
            } catch (error) {
                // Expected to throw
            }
        });

        expect(result.current.hasAnyError()).toBe(true);
    });

    it('should return default operation for unknown keys', () => {
        const { result } = renderHook(() => useAsyncBatch());

        const unknownOp = result.current.getOperation('unknown');

        expect(unknownOp.loading).toBe(false);
        expect(unknownOp.error).toBe(null);
        expect(unknownOp.data).toBe(null);
        expect(typeof unknownOp.execute).toBe('function');
    });
});