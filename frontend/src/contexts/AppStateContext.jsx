import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import { useOnline } from "../hooks/useOnline";

// Action types
const ActionTypes = {
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  SET_NOTIFICATIONS: "SET_NOTIFICATIONS",
  ADD_NOTIFICATION: "ADD_NOTIFICATION",
  MARK_NOTIFICATION_READ: "MARK_NOTIFICATION_READ",
  SET_USER_PREFERENCES: "SET_USER_PREFERENCES",
  UPDATE_USER_PREFERENCE: "UPDATE_USER_PREFERENCE",
  SET_OFFLINE_QUEUE: "SET_OFFLINE_QUEUE",
  ADD_TO_OFFLINE_QUEUE: "ADD_TO_OFFLINE_QUEUE",
  REMOVE_FROM_OFFLINE_QUEUE: "REMOVE_FROM_OFFLINE_QUEUE",
  SET_SYNC_STATUS: "SET_SYNC_STATUS",
};

// Initial state
const initialState = {
  loading: {
    global: false,
    medications: false,
    schedule: false,
    notifications: false,
  },
  error: {
    global: null,
    medications: null,
    schedule: null,
    notifications: null,
  },
  notifications: [],
  unreadNotificationCount: 0,
  userPreferences: {
    theme: "light",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "12h",
    defaultView: "dashboard",
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    showBuyAlerts: true,
    lowInventoryThreshold: 24, // hours
  },
  offlineQueue: [],
  syncStatus: {
    isOnline: true,
    lastSync: null,
    pendingOperations: 0,
    syncInProgress: false,
  },
};

// Reducer
const appStateReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: {
          ...state.error,
          [action.payload.key]: action.payload.value,
        },
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: {
          ...state.error,
          [action.payload.key]: null,
        },
      };

    case ActionTypes.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload,
        unreadNotificationCount: action.payload.filter((n) => !n.is_read)
          .length,
      };

    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadNotificationCount: state.unreadNotificationCount + 1,
      };

    case ActionTypes.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, is_read: true } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
      };

    case ActionTypes.SET_USER_PREFERENCES:
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          ...action.payload,
        },
      };

    case ActionTypes.UPDATE_USER_PREFERENCE:
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          [action.payload.key]: action.payload.value,
        },
      };

    case ActionTypes.SET_OFFLINE_QUEUE:
      return {
        ...state,
        offlineQueue: action.payload,
      };

    case ActionTypes.ADD_TO_OFFLINE_QUEUE:
      return {
        ...state,
        offlineQueue: [...state.offlineQueue, action.payload],
        syncStatus: {
          ...state.syncStatus,
          pendingOperations: state.syncStatus.pendingOperations + 1,
        },
      };

    case ActionTypes.REMOVE_FROM_OFFLINE_QUEUE:
      return {
        ...state,
        offlineQueue: state.offlineQueue.filter(
          (item) => item.id !== action.payload
        ),
        syncStatus: {
          ...state.syncStatus,
          pendingOperations: Math.max(
            0,
            state.syncStatus.pendingOperations - 1
          ),
        },
      };

    case ActionTypes.SET_SYNC_STATUS:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          ...action.payload,
        },
      };

    default:
      return state;
  }
};

// Context
const AppStateContext = createContext();

