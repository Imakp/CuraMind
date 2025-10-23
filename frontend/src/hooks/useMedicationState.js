import { useState, useCallback, useRef, useEffect } from 'react';
import { medicationApi } from '../utils/apiClient';

/**
 * Custom hook for managing medication state with optimistic updates
 */
export const useMedicationState = () => {
    const [medications, setMedications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);
    const optimisticUpdatesRef = useRef(new Map());

    // Apply optimistic update
    const applyOptimisticUpdate = useCallback((id, updateFn) => {
        const updateId = Date.now().toString();
        optimisticUpdatesRef.current.set(updateId, { id, updateFn });

        setMedications(prev => prev.map(med =>
            med.id === id ? updateFn(med) : med
        ));

        return updateId;
    }, []);

    // Revert optimistic update
    const revertOptimisticUpdate = useCallback((updateId) => {
        const update = optimisticUpdatesRef.current.get(updateId);
        if (update) {
            optimisticUpdatesRef.current.delete(updateId);
            // Refresh from server to get accurate state
            fetchMedications();
        }
    }, []);

    // Confirm optimistic update
    const confirmOptimisticUpdate = useCallback((updateId) => {
        optimisticUpdatesRef.current.delete(updateId);
    }, []);

    // Fetch medications with caching
    const fetchMedications = useCallback(async (params = {}, forceRefresh = false) => {
        try {
            // Check if we have recent data and don't need to refresh
            if (!forceRefresh && lastFetch && Date.now() - lastFetch < 30000) {
                return medications;
            }

            setLoading(true);
            setError(null);

            const result = await medicationApi.getAll(params);
            setMedications(result.data || []);
            setLastFetch(Date.now());

            return result.data || [];
        } catch (err) {
            console.error('Error fetching medications:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [medications, lastFetch]);

    // Create medication with optimistic update
    const createMedication = useCallback(async (medicationData) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticMedication = {
            ...medicationData,
            id: tempId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Optimistic update
        setMedications(prev => [optimisticMedication, ...prev]);

        try {
            const result = await medicationApi.create(medicationData);

            // Replace optimistic medication with real one
            setMedications(prev => prev.map(med =>
                med.id === tempId ? result.data : med
            ));

            return result.data;
        } catch (err) {
            // Revert optimistic update
            setMedications(prev => prev.filter(med => med.id !== tempId));
            setError(err.message);
            throw err;
        }
    }, []);

    // Update medication with optimistic update
    const updateMedication = useCallback(async (id, updates) => {
        const updateId = applyOptimisticUpdate(id, (med) => ({
            ...med,
            ...updates,
            updated_at: new Date().toISOString(),
        }));

        try {
            const result = await medicationApi.update(id, updates);
            confirmOptimisticUpdate(updateId);

            // Update with server response
            setMedications(prev => prev.map(med =>
                med.id === id ? result.data : med
            ));

            return result.data;
        } catch (err) {
            revertOptimisticUpdate(updateId);
            setError(err.message);
            throw err;
        }
    }, [applyOptimisticUpdate, confirmOptimisticUpdate, revertOptimisticUpdate]);

    // Delete medication with optimistic update
    const deleteMedication = useCallback(async (id) => {
        const medicationToDelete = medications.find(med => med.id === id);

        // Optimistic update
        setMedications(prev => prev.filter(med => med.id !== id));

        try {
            await medicationApi.delete(id);
        } catch (err) {
            // Revert optimistic update
            if (medicationToDelete) {
                setMedications(prev => [...prev, medicationToDelete].sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                ));
            }
            setError(err.message);
            throw err;
        }
    }, [medications]);

    // Mark dose as given with optimistic update
    const markDoseAsGiven = useCallback(async (id, doseAmount) => {
        const updateId = applyOptimisticUpdate(id, (med) => ({
            ...med,
            total_tablets: Math.max(0, (med.total_tablets || 0) - doseAmount),
        }));

        try {
            const result = await medicationApi.markDoseGiven(id, {
                dose_amount: doseAmount,
                timestamp: new Date().toISOString(),
            });

            confirmOptimisticUpdate(updateId);

            // Update with server response if it includes updated medication
            if (result.data?.medication) {
                setMedications(prev => prev.map(med =>
                    med.id === id ? result.data.medication : med
                ));
            }

            return result.data;
        } catch (err) {
            revertOptimisticUpdate(updateId);
            setError(err.message);
            throw err;
        }
    }, [applyOptimisticUpdate, confirmOptimisticUpdate, revertOptimisticUpdate]);

    // Update inventory with optimistic update
    const updateInventory = useCallback(async (id, newAmount, reason = 'Manual update') => {
        const updateId = applyOptimisticUpdate(id, (med) => ({
            ...med,
            total_tablets: newAmount,
        }));

        try {
            const result = await medicationApi.updateInventory(id, {
                total_tablets: newAmount,
                reason,
            });

            confirmOptimisticUpdate(updateId);

            // Update with server response
            if (result.data?.medication) {
                setMedications(prev => prev.map(med =>
                    med.id === id ? result.data.medication : med
                ));
            }

            return result.data;
        } catch (err) {
            revertOptimisticUpdate(updateId);
            setError(err.message);
            throw err;
        }
    }, [applyOptimisticUpdate, confirmOptimisticUpdate, revertOptimisticUpdate]);

    // Get medication by ID
    const getMedicationById = useCallback((id) => {
        return medications.find(med => med.id === id);
    }, [medications]);

    // Filter medications
    const filterMedications = useCallback((filterFn) => {
        return medications.filter(filterFn);
    }, [medications]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Refresh data
    const refresh = useCallback(() => {
        return fetchMedications({}, true);
    }, [fetchMedications]);

    return {
        medications,
        loading,
        error,
        lastFetch,

        // Actions
        fetchMedications,
        createMedication,
        updateMedication,
        deleteMedication,
        markDoseAsGiven,
        updateInventory,

        // Utilities
        getMedicationById,
        filterMedications,
        clearError,
        refresh,
    };
};

/**
 * Custom hook for managing schedule state
 */
export const useScheduleState = () => {
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);
    const cacheRef = useRef(new Map());

    // Fetch daily schedule with caching
    const fetchDailySchedule = useCallback(async (date, forceRefresh = false) => {
        try {
            const cacheKey = date;

            // Check cache first
            if (!forceRefresh && cacheRef.current.has(cacheKey)) {
                const cached = cacheRef.current.get(cacheKey);
                if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
                    setSchedule(cached.data);
                    return cached.data;
                }
            }

            setLoading(true);
            setError(null);

            const response = await fetch(`/api/schedule/daily?date=${date}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Failed to fetch schedule');
            }

            const scheduleData = result.data;

            // Cache the result
            cacheRef.current.set(cacheKey, {
                data: scheduleData,
                timestamp: Date.now(),
            });

            setSchedule(scheduleData);
            setLastFetch(Date.now());

            return scheduleData;
        } catch (err) {
            console.error('Error fetching schedule:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Clear cache
    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        schedule,
        loading,
        error,
        lastFetch,

        // Actions
        fetchDailySchedule,
        clearCache,
        clearError,
    };
};