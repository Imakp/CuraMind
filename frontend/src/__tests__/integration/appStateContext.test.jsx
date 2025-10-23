import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import { AppStateProvider, useAppState } from "../../contexts/AppStateContext";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock useOnline hook
vi.mock("../../hooks/useOnline", () => ({
  useOnline: () => ({
    isOnline: navigator.onLine,
    wasOffline: false,
  }),
}));

describe("AppStateContext Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    navigator.onLine = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (children) => {
    return render(<AppStateProvider>{children}</AppStateProvider>);
  };

  const renderHookWithProvider = (hook) => {
    return renderHook(hook, {
      wrapper: ({ children }) => (
        <AppStateProvider>{children}</AppStateProvider>
      ),
    });
  };

  describe("Initial State", () => {
    it("should provide initial state values", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      expect(result.current.loading.global).toBe(false);
      expect(result.current.error.global).toBeNull();
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadNotificationCount).toBe(0);
      expect(result.current.userPreferences).toEqual(
        expect.objectContaining({
          theme: "light",
          dateFormat: "MM/dd/yyyy",
          timeFormat: "12h",
          defaultView: "dashboard",
          autoRefresh: true,
        })
      );
      expect(result.current.offlineQueue).toEqual([]);
      expect(result.current.isOnline).toBe(true);
    });

    it("should load user preferences from localStorage", () => {
      const savedPreferences = {
        theme: "dark",
        dateFormat: "dd/MM/yyyy",
        autoRefresh: false,
      };
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(savedPreferences)
      );

      const { result } = renderHookWithProvider(() => useAppState());

      expect(result.current.userPreferences).toEqual(
        expect.objectContaining(savedPreferences)
      );
    });

    it("should load offline queue from localStorage", () => {
      const savedQueue = [
        { id: "1", type: "api_request", endpoint: "/api/test" },
      ];
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "medicationApp_offlineQueue") {
          return JSON.stringify(savedQueue);
        }
        return null;
      });

      const { result } = renderHookWithProvider(() => useAppState());

      expect(result.current.offlineQueue).toEqual(savedQueue);
    });
  });

  describe("Loading State Management", () => {
    it("should set and clear loading states", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      act(() => {
        result.current.setLoading("medications", true);
      });

      expect(result.current.loading.medications).toBe(true);

      act(() => {
        result.current.setLoading("medications", false);
      });

      expect(result.current.loading.medications).toBe(false);
    });
  });

  describe("Error State Management", () => {
    it("should set and clear error states", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      const errorMessage = "Test error";

      act(() => {
        result.current.setError("medications", errorMessage);
      });

      expect(result.current.error.medications).toBe(errorMessage);

      act(() => {
        result.current.clearError("medications");
      });

      expect(result.current.error.medications).toBeNull();
    });
  });

  describe("Notification Management", () => {
    it("should set notifications and calculate unread count", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      const notifications = [
        { id: "1", message: "Test 1", is_read: false },
        { id: "2", message: "Test 2", is_read: true },
        { id: "3", message: "Test 3", is_read: false },
      ];

      act(() => {
        result.current.setNotifications(notifications);
      });

      expect(result.current.notifications).toEqual(notifications);
      expect(result.current.unreadNotificationCount).toBe(2);
    });

    it("should add new notification", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      const newNotification = {
        message: "New notification",
        type: "info",
      };

      act(() => {
        result.current.addNotification(newNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toEqual(
        expect.objectContaining({
          ...newNotification,
          id: expect.any(String),
          created_at: expect.any(String),
          is_read: false,
        })
      );
      expect(result.current.unreadNotificationCount).toBe(1);
    });

    it("should mark notification as read", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      // Add a notification first
      act(() => {
        result.current.addNotification({ message: "Test notification" });
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.markNotificationRead(notificationId);
      });

      expect(result.current.notifications[0].is_read).toBe(true);
      expect(result.current.unreadNotificationCount).toBe(0);
    });
  });

  describe("User Preferences Management", () => {
    it("should update user preference", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      act(() => {
        result.current.updateUserPreference("theme", "dark");
      });

      expect(result.current.userPreferences.theme).toBe("dark");
    });

    it("should save preferences to localStorage when updated", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      act(() => {
        result.current.updateUserPreference("theme", "dark");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "medicationApp_preferences",
        expect.stringContaining('"theme":"dark"')
      );
    });
  });

  describe("Offline Queue Management", () => {
    it("should add operation to offline queue", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      const operation = {
        type: "api_request",
        endpoint: "/api/medications",
        method: "POST",
        data: { name: "Test Med" },
      };

      act(() => {
        result.current.addToOfflineQueue(operation);
      });

      expect(result.current.offlineQueue).toHaveLength(1);
      expect(result.current.offlineQueue[0]).toEqual(
        expect.objectContaining({
          ...operation,
          id: expect.any(String),
          timestamp: expect.any(String),
        })
      );
      expect(result.current.syncStatus.pendingOperations).toBe(1);
    });

    it("should save offline queue to localStorage", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      const operation = {
        type: "api_request",
        endpoint: "/api/medications",
        method: "POST",
      };

      act(() => {
        result.current.addToOfflineQueue(operation);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "medicationApp_offlineQueue",
        expect.any(String)
      );
    });

    it("should remove operation from offline queue", () => {
      const { result } = renderHookWithProvider(() => useAppState());

      // Add operation first
      act(() => {
        result.current.addToOfflineQueue({
          type: "api_request",
          endpoint: "/api/test",
        });
      });

      const operationId = result.current.offlineQueue[0].id;

      act(() => {
        result.current.removeFromOfflineQueue(operationId);
      });

      expect(result.current.offlineQueue).toHaveLength(0);
      expect(result.current.syncStatus.pendingOperations).toBe(0);
    });

    it("should process offline queue when coming back online", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHookWithProvider(() => useAppState());

      // Add operations to queue
      act(() => {
        result.current.addToOfflineQueue({
          type: "api_request",
          endpoint: "/api/medications",
          method: "POST",
          data: { name: "Test Med" },
        });
      });

      expect(result.current.offlineQueue).toHaveLength(1);

      // Process queue
      await act(async () => {
        await result.current.processOfflineQueue();
      });

      expect(fetch).toHaveBeenCalledWith("/api/medications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Test Med" }),
      });
      expect(result.current.offlineQueue).toHaveLength(0);
      expect(result.current.syncStatus.syncInProgress).toBe(false);
      expect(result.current.syncStatus.lastSync).toBeTruthy();
    });

    it("should handle failed operations during queue processing", async () => {
      fetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHookWithProvider(() => useAppState());

      // Add operation to queue
      act(() => {
        result.current.addToOfflineQueue({
          type: "api_request",
          endpoint: "/api/medications",
          method: "POST",
        });
      });

      // Process queue
      await act(async () => {
        await result.current.processOfflineQueue();
      });

      // Failed operation should remain in queue
      expect(result.current.offlineQueue).toHaveLength(1);
      expect(result.current.syncStatus.syncInProgress).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      // Should not throw error
      expect(() => {
        renderHookWithProvider(() => useAppState());
      }).not.toThrow();
    });

    it("should handle malformed JSON in localStorage", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      // Should not throw error and use default preferences
      const { result } = renderHookWithProvider(() => useAppState());
      expect(result.current.userPreferences.theme).toBe("light");
    });
  });

  describe("Context Provider", () => {
    it("should throw error when useAppState is used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAppState());
      }).toThrow("useAppState must be used within an AppStateProvider");

      consoleSpy.mockRestore();
    });
  });
});
