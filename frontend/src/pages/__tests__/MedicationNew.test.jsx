import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MedicationNew from "../MedicationNew";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock MedicationForm component
vi.mock("../components/MedicationForm", () => ({
  default: ({ onSubmit, onCancel, isSubmitting }) => (
    <div data-testid="medication-form">
      <button
        data-testid="submit-form"
        onClick={() =>
          onSubmit({
            name: "Test Medication",
            route_id: 1,
            frequency_id: 1,
            doses: [{ dose_amount: 1, time_of_day: "08:00" }],
          })
        }
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Submit"}
      </button>
      <button data-testid="cancel-form" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

// Mock ErrorMessage component
vi.mock("../components/ErrorMessage", () => ({
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

describe("MedicationNew", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("renders the page with correct title", () => {
    render(<MedicationNew />);

    expect(screen.getByText("Add New Medication")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create a new medication with dosing schedule and inventory tracking"
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId("medication-form")).toBeInTheDocument();
  });

  it("handles successful form submission", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    render(<MedicationNew />);

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/medications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Medication",
          route_id: 1,
          frequency_id: 1,
          doses: [{ dose_amount: 1, time_of_day: "08:00" }],
        }),
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/manage");
  });

  it("handles form submission error", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Validation failed" } }),
    });

    render(<MedicationNew />);

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles network error", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<MedicationNew />);

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles cancel action", () => {
    render(<MedicationNew />);

    const cancelButton = screen.getByTestId("cancel-form");
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith("/manage");
  });

  it("handles back button click", () => {
    render(<MedicationNew />);

    const backButton = screen.getByRole("button", { name: "" }); // SVG button
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/manage");
  });

  it("shows loading state during submission", async () => {
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ data: { id: 1 } }),
              }),
            100
          );
        })
    );

    render(<MedicationNew />);

    const submitButton = screen.getByTestId("submit-form");
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/manage");
    });
  });

  it("allows dismissing error messages", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Server error" } }),
    });

    render(<MedicationNew />);

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
