import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MedicationEdit from "../MedicationEdit";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// Mock MedicationForm component
vi.mock("../components/MedicationForm", () => ({
  default: ({ medication, onSubmit, onCancel, isSubmitting }) => (
    <div data-testid="medication-form">
      <div data-testid="medication-name">
        {medication?.name || "No medication"}
      </div>
      <button
        data-testid="submit-form"
        onClick={() =>
          onSubmit({
            name: "Updated Medication",
            route_id: 1,
            frequency_id: 1,
            doses: [{ dose_amount: 2, time_of_day: "09:00" }],
          })
        }
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Update"}
      </button>
      <button data-testid="cancel-form" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

// Mock LoadingSpinner component
vi.mock("../components/LoadingSpinner", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock ErrorMessage component
vi.mock("../components/ErrorMessage", () => ({
  default: ({ title, message, onRetry, onDismiss }) => (
    <div data-testid="error-message">
      {title && <div data-testid="error-title">{title}</div>}
      {message}
      {onRetry && (
        <button data-testid="retry-button" onClick={onRetry}>
          Retry
        </button>
      )}
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

describe("MedicationEdit", () => {
  const mockMedication = {
    id: 1,
    name: "Test Medication",
    strength: "100mg",
    route_id: 1,
    frequency_id: 1,
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    total_tablets: 50,
    doses: [{ id: 1, dose_amount: 1, time_of_day: "08:00" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseParams.mockReturnValue({ id: "1" });
  });

  it("renders loading state initially", () => {
    fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<MedicationEdit />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("fetches and displays medication data", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMedication }),
    });

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByText("Edit Medication")).toBeInTheDocument();
      expect(screen.getByText("Editing Test Medication")).toBeInTheDocument();
      expect(screen.getByTestId("medication-form")).toBeInTheDocument();
      expect(screen.getByTestId("medication-name")).toHaveTextContent(
        "Test Medication"
      );
    });

    expect(fetch).toHaveBeenCalledWith("/api/medications/1");
  });

  it("handles fetch error", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({ error: { message: "Medication not found" } }),
    });

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByTestId("error-title")).toHaveTextContent(
        "Failed to Load Medication"
      );
      expect(screen.getByText("Medication not found")).toBeInTheDocument();
      expect(screen.getByTestId("retry-button")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("medication-form")).not.toBeInTheDocument();
  });

  it("handles successful form submission", async () => {
    // Mock initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMedication }),
    });

    // Mock update request
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { ...mockMedication, name: "Updated Medication" },
        }),
    });

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("medication-form")).toBeInTheDocument();
    });

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/medications/1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Medication",
          route_id: 1,
          frequency_id: 1,
          doses: [{ dose_amount: 2, time_of_day: "09:00" }],
        }),
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/manage");
  });

  it("handles form submission error", async () => {
    // Mock initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMedication }),
    });

    // Mock update error
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Update failed" } }),
    });

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("medication-form")).toBeInTheDocument();
    });

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles cancel action", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMedication }),
    });

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("medication-form")).toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId("cancel-form");
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith("/manage");
  });

  it("handles back button click", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMedication }),
    });

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("medication-form")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: "" }); // SVG button
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/manage");
  });

  it("shows loading state during submission", async () => {
    // Mock initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMedication }),
    });

    // Mock slow update request
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ data: mockMedication }),
              }),
            100
          );
        })
    );

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("medication-form")).toBeInTheDocument();
    });

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/manage");
    });
  });

  it("handles missing medication ID", () => {
    mockUseParams.mockReturnValue({}); // No ID

    render(<MedicationEdit />);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows dismissing error messages", async () => {
    // Mock initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockMedication }),
    });

    // Mock update error
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Server error" } }),
    });

    render(<MedicationEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("medication-form")).toBeInTheDocument();
    });

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
    });

    const dismissButton = screen.getByTestId("dismiss-error");
    fireEvent.click(dismissButton);

    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
  });
});
