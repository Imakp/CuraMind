import { render, screen } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Layout from "../Layout";

const TestPage = () => <div>Test Page Content</div>;

const LayoutWrapper = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<TestPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

describe("Layout", () => {
  it("renders navigation and outlet content", () => {
    render(<LayoutWrapper />);

    // Check that navigation is rendered
    expect(screen.getByText("MedTracker")).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard")).toHaveLength(2); // Desktop and mobile
    expect(screen.getAllByText("Manage")).toHaveLength(2);
    expect(screen.getAllByText("Settings")).toHaveLength(2);

    // Check that outlet content is rendered
    expect(screen.getByText("Test Page Content")).toBeInTheDocument();
  });

  it("has correct layout structure", () => {
    render(<LayoutWrapper />);

    const main = screen.getByRole("main");
    expect(main).toHaveClass(
      "max-w-7xl",
      "mx-auto",
      "py-6",
      "px-4",
      "sm:px-6",
      "lg:px-8"
    );
  });
});
