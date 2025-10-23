import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for handling async operations with loading states and error handling
 */
export const useAsync = (asyncFunction, immediate = true) => {
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const mountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const execute = useCallback(
        async (...args) => {
            try {
                setLoading(true);
                setError(null);

                const result = await asyncFunction(...args);

                if (mountedRef.current) {
                    setData(result);
                }

                return result;
            } catch (err) {
                if (mountedRef.current) {
                    setError(err);
                }
                throw err;
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        },
        [asyncFunction]
    );

    // Execute immediately if requested
    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return {
        loading,
        error,
        data,
        execute,
        setData,
        setError,
    };
};

/**
 * Custom hook for handling multiple async operations
 */
export const useAsyncBatch = () => {
    const [operations, setOperations] = useState({});

    const addOperation = useCallback((key, asyncFunction) => {
        setOperations(prev => ({
            ...prev,
            [key]: {
                loading: false,
                error: null,
                data: null,
                execute: async (...args) => {
                    try {
                        setOperations(prev => ({
                            ...prev,
                            [key]: { ...prev[key], loading: true, error: null }
                        }));

                        const result = await asyncFunction(...args);

                        setOperations(prev => ({
                            ...prev,
                            [key]: { ...prev[key], loading: false, data: result }
                        }));

                        return result;
                    } catch (err) {
                        setOperations(prev => ({
                            ...prev,
                            [key]: { ...prev[key], loading: false, error: err }
                        }));
                        throw err;
                    }
                }
            }
        }));
    }, []);

    const getOperation = useCallback((key) => {
        return operations[key] || { loading: false, error: null, data: null, execute: () => { } };
    }, [operations]);

    const isAnyLoading = useCallback(() => {
        return Object.values(operations).some(op => op.loading);
    }, [operations]);

    const hasAnyError = useCallback(() => {
        return Object.values(operations).some(op => op.error);
    }, [operations]);

    return {
        addOperation,
        getOperation,
        isAnyLoading,
        hasAnyError,
        operations,
    };
};