import { forwardRef } from "react";

const Icon = forwardRef(
  (
    {
      children,
      size = "md",
      color = "current",
      className = "",
      "aria-label": ariaLabel,
      "aria-hidden": ariaHidden = !ariaLabel,
      role,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: "w-3 h-3", // 12px
      sm: "w-4 h-4", // 16px
      md: "w-5 h-5", // 20px
      lg: "w-6 h-6", // 24px
      xl: "w-8 h-8", // 32px
      "2xl": "w-10 h-10", // 40px
      "3xl": "w-12 h-12", // 48px
    };

    const colorClasses = {
      current: "text-current",
      inherit: "text-inherit",
      primary: "text-primary-600 dark:text-primary-400",
      secondary: "text-neutral-600 dark:text-neutral-400",
      success: "text-success-600 dark:text-success-400",
      warning: "text-warning-600 dark:text-warning-400",
      error: "text-error-600 dark:text-error-400",
      info: "text-info-600 dark:text-info-400",
      muted: "text-neutral-400 dark:text-neutral-600",
      white: "text-white",
      black: "text-black",
    };

    const classes = [
      "icon-base",
      sizeClasses[size],
      colorClasses[color],
      "flex-shrink-0", // Prevent icon from shrinking
      className,
    ]
      .filter(Boolean)
      .join(" ");

    // Accessibility props
    const accessibilityProps = {
      "aria-label": ariaLabel,
      "aria-hidden": ariaHidden,
      role: role || (ariaLabel ? "img" : undefined),
    };

    return (
      <span ref={ref} className={classes} {...accessibilityProps} {...props}>
        {children}
      </span>
    );
  }
);

// Wrapper for Heroicons with consistent sizing
const HeroIcon = forwardRef(
  (
    {
      icon: IconComponent,
      size = "md",
      color = "current",
      className = "",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    if (!IconComponent) {
      console.warn("HeroIcon: No icon component provided");
      return null;
    }

    const sizeClasses = {
      xs: "w-3 h-3",
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
      xl: "w-8 h-8",
      "2xl": "w-10 h-10",
      "3xl": "w-12 h-12",
    };

    const colorClasses = {
      current: "text-current",
      inherit: "text-inherit",
      primary: "text-primary-600 dark:text-primary-400",
      secondary: "text-neutral-600 dark:text-neutral-400",
      success: "text-success-600 dark:text-success-400",
      warning: "text-warning-600 dark:text-warning-400",
      error: "text-error-600 dark:text-error-400",
      info: "text-info-600 dark:text-info-400",
      muted: "text-neutral-400 dark:text-neutral-600",
      white: "text-white",
      black: "text-black",
    };

    const classes = [
      sizeClasses[size],
      colorClasses[color],
      "flex-shrink-0",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <IconComponent
        ref={ref}
        className={classes}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel}
        role={ariaLabel ? "img" : undefined}
        {...props}
      />
    );
  }
);

// Interactive icon button component
const IconButton = forwardRef(
  (
    {
      children,
      icon: IconComponent,
      size = "md",
      variant = "ghost",
      color = "default",
      className = "",
      "aria-label": ariaLabel,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: "p-1", // 28px touch target
      sm: "p-1.5", // 32px touch target
      md: "p-2", // 36px touch target
      lg: "p-3", // 44px touch target
      xl: "p-4", // 52px touch target
    };

    const iconSizes = {
      xs: "xs",
      sm: "sm",
      md: "md",
      lg: "lg",
      xl: "xl",
    };

    const variantClasses = {
      ghost: "icon-button-ghost",
      filled: "icon-button-filled",
      outline: "icon-button-outline",
    };

    const colorClasses = {
      default: "icon-button-default",
      primary: "icon-button-primary",
      success: "icon-button-success",
      warning: "icon-button-warning",
      error: "icon-button-error",
    };

    const classes = [
      "icon-button-base",
      "focus-visible",
      sizeClasses[size],
      variantClasses[variant],
      colorClasses[color],
      disabled && "icon-button-disabled",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const iconContent = IconComponent ? (
      <HeroIcon
        icon={IconComponent}
        size={iconSizes[size]}
        aria-hidden="true"
      />
    ) : (
      children
    );

    return (
      <button
        ref={ref}
        type="button"
        className={classes}
        aria-label={ariaLabel}
        disabled={disabled}
        {...props}
      >
        {iconContent}
      </button>
    );
  }
);

// Display names
Icon.displayName = "Icon";
HeroIcon.displayName = "HeroIcon";
IconButton.displayName = "IconButton";

export { Icon, HeroIcon, IconButton };
export default Icon;
