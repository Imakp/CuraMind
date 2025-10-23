import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import AuditLog from "../AuditLog";

// Mock fetch
global.fetch = vi.fn();

const mockAuditLogs = [
  {
    id: 1,
    medicine_id: 1,
    medication_name: "Test Medication",
    action: "DOSE_GIVEN",
    quantity_change: -1.5,
    created_at: "2024-01-15T10:30:00Z",
    old_values: null,
    new_values: { dose_amount: 1.5, time: "10:30" },
  },
  {
    id: 2,
    medicine_id: 1,
    medication_name: "Test Medication",
    action: "INVENTORY_UPDATED",
    quantity_change: 30,
    created_at: "2024-01-14T15:45:00Z",
    old_values: { total_tablets: 20 },
    new_values: { total_tablets: 50, reason: "Refill" },
  },
];

const mockStats = {
  total_logs: 2,
  dose_given_count: 1,
  inventory_updated_count: 1,
  created_count: 0,
  updated_count: 0,
  deleted_count: 0,
  total_quantity_change: 28.5,
  total_quantity_added: 30,
  total_quantity_consumed: 1.5,
};

describe("AuditLog", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it("renders loading state initially", () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AuditLog />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders audit logs after loading", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAuditLogs }),
    });

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText("System Audit Log")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Medication")).toBeInTheDocument();
    expect(screen.getByText("Dose Given")).toBeInTheDocument();
    expect(screen.getByText("Inventory Updated")).toBeInTheDocument();
  });

  it("renders medication-specific audit log when medicationId provided", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAuditLogs }),
    });

    render(<AuditLog medicationId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Medication Audit Log")).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("medicine_id=1")
    );
  });

  it("displays error message when fetch fails", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows statistics when stats button is clicked", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAuditLogs }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats }),
      });

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText("Show Stats")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Show Stats"));

    await waitFor(() => {
      expect(screen.getByText("Statistics")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // total_logs
    });
  });

  it("displays quantity changes with correct colors", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAuditLogs }),
    });

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText("-1.5 tablets")).toBeInTheDocument();
      expect(screen.getByText("+30 tablets")).toBeInTheDocument();
    });

    // Check that negative changes have red color class
    const negativeChange = screen.getByText("-1.5 tablets");
    expect(negativeChange).toHaveClass("text-red-600");

    // Check that positive changes have green color class
    const positiveChange = screen.getByText("+30 tablets");
    expect(positiveChange).toHaveClass("text-green-600");
  });

  it("displays action badges with correct colors", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAuditLogs }),
    });

    render(<AuditLog />);

    await waitFor(() => {
      const doseGivenBadge = screen.getByText("Dose Given");
      expect(doseGivenBadge).toHaveClass("text-blue-600", "bg-blue-50");

      const inventoryUpdatedBadge = screen.getByText("Inventory Updated");
      expect(inventoryUpdatedBadge).toHaveClass(
        "text-green-600",
        "bg-green-50"
      );
    });
  });

  it("shows empty state when no logs found", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<AuditLog />);

    await waitFor(() => {
      expect(
        screen.getByText("No audit logs found matching the current filters.")
      ).toBeInTheDocument();
    });
  });

  it("displays old and new values when available", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAuditLogs }),
    });

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText("Before:")).toBeInTheDocument();
      expect(screen.getByText("After:")).toBeInTheDocument();
    });
  });

  it("handles export functionality", async () => {
    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();

    // Mock document methods
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    };
    document.createElement = vi.fn(() => mockLink);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAuditLogs }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(["mock data"]),
      });

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText("Export JSON")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Export JSON"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/audit/export/logs")
      );
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
