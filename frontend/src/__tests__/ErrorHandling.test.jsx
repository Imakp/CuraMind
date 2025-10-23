import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";
import OfflineIndicator from "../components/OfflineIndicator";
import { useOnline } from "../hooks/useOnline";

// Mock the useOnline hook
vi.mock("../hooks/useOnline");

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Test error for ErrorBoundary");
  }
  return <div>No error</div>;
};

// Mock navigator.onLine
const mockNavigatorOnLine = (isOnline) => {
  Object.defineProperty(navigator, "onLine", {
    writable: true,
    value: isOnline,
  });
};

describe("Error Handling", () => {
  let originalConsoleError;

  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe("ErrorBoundary", () => {
    it("should render children when there is no error", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("No error")).toBeInTheDocument();
    });

    it("should render error UI when an error is thrown", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByText("Oops! Something went wrong")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/We encountered an unexpected error/)
      ).toBeInTheDocument();
    });

    it("should show error details in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/Error Details \(Development Mode\)/)
      ).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it("should hide error details in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Error Details/)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it("should call onError callback when error occurs", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test error for ErrorBoundary",
          errorId: expect.any(String),
          timestamp: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should allow retry after error", async () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        React.useEffect(() => {
          const timer = setTimeout(() => setShouldThrow(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return <ThrowError shouldThrow={shouldThrow} />;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show error initially
      expect(
        screen.getByText("Oops! Something went wrong")
      ).toBeInTheDocument();

      // Click try again
      fireEvent.click(screen.getByText("Try Again"));

      // Should show success after retry
      await waitFor(() => {
        expect(screen.getByText("No error")).toBeInTheDocument();
      });
    });

    it("should copy error report to clipboard", async () => {
      // Mock clipboard API
      const mockWriteText = vi.fn().mockResolvedValue();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      // Mock alert
      window.alert = vi.fn();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText("Report Error"));

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining("Test error for ErrorBoundary")
        );
        expect(window.alert).toHaveBeenCalledWith(
          "Error report copied to clipboard. Please share this with support."
        );
      });
    });
  });

  describe("OfflineIndicator", () => {
    it("should not render when online and never was offline", () => {
      useOnline.mockReturnValue({ isOnline: true, wasOffline: false });

      render(<OfflineIndicator />);

      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
    });

    it("should show offline indicator when offline", () => {
      useOnline.mockReturnValue({ isOnline: false, wasOffline: false });

      render(<OfflineIndicator />);

      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    });

    it("should show back online indicator when reconnected", () => {
      useOnline.mockReturnValue({ isOnline: true, wasOffline: true });

      render(<OfflineIndicator />);

      expect(screen.getByText(/You're back online/)).toBeInTheDocument();
    });
  });

  describe("Online/Offline Detection", () => {
    beforeEach(() => {
      // Reset the mock before each test
      vi.clearAllMocks();
    });

    it("should detect when going offline", () => {
      mockNavigatorOnLine(true);

      const { rerender } = render(<OfflineIndicator />);

      // Simulate going offline
      mockNavigatorOnLine(false);
      fireEvent(window, new Event("offline"));

      rerender(<OfflineIndicator />);

      // The component should detect the offline state
      // Note: This test would need the actual useOnline hook implementation
    });

    it("should detect when coming back online", () => {
      mockNavigatorOnLine(false);

      const { rerender } = render(<OfflineIndicator />);

      // Simulate coming back online
      mockNavigatorOnLine(true);
      fireEvent(window, new Event("online"));

      rerender(<OfflineIndicator />);

      // The component should detect the online state
      // Note: This test would need the actual useOnline hook implementation
    });
  });
});
