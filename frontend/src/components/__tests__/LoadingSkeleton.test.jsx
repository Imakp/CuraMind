import { render, screen } from "@testing-library/react";
import {
  MedicationCardSkeleton,
  SummaryCardSkeleton,
  DashboardSkeleton,
  ManageSkeleton,
} from "../LoadingSkeleton";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe("LoadingSkeleton Components", () => {
  it("renders MedicationCardSkeleton correctly", () => {
    const { container } = render(<MedicationCardSkeleton />);
    expect(container.firstChild).toHaveClass(
      "bg-white",
      "dark:bg-neutral-800",
      "rounded-xl"
    );
  });

  it("renders SummaryCardSkeleton correctly", () => {
    const { container } = render(<SummaryCardSkeleton />);
    expect(container.firstChild).toHaveClass(
      "bg-white",
      "dark:bg-neutral-800",
      "rounded-xl"
    );
  });

  it("renders DashboardSkeleton with correct structure", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelector(".space-y-8")).toBeInTheDocument();
  });

  it("renders ManageSkeleton with correct structure", () => {
    const { container } = render(<ManageSkeleton />);
    expect(container.querySelector(".space-y-6")).toBeInTheDocument();
  });
});
