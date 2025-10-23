import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Navigation from "../Navigation";

const NavigationWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("Navigation", () => {
  it("renders navigation items", () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );

    expect(screen.getByText("MedTracker")).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard")).toHaveLength(2); // Desktop and mobile
    expect(screen.getAllByText("Manage")).toHaveLength(2);
    expect(screen.getAllByText("Settings")).toHaveLength(2);
  });

  it("shows mobile menu button on mobile", () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );

    const mobileMenuButton = screen.getByRole("button", {
      name: /open main menu/i,
    });
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it("toggles mobile menu when button is clicked", () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );

    const mobileMenuButton = screen.getByRole("button", {
      name: /open main menu/i,
    });
    const mobileMenu = document.querySelector(".mobile-menu");

    // Initially hidden
    expect(mobileMenu).toHaveClass("hidden");

    // Click to show
    fireEvent.click(mobileMenuButton);
    expect(mobileMenu).toHaveClass("block");
    expect(mobileMenuButton).toHaveAttribute("aria-expanded", "true");

    // Click to hide
    fireEvent.click(mobileMenuButton);
    expect(mobileMenu).toHaveClass("hidden");
    expect(mobileMenuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("has correct navigation links", () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const manageLink = screen.getAllByText("Manage")[0].closest("a");
    const settingsLink = screen.getAllByText("Settings")[0].closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/");
    expect(manageLink).toHaveAttribute("href", "/manage");
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });
});