// Provider component
export const AppStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const { isOnline, wasOffline } = useOnline();

  // Update online status
  useEffect(() => {
    dispatch({
      type: ActionTypes.SET_SYNC_STATUS,
      payload: { isOnline },
    });
  }, [isOnline]);

  // Load user preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem(
        "medicationApp_preferences"
      );
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        dispatch({
          type: ActionTypes.SET_USER_PREFERENCES,
          payload: preferences,
        });
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    }
  }, []);

  // Save user preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "medicationApp_preferences",
        JSON.stringify(state.userPreferences)
      );
    } catch (error) {
      console.error("Error saving user preferences:", error);
    }
  }, [state.userPreferences]);

  // Process offline queue when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && state.offlineQueue.length > 0) {
      processOfflineQueue();
    }
  }, [wasOffline, isOnline, state.offlineQueue.length]);

  // Action creators
  const setLoading = useCallback((key, value) => {
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: { key, value },
    });
  }, []);

  const setError = useCallback((key, value) => {
    dispatch({
      type: ActionTypes.SET_ERROR,
      payload: { key, value },
    });
  }, []);

  const clearError = useCallback((key) => {
    dispatch({
      type: ActionTypes.CLEAR_ERROR,
      payload: { key },
    });
  }, []);

  const setNotifications = useCallback((notifications) => {
    dispatch({
      type: ActionTypes.SET_NOTIFICATIONS,
      payload: notifications,
    });
  }, []);

  const addNotification = useCallback((notification) => {
    dispatch({
      type: ActionTypes.ADD_NOTIFICATION,
      payload: {
        ...notification,
        id: notification.id || Date.now().toString(),
        created_at: notification.created_at || new Date().toISOString(),
        is_read: false,
      },
    });
  }, []);

  const markNotificationRead = useCallback((id) => {
    dispatch({
      type: ActionTypes.MARK_NOTIFICATION_READ,
      payload: id,
    });
  }, []);

  const updateUserPreference = useCallback((key, value) => {
    dispatch({
      type: ActionTypes.UPDATE_USER_PREFERENCE,
      payload: { key, value },
    });
  }, []);

  const addToOfflineQueue = useCallback((operation) => {
    const queueItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...operation,
    };

    dispatch({
      type: ActionTypes.ADD_TO_OFFLINE_QUEUE,
      payload: queueItem,
    });

    // Also save to localStorage for persistence
    try {
      const existingQueue = JSON.parse(
        localStorage.getItem("medicationApp_offlineQueue") || "[]"
      );
      existingQueue.push(queueItem);
      localStorage.setItem(
        "medicationApp_offlineQueue",
        JSON.stringify(existingQueue)
      );
    } catch (error) {
      console.error("Error saving to offline queue:", error);
    }
  }, []);

  const removeFromOfflineQueue = useCallback((id) => {
    dispatch({
      type: ActionTypes.REMOVE_FROM_OFFLINE_QUEUE,
      payload: id,
    });

    // Also remove from localStorage
    try {
      const existingQueue = JSON.parse(
        localStorage.getItem("medicationApp_offlineQueue") || "[]"
      );
      const updatedQueue = existingQueue.filter((item) => item.id !== id);
      localStorage.setItem(
        "medicationApp_offlineQueue",
        JSON.stringify(updatedQueue)
      );
    } catch (error) {
      console.error("Error updating offline queue:", error);
    }
  }, []);

  const processOfflineQueue = useCallback(async () => {
    if (state.offlineQueue.length === 0) return;

    dispatch({
      type: ActionTypes.SET_SYNC_STATUS,
      payload: { syncInProgress: true },
    });

    const processedItems = [];

    for (const item of state.offlineQueue) {
      try {
        // Process the queued operation
        await processQueuedOperation(item);
        processedItems.push(item.id);
      } catch (error) {
        console.error("Error processing queued operation:", error);
        // Keep failed items in queue for retry
      }
    }

    // Remove successfully processed items
    processedItems.forEach((id) => {
      removeFromOfflineQueue(id);
    });

    dispatch({
      type: ActionTypes.SET_SYNC_STATUS,
      payload: {
        syncInProgress: false,
        lastSync: new Date().toISOString(),
      },
    });
  }, [state.offlineQueue, removeFromOfflineQueue]);

  const processQueuedOperation = async (operation) => {
    const { type, endpoint, method, data } = operation;

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Request failed with status ${response.status}`
      );
    }

    return response.json();
  };

  // Load offline queue from localStorage on mount
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem("medicationApp_offlineQueue");
      if (savedQueue) {
        const queue = JSON.parse(savedQueue);
        dispatch({
          type: ActionTypes.SET_OFFLINE_QUEUE,
          payload: queue,
        });
      }
    } catch (error) {
      console.error("Error loading offline queue:", error);
    }
  }, []);

  const value = {
    // State
    ...state,
    isOnline,
    wasOffline,

    // Actions
    setLoading,
    setError,
    clearError,
    setNotifications,
    addNotification,
    markNotificationRead,
    updateUserPreference,
    addToOfflineQueue,
    removeFromOfflineQueue,
    processOfflineQueue,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook to use the context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};

export default AppStateContext;
