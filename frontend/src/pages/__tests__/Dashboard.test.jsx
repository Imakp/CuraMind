import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Dashboard from "../Dashboard";

// Mock fetch globally
global.fetch = vi.fn();

// Mock components
vi.mock("../../components/DatePicker", () => ({
  default: ({ value, onChange, label }) => (
    <div data-testid="date-picker">
      <label>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="date-input"
      />
    </div>
  ),
}));

vi.mock("../../components/MedicationCard", () => ({
  default: ({
    medication,
    onMarkAsGiven,
    showTime,
    timeOfDay,
    doseAmount,
    isMarking,
  }) => (
    <div data-testid={`medication-card-${medication.id}`}>
      <h3>{medication.name}</h3>
      {medication.strength && <p>{medication.strength}</p>}
      {showTime && timeOfDay && <p>Time: {timeOfDay}</p>}
      {doseAmount && <p>Dose: {doseAmount}</p>}
      <p>Tablets: {medication.total_tablets}</p>
      <button
        onClick={() => onMarkAsGiven(medication.id, doseAmount)}
        disabled={isMarking}
        data-testid={`mark-given-${medication.id}`}
      >
        {isMarking ? "Marking..." : "Mark as Given"}
      </button>
    </div>
  ),
}));

vi.mock("../../components/LoadingSpinner", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock("../../components/ErrorMessage", () => ({
  default: ({ message }) => <div data-testid="error-message">{message}</div>,
}));

describe("Dashboard", () => {
  const mockScheduleData = {
    total_medications: 3,
    total_doses: 5,
    skipped_medications: [{ id: 1, name: "Skipped Med", reason: "Holiday" }],
    schedule: {
      morning: [
        {
          medication_id: 1,
          dose_id: 1,
          medication_name: "Aspirin",
          medication_strength: "100mg",
          route: "Oral",
          time_of_day: "08:00",
          dose_amount: 1,
          remaining_tablets: 50,
          is_low_inventory: false,
          instructions: "Take with food",
        },
      ],
      afternoon: [
        {
          medication_id: 2,
          dose_id: 2,
          medication_name: "Vitamin D",
          medication_strength: "1000 IU",
          route: "Oral",
          time_of_day: "14:00",
          dose_amount: 1,
          remaining_tablets: 5,
          is_low_inventory: true,
          instructions: null,
        },
      ],
      evening: [],
      night: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response by default
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockScheduleData }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders dashboard with header and date picker", async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Medication Schedule")).toBeInTheDocument();
        expect(screen.getByTestId("date-picker")).toBeInTheDocument();
        expect(screen.getByText("Select Date")).toBeInTheDocument();
      });
    });

    it("shows loading spinner initially", () => {
      render(<Dashboard />);
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("displays today as default date", async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Today")).toBeInTheDocument();
      });
    });
  });

  describe("Quick Action Buttons", () => {
    it("displays quick action buttons in summary section", async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Add Medication")).toBeInTheDocument();
        expect(screen.getByText("View All")).toBeInTheDocument();
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });
    });

    it("refreshes schedule when refresh button is clicked", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockScheduleData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockScheduleData }),
        });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Refresh"));

      await waitFor(() => {
        // Should call fetch twice: initial load and refresh
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });

    it("displays update button in buy soon alerts", async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Update")).toBeInTheDocument();
      });
    });
  });

  describe("Inventory Management", () => {
    beforeEach(() => {
      // Mock window.prompt
      global.prompt = vi.fn();
    });

    afterEach(() => {
      global.prompt.mockRestore();
    });

    it("updates inventory when update button is clicked", async () => {
      global.prompt.mockReturnValue("100");

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockScheduleData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockScheduleData }),
        });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Update")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Update"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/medications/2/update-inventory",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: expect.stringContaining('"total_tablets":100'),
          })
        );
      });
    });

    it("does not update inventory when invalid amount is entered", async () => {
      global.prompt.mockReturnValue("invalid");

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Update")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Update"));

      // Should not make API call for invalid input
      expect(fetch).toHaveBeenCalledTimes(1); // Only initial load
    });
  });
});
