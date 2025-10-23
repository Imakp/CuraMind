import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting online/offline status
 */
export const useOnline = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Track if we were previously offline to show reconnection message
            if (!navigator.onLine) {
                setWasOffline(true);
                // Clear the flag after a short delay
                setTimeout(() => setWasOffline(false), 3000);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline, wasOffline };
};

/**
 * Custom hook for handling network requests with retry logic
 */
export const useNetworkRequest = () => {
    const { isOnline } = useOnline();

    const makeRequest = async (url, options = {}, retries = 3) => {
        if (!isOnline) {
            throw new Error('No internet connection. Please check your network and try again.');
        }

        let lastError;

        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    },
                });

                // If the request was successful, return the response
                if (response.ok) {
                    return response;
                }

                // If it's a client error (4xx), don't retry
                if (response.status >= 400 && response.status < 500) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
                }

                // For server errors (5xx), we'll retry
                throw new Error(`Server error: ${response.status}`);
            } catch (error) {
                lastError = error;

                // Don't retry for network errors if we're offline
                if (!navigator.onLine) {
                    throw new Error('No internet connection. Please check your network and try again.');
                }

                // Don't retry for client errors
                if (error.message.includes('Request failed with status 4')) {
                    throw error;
                }

                // If this is the last retry, throw the error
                if (i === retries) {
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }

        throw lastError;
    };

    return { makeRequest, isOnline };
};