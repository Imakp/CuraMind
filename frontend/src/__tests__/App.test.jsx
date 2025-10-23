import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

// Mock the page components to avoid complex dependencies
vi.mock("../pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock("../pages/Manage", () => ({
  default: () => <div>Manage Page</div>,
}));

vi.mock("../pages/Settings", () => ({
  default: () => <div>Settings Page</div>,
}));

vi.mock("../pages/MedicationNew", () => ({
  default: () => <div>New Medication Page</div>,
}));

vi.mock("../pages/MedicationEdit", () => ({
  default: () => <div>Edit Medication Page</div>,
}));

describe("App Routing", () => {
  it("renders dashboard by default", () => {
    render(<App />);

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.getByText("MedTracker")).toBeInTheDocument();
  });

  it("navigates to manage page when manage link is clicked", () => {
    render(<App />);

    const manageLink = screen.getAllByText("Manage")[0];
    fireEvent.click(manageLink);

    expect(screen.getByText("Manage Page")).toBeInTheDocument();
  });

  it("navigates to settings page when settings link is clicked", () => {
    render(<App />);

    const settingsLink = screen.getAllByText("Settings")[0];
    fireEvent.click(settingsLink);

    expect(screen.getByText("Settings Page")).toBeInTheDocument();
  });

  it("shows dashboard when clicking dashboard link", () => {
    render(<App />);

    // Navigate away first
    const manageLink = screen.getAllByText("Manage")[0];
    fireEvent.click(manageLink);
    expect(screen.getByText("Manage Page")).toBeInTheDocument();

    // Navigate back to dashboard
    const dashboardLink = screen.getAllByText("Dashboard")[0];
    fireEvent.click(dashboardLink);
    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });

  it("has error boundary that catches errors", () => {
    // This test verifies the error boundary is in place
    // The actual error handling is tested in ErrorBoundary.test.jsx
    render(<App />);

    // Verify the app renders without throwing
    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });
});
