import { forwardRef, useEffect, useRef, useState } from "react";

// Skip Link component for keyboard navigation
export const SkipLink = forwardRef(
  (
    { href = "#main-content", children = "Skip to main content", ...props },
    ref
  ) => {
    return (
      <a ref={ref} href={href} className="skip-link focus-visible" {...props}>
        {children}
      </a>
    );
  }
);

// Screen Reader Only component
export const ScreenReaderOnly = forwardRef(
  ({ children, focusable = false, ...props }, ref) => {
    const className = focusable ? "sr-only sr-only-focusable" : "sr-only";

    return (
      <span ref={ref} className={className} {...props}>
        {children}
      </span>
    );
  }
);

// Live Region component for announcements
export const LiveRegion = forwardRef(
  (
    {
      children,
      level = "polite",
      atomic = false,
      relevant = "additions text",
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`live-region ${className}`}
        aria-live={level}
        aria-atomic={atomic}
        aria-relevant={relevant}
        {...props}
      >
        {children}
      </div>
    );
  }
);

// Focus Trap component for modals and dialogs
export const FocusTrap = ({ children, active = true, restoreFocus = true }) => {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!active) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);

    return () => {
      container.removeEventListener("keydown", handleTabKey);

      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, restoreFocus]);

  return <div ref={containerRef}>{children}</div>;
};

// Landmark component for semantic regions
export const Landmark = forwardRef(
  (
    {
      as: Component = "div",
      role,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

// Heading component with proper hierarchy
export const AccessibleHeading = forwardRef(
  ({ level = 1, children, className = "", visualLevel, ...props }, ref) => {
    const Tag = `h${level}`;
    const visualClass = visualLevel
      ? `text-heading-${visualLevel}`
      : `text-heading-${level}`;

    return (
      <Tag
        ref={ref}
        className={`heading-base ${visualClass} ${className}`}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);

// Announcer component for dynamic content changes
export const Announcer = ({ message, level = "polite", delay = 100 }) => {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (message) {
      // Clear previous announcement
      setAnnouncement("");

      // Set new announcement after a brief delay to ensure it's announced
      const timer = setTimeout(() => {
        setAnnouncement(message);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [message, delay]);

  return <LiveRegion level={level}>{announcement}</LiveRegion>;
};

// Keyboard navigation helper
export const useKeyboardNavigation = (
  containerRef,
  {
    selector = '[role="menuitem"], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    orientation = "vertical",
    loop = true,
    autoFocus = false,
  } = {}
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll(selector));
    if (items.length === 0) return;

    if (autoFocus) {
      items[0]?.focus();
    }

    const handleKeyDown = (e) => {
      const currentIndex = items.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      if (orientation === "vertical") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
      } else if (orientation === "horizontal") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
      } else if (orientation === "both") {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
      }

      // Handle Home and End keys
      if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = items.length - 1;
      }

      // Handle looping
      if (loop) {
        if (nextIndex >= items.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = items.length - 1;
      } else {
        nextIndex = Math.max(0, Math.min(nextIndex, items.length - 1));
      }

      if (nextIndex !== currentIndex) {
        items[nextIndex]?.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [selector, orientation, loop, autoFocus]);
};

// Display names
SkipLink.displayName = "SkipLink";
ScreenReaderOnly.displayName = "ScreenReaderOnly";
LiveRegion.displayName = "LiveRegion";
FocusTrap.displayName = "FocusTrap";
Landmark.displayName = "Landmark";
AccessibleHeading.displayName = "AccessibleHeading";
Announcer.displayName = "Announcer";

export default {
  SkipLink,
  ScreenReaderOnly,
  LiveRegion,
  FocusTrap,
  Landmark,
  AccessibleHeading,
  Announcer,
  useKeyboardNavigation,
};
