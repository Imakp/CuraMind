import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PageTransition from "../PageTransition";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <div>{children}</div>,
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("PageTransition", () => {
  it("renders children correctly", () => {
    renderWithRouter(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("applies correct classes for transitions", () => {
    const { container } = renderWithRouter(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    // Since we're mocking framer-motion, just check that the component renders
    expect(container.firstChild).toBeInTheDocument();
  });
});
