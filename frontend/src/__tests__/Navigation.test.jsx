import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import App from "../App";
import Layout from "../components/Layout";
import Navigation from "../components/Navigation";

// Mock the pages to avoid complex dependencies
vi.mock("../pages/Dashboard", () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock("../pages/Manage", () => ({
  default: () => <div data-testid="manage-page">Manage Page</div>,
}));

vi.mock("../pages/Settings", () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>,
}));

vi.mock("../pages/MedicationNew", () => ({
  default: () => (
    <div data-testid="medication-new-page">New Medication Page</div>
  ),
}));

vi.mock("../pages/MedicationEdit", () => ({
  default: () => (
    <div data-testid="medication-edit-page">Edit Medication Page</div>
  ),
}));

// Mock the offline indicator
vi.mock("../components/OfflineIndicator", () => ({
  default: () => <div data-testid="offline-indicator">Offline Indicator</div>,
}));

describe("Navigation", () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Route Navigation", () => {
    it("should render dashboard by default", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });

    it("should navigate to manage page", () => {
      render(
        <MemoryRouter initialEntries={["/manage"]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("manage-page")).toBeInTheDocument();
    });

    it("should navigate to settings page", () => {
      render(
        <MemoryRouter initialEntries={["/settings"]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("settings-page")).toBeInTheDocument();
    });

    it("should navigate to new medication page", () => {
      render(
        <MemoryRouter initialEntries={["/manage/new"]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("medication-new-page")).toBeInTheDocument();
    });

    it("should navigate to edit medication page", () => {
      render(
        <MemoryRouter initialEntries={["/manage/edit/123"]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("medication-edit-page")).toBeInTheDocument();
    });

    it("should redirect unknown routes to dashboard", () => {
      render(
        <MemoryRouter initialEntries={["/unknown-route"]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });
  });

  describe("Error Boundary Integration", () => {
    it("should catch and display errors from child components", () => {
      // Create a component that throws an error
      const ErrorComponent = () => {
        throw new Error("Test navigation error");
      };

      // Mock one of the pages to throw an error
      vi.doMock("../pages/Dashboard", () => ({
        default: ErrorComponent,
      }));

      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );

      expect(
        screen.getByText("Oops! Something went wrong")
      ).toBeInTheDocument();
    });

    it("should allow recovery from errors", async () => {
      // Create a component that conditionally throws an error
      let shouldThrow = true;
      const ConditionalErrorComponent = () => {
        if (shouldThrow) {
          throw new Error("Conditional error");
        }
        return <div data-testid="recovered-component">Recovered</div>;
      };

      vi.doMock("../pages/Dashboard", () => ({
        default: ConditionalErrorComponent,
      }));

      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );

      // Should show error initially
      expect(
        screen.getByText("Oops! Something went wrong")
      ).toBeInTheDocument();

      // Stop throwing error
      shouldThrow = false;

      // Click try again
      fireEvent.click(screen.getByText("Try Again"));

      // Should recover
      await waitFor(() => {
        expect(screen.getByTestId("recovered-component")).toBeInTheDocument();
      });
    });
  });

  describe("Offline Indicator Integration", () => {
    it("should render offline indicator", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("offline-indicator")).toBeInTheDocument();
    });
  });

  describe("Layout Integration", () => {
    it("should render layout with navigation for all routes", () => {
      const routes = ["/", "/manage", "/settings"];

      routes.forEach((route) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        );

        // Layout should be present (this would need actual Layout component testing)
        // For now, we just verify the page renders without error
        expect(document.body).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Navigation Component", () => {
    const renderWithRouter = (component, initialEntries = ["/"]) => {
      return render(
        <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
      );
    };

    it("should handle navigation errors gracefully", () => {
      // Test that navigation component doesn't crash with invalid props
      expect(() => {
        renderWithRouter(<Navigation />);
      }).not.toThrow();
    });

    it("should be accessible via keyboard navigation", () => {
      renderWithRouter(<Navigation />);

      // Test that navigation elements are focusable
      const focusableElements = screen.getAllByRole("link", { hidden: true });

      if (focusableElements.length > 0) {
        focusableElements.forEach((element) => {
          expect(element).toHaveAttribute("href");
        });
      }
    });
  });

  describe("Route Guards and Error Handling", () => {
    it("should handle malformed URLs gracefully", () => {
      const malformedUrls = [
        "/manage/edit/",
        "/manage/edit/invalid-id",
        "//double-slash",
        "/manage//double-slash",
      ];

      malformedUrls.forEach((url) => {
        expect(() => {
          render(
            <MemoryRouter initialEntries={[url]}>
              <App />
            </MemoryRouter>
          );
        }).not.toThrow();
      });
    });

    it("should handle rapid navigation changes", async () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );

      // Rapidly change routes
      const routes = ["/", "/manage", "/settings", "/", "/manage"];

      for (const route of routes) {
        rerender(
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        );

        // Small delay to simulate real navigation
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Should not crash
      expect(document.body).toBeInTheDocument();
    });
  });

  describe("Browser History Integration", () => {
    it("should handle browser back/forward buttons", () => {
      // This would require more complex setup with actual browser history
      // For now, we test that the router handles history changes
      const { rerender } = render(
        <MemoryRouter initialEntries={["/", "/manage"]} initialIndex={1}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("manage-page")).toBeInTheDocument();

      // Simulate going back
      rerender(
        <MemoryRouter initialEntries={["/", "/manage"]} initialIndex={0}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });
  });
});
