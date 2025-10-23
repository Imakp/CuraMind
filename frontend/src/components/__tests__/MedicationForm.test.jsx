import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MedicationForm from "../MedicationForm";

// Mock components
vi.mock("../DoseForm", () => ({
  default: ({ doses, onChange, error }) => (
    <div data-testid="dose-form">
      <div>Doses: {doses.length}</div>
      {error && <div data-testid="dose-error">{error}</div>}
      <button
        data-testid="add-dose"
        onClick={() =>
          onChange([
            ...doses,
            { id: Date.now(), dose_amount: 1, time_of_day: "08:00" },
          ])
        }
      >
        Add Dose
      </button>
    </div>
  ),
}));

vi.mock("../SkipDateCalendar", () => ({
  default: ({ selectedDates, onChange }) => (
    <div data-testid="skip-date-calendar">
      <div>Skip dates: {selectedDates.length}</div>
      <button
        data-testid="add-skip-date"
        onClick={() => onChange([...selectedDates, "2024-01-15"])}
      >
        Add Skip Date
      </button>
    </div>
  ),
}));

vi.mock("../InventoryTracker", () => ({
  default: ({ sheetSize, totalTablets, onChange }) => (
    <div data-testid="inventory-tracker">
      <div>Sheet size: {sheetSize}</div>
      <div>Total tablets: {totalTablets}</div>
      <button
        data-testid="update-inventory"
        onClick={() => onChange({ sheet_size: 20, total_tablets: 100 })}
      >
        Update Inventory
      </button>
    </div>
  ),
}));

vi.mock("../DatePicker", () => ({
  default: ({ value, onChange, placeholder }) => (
    <input
      data-testid="date-picker"
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("../LoadingSpinner", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock("../ErrorMessage", () => ({
  default: ({ message, onDismiss }) => (
    <div data-testid="error-message">
      {message}
      {onDismiss && (
        <button data-testid="dismiss-error" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe("MedicationForm", () => {
  const mockRoutes = [
    { id: 1, name: "Oral" },
    { id: 2, name: "Topical" },
  ];

  const mockFrequencies = [
    { id: 1, name: "Once Daily" },
    { id: 2, name: "Twice Daily" },
  ];

  const mockMedication = {
    id: 1,
    name: "Test Medication",
    strength: "100mg",
    route_id: 1,
    frequency_id: 1,
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    sheet_size: 10,
    total_tablets: 50,
    notes: "Test notes",
    doses: [{ id: 1, dose_amount: 1, time_of_day: "08:00" }],
    skip_dates: [{ skip_date: "2024-01-15" }],
  };

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url === "/api/settings/routes") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockRoutes }),
        });
      }
      if (url === "/api/settings/frequencies") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFrequencies }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Not found" } }),
      });
    });
  });

  it("renders loading state initially", () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders form after loading master data", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText("Basic Information")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Medication Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Route/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Frequency/)).toBeInTheDocument();
    expect(screen.getByTestId("dose-form")).toBeInTheDocument();
    expect(screen.getByTestId("skip-date-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("inventory-tracker")).toBeInTheDocument();
  });

  it("populates form with medication data when editing", async () => {
    render(
      <MedicationForm
        medication={mockMedication}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Medication")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("100mg")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-01-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-12-31")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test notes")).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText("Basic Information")).toBeInTheDocument();
    });

    const submitButton = screen.getByText("Create Medication");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Medication name is required")
      ).toBeInTheDocument();
      expect(screen.getByText("Route is required")).toBeInTheDocument();
      expect(screen.getByText("Frequency is required")).toBeInTheDocument();
      expect(screen.getByTestId("dose-error")).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("validates end date is after start date", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText("Basic Information")).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Medication Name/), {
      target: { value: "Test Med" },
    });
    fireEvent.change(screen.getByLabelText(/Route/), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/Frequency/), {
      target: { value: "1" },
    });

    // Set invalid dates
    const datePickers = screen.getAllByTestId("date-picker");
    fireEvent.change(datePickers[0], { target: { value: "2024-12-31" } }); // start date
    fireEvent.change(datePickers[1], { target: { value: "2024-01-01" } }); // end date

    // Add a dose
    fireEvent.click(screen.getByTestId("add-dose"));

    const submitButton = screen.getByText("Create Medication");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("End date must be after start date")
      ).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText("Basic Information")).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Medication Name/), {
      target: { value: "Test Med" },
    });
    fireEvent.change(screen.getByLabelText(/Route/), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/Frequency/), {
      target: { value: "1" },
    });

    // Add a dose
    fireEvent.click(screen.getByTestId("add-dose"));

    const submitButton = screen.getByText("Create Medication");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Med",
          route_id: "1",
          frequency_id: "1",
          doses: expect.arrayContaining([
            expect.objectContaining({
              dose_amount: 1,
              time_of_day: "08:00",
            }),
          ]),
        })
      );
    });
  });

  it("handles dose management", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByTestId("dose-form")).toBeInTheDocument();
    });

    expect(screen.getByText("Doses: 0")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("add-dose"));

    expect(screen.getByText("Doses: 1")).toBeInTheDocument();
  });

  it("handles skip date management", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByTestId("skip-date-calendar")).toBeInTheDocument();
    });

    expect(screen.getByText("Skip dates: 0")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("add-skip-date"));

    expect(screen.getByText("Skip dates: 1")).toBeInTheDocument();
  });

  it("handles inventory management", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByTestId("inventory-tracker")).toBeInTheDocument();
    });

    expect(screen.getByText("Sheet size: 10")).toBeInTheDocument();
    expect(screen.getByText("Total tablets: 0")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("update-inventory"));

    expect(screen.getByText("Sheet size: 20")).toBeInTheDocument();
    expect(screen.getByText("Total tablets: 100")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("displays error message when API fails", async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      })
    );

    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText(/Failed to load form data/)).toBeInTheDocument();
    });
  });

  it("shows correct button text for editing vs creating", async () => {
    // Test create mode
    render(<MedicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText("Create Medication")).toBeInTheDocument();
    });

    // Test edit mode
    render(
      <MedicationForm
        medication={mockMedication}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Update Medication")).toBeInTheDocument();
    });
  });

  it("calculates active days correctly", async () => {
    render(
      <MedicationForm
        medication={mockMedication}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Skip Days:")).toBeInTheDocument();
      expect(screen.getByText("Active Days:")).toBeInTheDocument();
    });
  });
});
