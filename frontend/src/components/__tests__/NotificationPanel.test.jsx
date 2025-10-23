import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import NotificationPanel from "../NotificationPanel";

// Mock fetch
global.fetch = vi.fn();

describe("NotificationPanel", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockNotifications = [
    {
      id: 1,
      medicine_id: 1,
      medication_name: "Test Medication",
      medication_strength: "10mg",
      type: "BUY_SOON",
      message: "Test Medication is running low. 5 tablets remaining (2 days).",
      payload: { current_tablets: 5, days_remaining: 2 },
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      medicine_id: 2,
      medication_name: "Another Medication",
      medication_strength: "20mg",
      type: "DOSE_DUE",
      message: "Time to take Another Medication - 1 tablets at 08:00.",
      payload: { dose_amount: 1, time_of_day: "08:00" },
      is_read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
  ];

  it("should not render when isOpen is false", () => {
    render(<NotificationPanel isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("should fetch notifications when panel opens", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockNotifications, count: 2 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notifications")
      );
    });
  });

  it("should display notifications correctly", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockNotifications, count: 2 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Test Medication is running low. 5 tablets remaining (2 days)."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Time to take Another Medication - 1 tablets at 08:00."
        )
      ).toBeInTheDocument();
    });
  });

  it("should show unread count badge", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockNotifications, count: 2 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("1 unread")).toBeInTheDocument();
    });
  });

  it("should mark notification as read", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockNotifications, count: 2 }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { ...mockNotifications[0], is_read: true } }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Mark as read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark as read"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/notifications/1/mark-read",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  it("should mark all notifications as read", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockNotifications, count: 2 }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "1 notifications marked as read",
        count: 1,
      }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark all read"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/notifications/mark-all-read",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      );
    });
  });

  it("should filter by medication ID when provided", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockNotifications[0]], count: 1 }),
    });

    render(
      <NotificationPanel isOpen={true} onClose={vi.fn()} medicationId={1} />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("medicine_id=1")
      );
    });
  });

  it("should show unread only when specified", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockNotifications[0]], count: 1 }),
    });

    render(
      <NotificationPanel
        isOpen={true}
        onClose={vi.fn()}
        showUnreadOnly={true}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("is_read=false")
      );
    });
  });

  it("should handle API errors gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("API Error"));

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("should show empty state when no notifications", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No notifications")).toBeInTheDocument();
    });
  });

  it("should close panel when close button is clicked", async () => {
    const onClose = vi.fn();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationPanel isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Find the close button (it has no accessible name, so we'll use a different approach)
    const closeButtons = screen.getAllByRole("button");
    const closeButton = closeButtons.find((button) =>
      button.querySelector('svg path[d="M6 18L18 6M6 6l12 12"]')
    );

    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("should close panel when backdrop is clicked", async () => {
    const onClose = vi.fn();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    const { container } = render(
      <NotificationPanel isOpen={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Click on backdrop (the overlay div)
    const backdrop = container.querySelector(".absolute.inset-0.bg-black");
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it("should refresh notifications when refresh button is clicked", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    // Clear previous fetch calls
    fetch.mockClear();

    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notifications")
      );
    });
  });

  it("should display correct notification icons", async () => {
    const notificationsWithDifferentTypes = [
      { ...mockNotifications[0], type: "BUY_SOON" },
      { ...mockNotifications[1], type: "DOSE_DUE" },
      { ...mockNotifications[0], id: 3, type: "MISSED_DOSE" },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: notificationsWithDifferentTypes, count: 3 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Buy Soon")).toBeInTheDocument();
      expect(screen.getByText("Dose Due")).toBeInTheDocument();
      expect(screen.getByText("Missed Dose")).toBeInTheDocument();
    });
  });

  it("should format notification time correctly", async () => {
    const recentNotification = {
      ...mockNotifications[0],
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [recentNotification], count: 1 }),
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("30m ago")).toBeInTheDocument();
    });
  });
});
