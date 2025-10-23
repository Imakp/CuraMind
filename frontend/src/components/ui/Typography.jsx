import { forwardRef } from "react";

// Heading component with Golden Ratio scaling
const Heading = forwardRef(
  (
    {
      level = 1,
      children,
      className = "",
      variant = "default",
      color = "default",
      weight = "default",
      ...props
    },
    ref
  ) => {
    const Tag = `h${level}`;

    const baseClasses = "heading-base";

    const levelClasses = {
      1: "text-heading-1",
      2: "text-heading-2",
      3: "text-heading-3",
      4: "text-heading-4",
      5: "text-heading-5",
      6: "text-heading-6",
    };

    const variantClasses = {
      default: "",
      display: "heading-display",
      subtitle: "heading-subtitle",
    };

    const colorClasses = {
      default: "text-neutral-900 dark:text-neutral-100",
      muted: "text-neutral-600 dark:text-neutral-400",
      primary: "text-primary-600 dark:text-primary-400",
      success: "text-success-600 dark:text-success-400",
      warning: "text-warning-600 dark:text-warning-400",
      error: "text-error-600 dark:text-error-400",
    };

    const weightClasses = {
      default: "",
      light: "font-light",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    };

    const classes = [
      baseClasses,
      levelClasses[level],
      variantClasses[variant],
      colorClasses[color],
      weightClasses[weight],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Tag ref={ref} className={classes} {...props}>
        {children}
      </Tag>
    );
  }
);

// Text component for body text
const Text = forwardRef(
  (
    {
      children,
      className = "",
      size = "base",
      color = "default",
      weight = "normal",
      variant = "default",
      as: Component = "p",
      ...props
    },
    ref
  ) => {
    const baseClasses = "text-base-component";

    const sizeClasses = {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
    };

    const colorClasses = {
      default: "text-neutral-700 dark:text-neutral-300",
      muted: "text-neutral-500 dark:text-neutral-500",
      subtle: "text-neutral-600 dark:text-neutral-400",
      primary: "text-primary-600 dark:text-primary-400",
      success: "text-success-600 dark:text-success-400",
      warning: "text-warning-600 dark:text-warning-400",
      error: "text-error-600 dark:text-error-400",
      white: "text-white",
    };

    const weightClasses = {
      light: "font-light",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    };

    const variantClasses = {
      default: "",
      caption: "text-caption",
      body: "text-body",
      "body-large": "text-body-large",
      "body-small": "text-body-small",
    };

    const classes = [
      baseClasses,
      sizeClasses[size],
      colorClasses[color],
      weightClasses[weight],
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Component ref={ref} className={classes} {...props}>
        {children}
      </Component>
    );
  }
);

// Label component for form labels and captions
const Label = forwardRef(
  (
    {
      children,
      className = "",
      size = "sm",
      color = "default",
      weight = "medium",
      required = false,
      htmlFor,
      ...props
    },
    ref
  ) => {
    const baseClasses = "label-base";

    const sizeClasses = {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
    };

    const colorClasses = {
      default: "text-neutral-700 dark:text-neutral-300",
      muted: "text-neutral-500 dark:text-neutral-500",
      primary: "text-primary-600 dark:text-primary-400",
      error: "text-error-600 dark:text-error-400",
    };

    const weightClasses = {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
    };

    const classes = [
      baseClasses,
      sizeClasses[size],
      colorClasses[color],
      weightClasses[weight],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <label ref={ref} htmlFor={htmlFor} className={classes} {...props}>
        {children}
        {required && (
          <span
            className="text-error-500 ml-1"
            aria-label="required field"
            role="img"
          >
            *
          </span>
        )}
      </label>
    );
  }
);

// Code component for inline and block code
const Code = forwardRef(
  (
    { children, className = "", variant = "inline", size = "sm", ...props },
    ref
  ) => {
    const Component = variant === "block" ? "pre" : "code";

    const baseClasses = "code-base";

    const variantClasses = {
      inline: "code-inline",
      block: "code-block",
    };

    const sizeClasses = {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
    };

    const classes = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Component ref={ref} className={classes} {...props}>
        {variant === "block" ? <code>{children}</code> : children}
      </Component>
    );
  }
);

// Display names for better debugging
Heading.displayName = "Heading";
Text.displayName = "Text";
Label.displayName = "Label";
Code.displayName = "Code";

export { Heading, Text, Label, Code };
export default { Heading, Text, Label, Code };
