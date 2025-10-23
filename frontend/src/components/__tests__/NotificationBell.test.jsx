import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import NotificationBell from "../NotificationBell";

// Mock fetch
global.fetch = vi.fn();

// Mock NotificationPanel component
vi.mock("../NotificationPanel", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="notification-panel">
        <button onClick={onClose}>Close Panel</button>
      </div>
    ) : null,
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    fetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should render notification bell button", () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationBell />);

    expect(
      screen.getByRole("button", { name: /view notifications/i })
    ).toBeInTheDocument();
  });

  it("should fetch unread count on mount", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notifications?is_read=false")
      );
    });
  });

  it("should display unread count badge when there are unread notifications", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 5 }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("should display 99+ when unread count exceeds 99", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 150 }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("99+")).toBeInTheDocument();
    });
  });

  it("should not display badge when unread count is 0", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should open notification panel when bell is clicked", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /view notifications/i })
    );

    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
  });

  it("should close notification panel and refresh count", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Open panel
    fireEvent.click(
      screen.getByRole("button", { name: /view notifications/i })
    );
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();

    // Clear previous fetch calls
    fetch.mockClear();

    // Close panel
    fireEvent.click(screen.getByText("Close Panel"));

    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();

    // Should refresh count after a delay
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notifications?is_read=false")
      );
    });
  });

  it("should filter by medication ID when provided", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationBell medicationId={123} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("medicine_id=123")
      );
    });
  });

  it("should poll for unread count every 30 seconds", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationBell />);

    // Initial fetch
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Advance time by 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    // Advance time by another 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  it("should handle API errors gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("API Error"));

    render(<NotificationBell />);

    // Should not crash and still render the bell
    expect(
      screen.getByRole("button", { name: /view notifications/i })
    ).toBeInTheDocument();
  });

  it("should show loading indicator while fetching", async () => {
    // Create a promise that we can control
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    fetch.mockReturnValueOnce(promise);

    render(<NotificationBell />);

    // Should show loading indicator
    expect(screen.getByRole("button")).toContainHTML("animate-pulse");

    // Resolve the promise
    resolvePromise({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    await waitFor(() => {
      expect(screen.queryByRole("button")).not.toContainHTML("animate-pulse");
    });
  });

  it("should cleanup interval on unmount", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    const { unmount } = render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Unmount component
    unmount();

    // Advance time - should not make additional requests
    vi.advanceTimersByTime(30000);

    // Should still be only 1 call (no additional calls after unmount)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("should update count when medicationId changes", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    const { rerender } = render(<NotificationBell medicationId={1} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("medicine_id=1")
      );
    });

    fetch.mockClear();

    // Change medication ID
    rerender(<NotificationBell medicationId={2} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("medicine_id=2")
      );
    });
  });
});
