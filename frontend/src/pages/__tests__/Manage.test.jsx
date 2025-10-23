import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Manage from "../Manage";

// Mock SearchFilter component
vi.mock("../components/SearchFilter", () => ({
  default: ({ onSearch, onFilter, onSort }) => (
    <div data-testid="search-filter">
      <input
        data-testid="search-input"
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search..."
      />
      <button
        data-testid="filter-button"
        onClick={() => onFilter({ active_status: "active" })}
      >
        Filter
      </button>
      <button data-testid="sort-button" onClick={() => onSort("name_asc")}>
        Sort
      </button>
    </div>
  ),
}));

// Mock MedicationCard component
vi.mock("../components/MedicationCard", () => ({
  default: ({ medication, onEdit, onDelete, onUpdateInventory }) => (
    <div data-testid={`medication-card-${medication.id}`}>
      <h3>{medication.name}</h3>
      <p>{medication.strength}</p>
      <p>Tablets: {medication.total_tablets}</p>
      {onEdit && (
        <button data-testid={`edit-${medication.id}`} onClick={() => onEdit()}>
          Edit
        </button>
      )}
      {onDelete && (
        <button
          data-testid={`delete-${medication.id}`}
          onClick={() => onDelete(medication.id)}
        >
          Delete
        </button>
      )}
      {onUpdateInventory && (
        <button
          data-testid={`update-inventory-${medication.id}`}
          onClick={() => onUpdateInventory(medication.id)}
        >
          Update Inventory
        </button>
      )}
    </div>
  ),
}));

// Mock other components
vi.mock("../components/LoadingSpinner", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock("../components/ErrorMessage", () => ({
  default: ({ message }) => <div data-testid="error-message">{message}</div>,
}));

// Mock fetch
global.fetch = vi.fn();

describe("Manage", () => {
  const mockMedications = [
    {
      id: 1,
      name: "Aspirin",
      strength: "100mg",
      route_id: 1,
      frequency_id: 1,
      start_date: "2024-01-01",
      end_date: null,
      total_tablets: 50,
      notes: "Take with food",
      doses: [
        { dose_amount: 1, time_of_day: "08:00" },
        { dose_amount: 1, time_of_day: "20:00" },
      ],
    },
    {
      id: 2,
      name: "Vitamin D",
      strength: "1000 IU",
      route_id: 1,
      frequency_id: 2,
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      total_tablets: 5,
      notes: "Morning dose",
      doses: [{ dose_amount: 1, time_of_day: "08:00" }],
    },
  ];

  const mockRoutes = [
    { id: 1, name: "Oral" },
    { id: 2, name: "Topical" },
  ];

  const mockFrequencies = [
    { id: 1, name: "Twice Daily" },
    { id: 2, name: "Once Daily" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url === "/api/medications") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockMedications }),
        });
      }
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

    // Mock window.location
    delete window.location;
    window.location = { href: "" };

    // Mock confirm
    window.confirm = vi.fn(() => true);

    // Mock prompt
    window.prompt = vi.fn(() => "100");
  });

  it("renders loading state initially", () => {
    render(<Manage />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders medications list after loading", async () => {
    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByText("Manage Medications")).toBeInTheDocument();
    });

    expect(screen.getByTestId("medication-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("medication-card-2")).toBeInTheDocument();
    expect(screen.getByText("Aspirin")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D")).toBeInTheDocument();
  });

  it("displays correct medication count", async () => {
    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByText("2 of 2 medications")).toBeInTheDocument();
    });
  });

  it("handles medication deletion", async () => {
    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByTestId("delete-1")).toBeInTheDocument();
    });

    fetch.mockImplementationOnce(() => Promise.resolve({ ok: true }));

    const deleteButton = screen.getByTestId("delete-1");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/medications/1", {
        method: "DELETE",
      });
    });
  });

  it("handles inventory update", async () => {
    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByTestId("update-inventory-1")).toBeInTheDocument();
    });

    fetch.mockImplementationOnce(() => Promise.resolve({ ok: true }));

    const updateButton = screen.getByTestId("update-inventory-1");
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/medications/1/update-inventory",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            total_tablets: 100,
            reason: "Manual update from manage page",
          }),
        }
      );
    });
  });

  it("displays error message when API fails", async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      })
    );

    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("shows empty state when no medications", async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    );

    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByText("No medications yet")).toBeInTheDocument();
      expect(
        screen.getByText("Get started by adding your first medication.")
      ).toBeInTheDocument();
    });
  });

  it("displays quick stats correctly", async () => {
    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByText("Quick Stats")).toBeInTheDocument();
      expect(screen.getByText("Total Medications")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Low Inventory")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  it("navigates to add medication page", async () => {
    render(<Manage />);

    await waitFor(() => {
      expect(screen.getByText("Add Medication")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Medication");
    fireEvent.click(addButton);

    expect(window.location.href).toBe("/manage/new");
  });
});
