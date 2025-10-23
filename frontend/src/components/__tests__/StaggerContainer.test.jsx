import { render, screen } from "@testing-library/react";
import {
  StaggerContainer,
  MedicationCardStagger,
  SummaryCardStagger,
} from "../StaggerContainer";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe("StaggerContainer Components", () => {
  it("renders StaggerContainer with children", () => {
    render(
      <StaggerContainer>
        <div>Child 1</div>
        <div>Child 2</div>
      </StaggerContainer>
    );

    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
  });

  it("renders MedicationCardStagger with correct grid classes", () => {
    const { container } = render(
      <MedicationCardStagger>
        <div>Card 1</div>
        <div>Card 2</div>
      </MedicationCardStagger>
    );

    expect(container.firstChild).toHaveClass(
      "grid",
      "grid-cols-1",
      "md:grid-cols-2",
      "lg:grid-cols-3",
      "gap-6"
    );
  });

  it("renders SummaryCardStagger with correct grid classes", () => {
    const { container } = render(
      <SummaryCardStagger>
        <div>Summary 1</div>
        <div>Summary 2</div>
      </SummaryCardStagger>
    );

    expect(container.firstChild).toHaveClass(
      "grid",
      "grid-cols-2",
      "lg:grid-cols-4",
      "gap-6"
    );
  });
});
