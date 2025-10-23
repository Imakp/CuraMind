/**
 * Enhanced API client with error handling, retry logic, and offline support
 */
class ApiClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        this.offlineQueueCallback = null;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    // Set callback for offline queue operations
    setOfflineQueueCallback(callback) {
        this.offlineQueueCallback = callback;
    }

    // Add request interceptor
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    // Add response interceptor
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        let config = {
            headers: {
                ...this.defaultHeaders,
                ...options.headers,
            },
            ...options,
        };

        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            config = await interceptor(config);
        }

        // Check if we're offline and this is a mutation operation
        if (!navigator.onLine) {
            const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase());

            if (isMutation && this.offlineQueueCallback && options.queueWhenOffline !== false) {
                // Queue the operation for when we're back online
                this.offlineQueueCallback({
                    type: 'api_request',
                    endpoint: url,
                    method: config.method,
                    data: config.body ? JSON.parse(config.body) : null,
                    headers: config.headers,
                });

                // Return a promise that resolves with a placeholder response
                return {
                    success: true,
                    queued: true,
                    message: 'Operation queued for when connection is restored',
                };
            }

            throw new Error('No internet connection. Please check your network and try again.');
        }

        let lastError;
        const maxRetries = options.retries || 3;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, config);
                let result = response;

                // Handle successful responses
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        result = await response.json();
                    }

                    // Apply response interceptors
                    for (const interceptor of this.responseInterceptors) {
                        result = await interceptor(result, response);
                    }

                    return result;
                }

                // Handle client errors (4xx) - don't retry
                if (response.status >= 400 && response.status < 500) {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error(errorData.error?.message || `Request failed with status ${response.status}`);
                    error.status = response.status;
                    error.data = errorData;
                    throw error;
                }

                // Handle server errors (5xx) - retry
                const error = new Error(`Server error: ${response.status}`);
                error.status = response.status;
                throw error;

            } catch (error) {
                lastError = error;

                // Don't retry for network errors if we're offline
                if (!navigator.onLine) {
                    throw new Error('No internet connection. Please check your network and try again.');
                }

                // Don't retry for client errors
                if (error.status >= 400 && error.status < 500) {
                    throw error;
                }

                // If this is the last attempt, throw the error
                if (attempt === maxRetries) {
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }

        throw lastError;
    }

    // Convenience methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    async patch(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;

// Export specific API functions for common operations
export const medicationApi = {
    getAll: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        return apiClient.get(`/medications?${searchParams}`);
    },

    getById: (id) => apiClient.get(`/medications/${id}`),

    create: (data) => apiClient.post('/medications', data),

    update: (id, data) => apiClient.put(`/medications/${id}`, data),

    delete: (id) => apiClient.delete(`/medications/${id}`),

    markDoseGiven: (id, data) => apiClient.post(`/medications/${id}/mark-dose-given`, data),

    updateInventory: (id, data) => apiClient.post(`/medications/${id}/update-inventory`, data),
};

export const scheduleApi = {
    getDaily: (date) => apiClient.get(`/schedule/daily?date=${date}`),
};

export const settingsApi = {
    getRoutes: () => apiClient.get('/settings/routes'),
    createRoute: (data) => apiClient.post('/settings/routes', data),
    updateRoute: (id, data) => apiClient.put(`/settings/routes/${id}`, data),
    deleteRoute: (id) => apiClient.delete(`/settings/routes/${id}`),

    getFrequencies: () => apiClient.get('/settings/frequencies'),
    createFrequency: (data) => apiClient.post('/settings/frequencies', data),
    updateFrequency: (id, data) => apiClient.put(`/settings/frequencies/${id}`, data),
    deleteFrequency: (id) => apiClient.delete(`/settings/frequencies/${id}`),
};

export const notificationApi = {
    getAll: () => apiClient.get('/notifications'),
    markAsRead: (id) => apiClient.post(`/notifications/${id}/mark-read`, {}),
};