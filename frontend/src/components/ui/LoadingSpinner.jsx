import { forwardRef } from "react";

const LoadingSpinner = forwardRef(
  (
    {
      size = "md",
      className = "",
      color = "primary",
      variant = "spinner",
      speed = "normal",
      "aria-label": ariaLabel = "Loading",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: "w-3 h-3",
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-8 h-8",
      xl: "w-12 h-12",
      "2xl": "w-16 h-16",
    };

    const colorClasses = {
      primary: "loading-primary",
      secondary: "loading-secondary",
      success: "loading-success",
      warning: "loading-warning",
      error: "loading-error",
      neutral: "loading-neutral",
      white: "loading-white",
      current: "loading-current",
    };

    const variantClasses = {
      spinner: "loading-spinner",
      dots: "loading-dots",
      pulse: "loading-pulse",
      bars: "loading-bars",
      ring: "loading-ring",
    };

    const speedClasses = {
      slow: "loading-slow",
      normal: "loading-normal",
      fast: "loading-fast",
    };

    const classes = [
      "loading-base",
      variantClasses[variant],
      sizeClasses[size],
      colorClasses[color],
      speedClasses[speed],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (variant === "dots") {
      return (
        <div
          ref={ref}
          className={classes}
          role="status"
          aria-label={ariaLabel}
          {...props}
        >
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
          <span className="sr-only">{ariaLabel}</span>
        </div>
      );
    }

    if (variant === "bars") {
      return (
        <div
          ref={ref}
          className={classes}
          role="status"
          aria-label={ariaLabel}
          {...props}
        >
          <div className="loading-bar" />
          <div className="loading-bar" />
          <div className="loading-bar" />
          <div className="loading-bar" />
          <span className="sr-only">{ariaLabel}</span>
        </div>
      );
    }

    if (variant === "pulse") {
      return (
        <div
          ref={ref}
          className={classes}
          role="status"
          aria-label={ariaLabel}
          {...props}
        >
          <div className="loading-pulse-circle" />
          <span className="sr-only">{ariaLabel}</span>
        </div>
      );
    }

    // Default spinner and ring variants
    return (
      <div
        ref={ref}
        className={classes}
        role="status"
        aria-label={ariaLabel}
        {...props}
      >
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
