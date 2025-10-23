import { forwardRef } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/20/solid";

const StatusBadge = forwardRef(
  (
    {
      status = "neutral",
      children,
      showIcon = true,
      size = "md",
      variant = "filled",
      className = "",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const statusConfig = {
      success: {
        className: "badge-success",
        icon: CheckCircleIcon,
        defaultLabel: "Success",
        semanticColor: "green",
      },
      warning: {
        className: "badge-warning",
        icon: ExclamationTriangleIcon,
        defaultLabel: "Warning",
        semanticColor: "amber",
      },
      error: {
        className: "badge-error",
        icon: XCircleIcon,
        defaultLabel: "Error",
        semanticColor: "red",
      },
      info: {
        className: "badge-info",
        icon: InformationCircleIcon,
        defaultLabel: "Information",
        semanticColor: "blue",
      },
      pending: {
        className: "badge-pending",
        icon: ClockIcon,
        defaultLabel: "Pending",
        semanticColor: "amber",
      },
      processing: {
        className: "badge-processing",
        icon: EllipsisHorizontalIcon,
        defaultLabel: "Processing",
        semanticColor: "blue",
      },
      neutral: {
        className: "badge-neutral",
        icon: null,
        defaultLabel: "Neutral",
        semanticColor: "gray",
      },
    };

    const config = statusConfig[status] || statusConfig.neutral;
    const Icon = config.icon;

    const sizeClasses = {
      sm: "badge-sm",
      md: "badge-md",
      lg: "badge-lg",
    };

    const variantClasses = {
      filled: "badge-filled",
      outline: "badge-outline",
      soft: "badge-soft",
      dot: "badge-dot",
    };

    const classes = [
      "badge-base",
      config.className,
      sizeClasses[size],
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    // Enhanced accessibility
    const accessibilityLabel =
      ariaLabel ||
      `${config.defaultLabel} status: ${children || config.defaultLabel}`;

    return (
      <span
        ref={ref}
        className={classes}
        role="status"
        aria-label={accessibilityLabel}
        data-status={status}
        data-semantic-color={config.semanticColor}
        {...props}
      >
        {showIcon && Icon && variant !== "dot" && (
          <Icon className="badge-icon" aria-hidden="true" role="presentation" />
        )}
        {variant === "dot" && (
          <span
            className="badge-dot-indicator"
            aria-hidden="true"
            role="presentation"
          />
        )}
        {children && <span className="badge-text">{children}</span>}
      </span>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

export default StatusBadge;
