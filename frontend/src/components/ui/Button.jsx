import { forwardRef } from "react";

const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      className = "",
      type = "button",
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const baseClasses = "btn-base focus-visible";
    const sizeClasses = {
      xs: "btn-xs",
      sm: "btn-sm",
      md: "btn-md",
      lg: "btn-lg",
      xl: "btn-xl",
    };
    const variantClasses = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      tertiary: "btn-tertiary",
      success: "btn-success",
      warning: "btn-warning",
      error: "btn-error",
      ghost: "btn-ghost",
      outline: "btn-outline",
    };

    const classes = [
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      loading && "btn-loading",
      "btn-press-enhanced btn-ripple btn-color-shift hover-lift-subtle focus-ring-animate focus-enhanced",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    // Enhanced accessibility attributes
    const accessibilityProps = {
      "aria-disabled": disabled || loading,
      "aria-busy": loading,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={classes}
        {...accessibilityProps}
        {...props}
      >
        {loading && (
          <div
            className="loading-spinner"
            aria-hidden="true"
            role="presentation"
          />
        )}
        <span className={loading ? "btn-content-loading" : "btn-content"}>
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
