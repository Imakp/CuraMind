import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMedicationState, useScheduleState } from '../../hooks/useMedicationState';
import * as apiClient from '../../utils/apiClient';

// Mock the API client
vi.mock('../../utils/apiClient', () => ({
    medicationApi: {
        getAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markDoseGiven: vi.fn(),
        updateInventory: vi.fn(),
    },
}));

// Mock fetch for schedule tests
global.fetch = vi.fn();

describe('Medication State Management Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetch.mockClear();
    });

    describe('useMedicationState', () => {
        it('should fetch medications successfully', async () => {
            const mockMedications = [
                { id: 1, name: 'Aspirin', strength: '100mg' },
                { id: 2, name: 'Ibuprofen', strength: '200mg' },
            ];

            apiClient.medicationApi.getAll.mockResolvedValueOnce({
                data: mockMedications,
            });

            const { result } = renderHook(() => useMedicationState());

            expect(result.current.loading).toBe(false);
            expect(result.current.medications).toEqual([]);

            await act(async () => {
                await result.current.fetchMedications();
            });

            expect(result.current.loading).toBe(false);
            expect(result.current.medications).toEqual(mockMedications);
            expect(result.current.error).toBeNull();
            expect(apiClient.medicationApi.getAll).toHaveBeenCalledWith({});
        });

        it('should handle fetch medications error', async () => {
            const errorMessage = 'Failed to fetch medications';
            apiClient.medicationApi.getAll.mockRejectedValueOnce(new Error(errorMessage));

            const { result } = renderHook(() => useMedicationState());

            await act(async () => {
                try {
                    await result.current.fetchMedications();
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe(errorMessage);
            expect(result.current.medications).toEqual([]);
        });

        it('should use cache when fetching recently fetched data', async () => {
            const mockMedications = [{ id: 1, name: 'Aspirin' }];

            apiClient.medicationApi.getAll.mockResolvedValueOnce({
                data: mockMedications,
            });

            const { result } = renderHook(() => useMedicationState());

            // First fetch
            await act(async () => {
                await result.current.fetchMedications();
            });

            expect(apiClient.medicationApi.getAll).toHaveBeenCalledTimes(1);

            // Second fetch within cache window should not call API
            await act(async () => {
                const cachedResult = await result.current.fetchMedications();
                expect(cachedResult).toEqual(mockMedications);
            });

            expect(apiClient.medicationApi.getAll).toHaveBeenCalledTimes(1);
        });

        it('should create medication with optimistic update', async () => {
            const newMedication = { name: 'New Med', strength: '50mg' };
            const createdMedication = { id: 1, ...newMedication, created_at: '2023-01-01T00:00:00Z' };

            apiClient.medicationApi.create.mockResolvedValueOnce({
                data: createdMedication,
            });

            const { result } = renderHook(() => useMedicationState());

            await act(async () => {
                await result.current.createMedication(newMedication);
            });

            expect(result.current.medications).toHaveLength(1);
            expect(result.current.medications[0]).toEqual(createdMedication);
            expect(apiClient.medicationApi.create).toHaveBeenCalledWith(newMedication);
        });

        it('should revert optimistic update on create failure', async () => {
            const newMedication = { name: 'New Med', strength: '50mg' };
            const errorMessage = 'Creation failed';

            apiClient.medicationApi.create.mockRejectedValueOnce(new Error(errorMessage));

            const { result } = renderHook(() => useMedicationState());

            await act(async () => {
                try {
                    await result.current.createMedication(newMedication);
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.medications).toHaveLength(0);
            expect(result.current.error).toBe(errorMessage);
        });

        it('should update medication with optimistic update', async () => {
            const existingMedication = { id: 1, name: 'Old Med', strength: '25mg' };
            const updates = { name: 'Updated Med', strength: '50mg' };
            const updatedMedication = { ...existingMedication, ...updates };

            apiClient.medicationApi.update.mockResolvedValueOnce({
                data: updatedMedication,
            });

            const { result } = renderHook(() => useMedicationState());

            // Set initial state
            act(() => {
                result.current.medications.push(existingMedication);
            });

            await act(async () => {
                await result.current.updateMedication(1, updates);
            });

            expect(result.current.medications[0]).toEqual(updatedMedication);
            expect(apiClient.medicationApi.update).toHaveBeenCalledWith(1, updates);
        });

        it('should delete medication with optimistic update', async () => {
            const medication = { id: 1, name: 'Test Med' };

            apiClient.medicationApi.delete.mockResolvedValueOnce({});

            const { result } = renderHook(() => useMedicationState());

            // Set initial state with medication
            act(() => {
                result.current.medications.push(medication);
            });

            expect(result.current.medications).toHaveLength(1);

            await act(async () => {
                await result.current.deleteMedication(1);
            });

            expect(result.current.medications).toHaveLength(0);
            expect(apiClient.medicationApi.delete).toHaveBeenCalledWith(1);
        });

        it('should revert delete on failure', async () => {
            const medication = { id: 1, name: 'Test Med', created_at: '2023-01-01T00:00:00Z' };
            const errorMessage = 'Delete failed';

            apiClient.medicationApi.delete.mockRejectedValueOnce(new Error(errorMessage));

            const { result } = renderHook(() => useMedicationState());

            // Set initial state
            act(() => {
                result.current.medications.push(medication);
            });

            await act(async () => {
                try {
                    await result.current.deleteMedication(1);
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.medications).toHaveLength(1);
            expect(result.current.medications[0]).toEqual(medication);
            expect(result.current.error).toBe(errorMessage);
        });

        it('should mark dose as given with optimistic update', async () => {
            const medication = { id: 1, name: 'Test Med', total_tablets: 30 };
            const doseAmount = 2;

            apiClient.medicationApi.markDoseGiven.mockResolvedValueOnce({
                data: { success: true },
            });

            const { result } = renderHook(() => useMedicationState());

            // Set initial state
            act(() => {
                result.current.medications.push(medication);
            });

            await act(async () => {
                await result.current.markDoseAsGiven(1, doseAmount);
            });

            expect(result.current.medications[0].total_tablets).toBe(28);
            expect(apiClient.medicationApi.markDoseGiven).toHaveBeenCalledWith(1, {
                dose_amount: doseAmount,
                timestamp: expect.any(String),
            });
        });

        it('should update inventory with optimistic update', async () => {
            const medication = { id: 1, name: 'Test Med', total_tablets: 10 };
            const newAmount = 50;

            apiClient.medicationApi.updateInventory.mockResolvedValueOnce({
                data: { success: true },
            });

            const { result } = renderHook(() => useMedicationState());

            // Set initial state
            act(() => {
                result.current.medications.push(medication);
            });

            await act(async () => {
                await result.current.updateInventory(1, newAmount, 'Refill');
            });

            expect(result.current.medications[0].total_tablets).toBe(newAmount);
            expect(apiClient.medicationApi.updateInventory).toHaveBeenCalledWith(1, {
                total_tablets: newAmount,
                reason: 'Refill',
            });
        });

        it('should filter medications correctly', () => {
            const medications = [
                { id: 1, name: 'Aspirin', active: true },
                { id: 2, name: 'Ibuprofen', active: false },
                { id: 3, name: 'Tylenol', active: true },
            ];

            const { result } = renderHook(() => useMedicationState());

            // Set initial state
            act(() => {
                result.current.medications.push(...medications);
            });

            const activeMedications = result.current.filterMedications(med => med.active);
            expect(activeMedications).toHaveLength(2);
            expect(activeMedications.map(m => m.name)).toEqual(['Aspirin', 'Tylenol']);
        });

        it('should get medication by ID', () => {
            const medications = [
                { id: 1, name: 'Aspirin' },
                { id: 2, name: 'Ibuprofen' },
            ];

            const { result } = renderHook(() => useMedicationState());

            // Set initial state
            act(() => {
                result.current.medications.push(...medications);
            });

            const medication = result.current.getMedicationById(2);
            expect(medication).toEqual({ id: 2, name: 'Ibuprofen' });

            const nonExistent = result.current.getMedicationById(999);
            expect(nonExistent).toBeUndefined();
        });
    });

    describe('useScheduleState', () => {
        it('should fetch daily schedule successfully', async () => {
            const mockSchedule = {
                total_medications: 3,
                total_doses: 5,
                schedule: {
                    morning: [{ medication_id: 1, medication_name: 'Aspirin' }],
                },
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: mockSchedule }),
            });

            const { result } = renderHook(() => useScheduleState());

            expect(result.current.loading).toBe(false);
            expect(result.current.schedule).toBeNull();

            await act(async () => {
                await result.current.fetchDailySchedule('2023-01-01');
            });

            expect(result.current.loading).toBe(false);
            expect(result.current.schedule).toEqual(mockSchedule);
            expect(result.current.error).toBeNull();
            expect(fetch).toHaveBeenCalledWith('/api/schedule/daily?date=2023-01-01');
        });

        it('should handle fetch schedule error', async () => {
            const errorMessage = 'Failed to fetch schedule';
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: { message: errorMessage } }),
            });

            const { result } = renderHook(() => useScheduleState());

            await act(async () => {
                try {
                    await result.current.fetchDailySchedule('2023-01-01');
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe(errorMessage);
            expect(result.current.schedule).toBeNull();
        });

        it('should use cache for recent schedule data', async () => {
            const mockSchedule = { total_medications: 1 };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: mockSchedule }),
            });

            const { result } = renderHook(() => useScheduleState());

            // First fetch
            await act(async () => {
                await result.current.fetchDailySchedule('2023-01-01');
            });

            expect(fetch).toHaveBeenCalledTimes(1);

            // Second fetch within cache window should use cache
            await act(async () => {
                const cachedResult = await result.current.fetchDailySchedule('2023-01-01');
                expect(cachedResult).toEqual(mockSchedule);
            });

            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should force refresh when requested', async () => {
            const mockSchedule = { total_medications: 1 };

            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: mockSchedule }),
            });

            const { result } = renderHook(() => useScheduleState());

            // First fetch
            await act(async () => {
                await result.current.fetchDailySchedule('2023-01-01');
            });

            // Force refresh should bypass cache
            await act(async () => {
                await result.current.fetchDailySchedule('2023-01-01', true);
            });

            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('should clear cache', () => {
            const { result } = renderHook(() => useScheduleState());

            act(() => {
                result.current.clearCache();
            });

            // Should not throw any errors
            expect(result.current.schedule).toBeNull();
        });

        it('should clear error', async () => {
            const { result } = renderHook(() => useScheduleState());

            // Trigger an error first
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: { message: 'Test error' } }),
            });

            await act(async () => {
                try {
                    await result.current.fetchDailySchedule('2023-01-01');
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('Test error');

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});