import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Settings from "../Settings";

// Mock fetch globally
global.fetch = vi.fn();

describe("Settings Component", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe("Route Management", () => {
    const mockRoutes = [
      {
        id: 1,
        name: "Oral",
        description: "By mouth",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        name: "Inhale",
        description: "Inhaled medication",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    const mockFrequencies = [
      {
        id: 1,
        name: "Daily",
        description: "Once per day",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    it("renders route management interface", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
        expect(screen.getByText("Routes (2)")).toBeInTheDocument();
        expect(screen.getByText("Route Management")).toBeInTheDocument();
      });
    });

    it("displays existing routes", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Oral")).toBeInTheDocument();
        expect(screen.getByText("By mouth")).toBeInTheDocument();
        expect(screen.getByText("Inhale")).toBeInTheDocument();
        expect(screen.getByText("Inhaled medication")).toBeInTheDocument();
      });
    });

    it("validates route form with required fields", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Add New Route")).toBeInTheDocument();
      });

      // Try to submit empty form
      const submitButton = screen.getByText("Add Route");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Route name is required")).toBeInTheDocument();
      });
    });

    it("validates route name length", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Add New Route")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "e.g., Oral, Inhale, Subcutaneous"
      );

      // Test too short
      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.click(screen.getByText("Add Route"));

      await waitFor(() => {
        expect(
          screen.getByText("Route name must be at least 2 characters")
        ).toBeInTheDocument();
      });

      // Test too long
      fireEvent.change(nameInput, { target: { value: "A".repeat(51) } });
      fireEvent.click(screen.getByText("Add Route"));

      await waitFor(() => {
        expect(
          screen.getByText("Route name must be less than 50 characters")
        ).toBeInTheDocument();
      });
    });

    it("validates description length", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Add New Route")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "e.g., Oral, Inhale, Subcutaneous"
      );
      const descriptionInput = screen.getByPlaceholderText(
        "Optional description"
      );

      fireEvent.change(nameInput, { target: { value: "Valid Name" } });
      fireEvent.change(descriptionInput, {
        target: { value: "A".repeat(201) },
      });
      fireEvent.click(screen.getByText("Add Route"));

      await waitFor(() => {
        expect(
          screen.getByText("Description must be less than 200 characters")
        ).toBeInTheDocument();
      });
    });

    it("creates new route successfully", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 3,
              name: "Subcutaneous",
              description: "Under the skin",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              ...mockRoutes,
              { id: 3, name: "Subcutaneous", description: "Under the skin" },
            ],
          }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Add New Route")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "e.g., Oral, Inhale, Subcutaneous"
      );
      const descriptionInput = screen.getByPlaceholderText(
        "Optional description"
      );

      fireEvent.change(nameInput, { target: { value: "Subcutaneous" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Under the skin" },
      });
      fireEvent.click(screen.getByText("Add Route"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/settings/routes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Subcutaneous",
            description: "Under the skin",
          }),
        });
      });
    });

    it("edits existing route", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Oral")).toBeInTheDocument();
      });

      // Click edit button for first route
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit Route")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Oral")).toBeInTheDocument();
        expect(screen.getByDisplayValue("By mouth")).toBeInTheDocument();
      });
    });

    it("cancels route editing", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Oral")).toBeInTheDocument();
      });

      // Click edit button
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit Route")).toBeInTheDocument();
      });

      // Click cancel
      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.getByText("Add New Route")).toBeInTheDocument();
        expect(screen.queryByText("Edit Route")).not.toBeInTheDocument();
      });
    });

    it("deletes route with confirmation", async () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockRoutes[1]] }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Oral")).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          'Are you sure you want to delete the route "Oral"?'
        );
        expect(fetch).toHaveBeenCalledWith("/api/settings/routes/1", {
          method: "DELETE",
        });
      });

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it("handles deletion prevention for referenced routes", async () => {
      // Mock window.alert
      const originalAlert = window.alert;
      window.alert = vi.fn();

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: { message: "Route is referenced by medications" },
          }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Oral")).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          "Cannot delete this route because it is being used by existing medications."
        );
      });

      // Restore original functions
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    });

    it("handles API errors gracefully", async () => {
      fetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });

  describe("Frequency Management", () => {
    const mockRoutes = [];
    const mockFrequencies = [
      {
        id: 1,
        name: "Daily",
        description: "Once per day",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        name: "Twice Daily",
        description: "Two times per day",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    it("switches to frequency management tab", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Frequencies (2)")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Frequencies (2)"));

      await waitFor(() => {
        expect(screen.getByText("Frequency Management")).toBeInTheDocument();
        expect(screen.getByText("Daily")).toBeInTheDocument();
        expect(screen.getByText("Twice Daily")).toBeInTheDocument();
      });
    });

    it("validates frequency form with required fields", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Frequencies (2)")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Frequencies (2)"));

      await waitFor(() => {
        expect(screen.getByText("Add New Frequency")).toBeInTheDocument();
      });

      // Try to submit empty form
      const submitButton = screen.getByText("Add Frequency");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Frequency name is required")
        ).toBeInTheDocument();
      });
    });

    it("creates new frequency successfully", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: 3, name: "As Needed", description: "When required" },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              ...mockFrequencies,
              { id: 3, name: "As Needed", description: "When required" },
            ],
          }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Frequencies (2)")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Frequencies (2)"));

      await waitFor(() => {
        expect(screen.getByText("Add New Frequency")).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "e.g., Daily, Twice Daily, As Needed"
      );
      const descriptionInput = screen.getByPlaceholderText(
        "Optional description"
      );

      fireEvent.change(nameInput, { target: { value: "As Needed" } });
      fireEvent.change(descriptionInput, {
        target: { value: "When required" },
      });
      fireEvent.click(screen.getByText("Add Frequency"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/settings/frequencies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "As Needed",
            description: "When required",
          }),
        });
      });
    });

    it("handles deletion prevention for referenced frequencies", async () => {
      // Mock window.alert and confirm
      const originalAlert = window.alert;
      const originalConfirm = window.confirm;
      window.alert = vi.fn();
      window.confirm = vi.fn(() => true);

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockRoutes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockFrequencies }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: { message: "Frequency is referenced by medications" },
          }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Frequencies (2)")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Frequencies (2)"));

      await waitFor(() => {
        expect(screen.getByText("Daily")).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          "Cannot delete this frequency because it is being used by existing medications."
        );
      });

      // Restore original functions
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    });
  });

  describe("Loading and Error States", () => {
    it("shows loading spinner while fetching data", () => {
      fetch
        .mockImplementationOnce(() => new Promise(() => {})) // Never resolves
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<Settings />);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("displays empty state when no routes exist", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(
          screen.getByText("No routes configured yet.")
        ).toBeInTheDocument();
        expect(
          screen.getByText("Add your first route above.")
        ).toBeInTheDocument();
      });
    });

    it("displays empty state when no frequencies exist", async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByText("Frequencies (0)")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Frequencies (0)"));

      await waitFor(() => {
        expect(
          screen.getByText("No frequencies configured yet.")
        ).toBeInTheDocument();
        expect(
          screen.getByText("Add your first frequency above.")
        ).toBeInTheDocument();
      });
    });
  });
});
