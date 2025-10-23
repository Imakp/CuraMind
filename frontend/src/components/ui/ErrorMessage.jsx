import { forwardRef } from "react";
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { Button } from "./index";

const ErrorMessage = forwardRef(
  (
    {
      children,
      title,
      variant = "error",
      size = "md",
      showIcon = true,
      dismissible = false,
      onDismiss,
      actions = [],
      className = "",
      "aria-live": ariaLive = "polite",
      ...props
    },
    ref
  ) => {
    const variantConfig = {
      error: {
        className: "error-message-error",
        icon: XCircleIcon,
        defaultTitle: "Error",
        semanticColor: "red",
      },
      warning: {
        className: "error-message-warning",
        icon: ExclamationTriangleIcon,
        defaultTitle: "Warning",
        semanticColor: "amber",
      },
      info: {
        className: "error-message-info",
        icon: InformationCircleIcon,
        defaultTitle: "Information",
        semanticColor: "blue",
      },
    };

    const config = variantConfig[variant] || variantConfig.error;
    const Icon = config.icon;

    const sizeClasses = {
      sm: "error-message-sm",
      md: "error-message-md",
      lg: "error-message-lg",
    };

    const classes = [
      "error-message-base",
      config.className,
      sizeClasses[size],
      dismissible && "error-message-dismissible",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const displayTitle = title || config.defaultTitle;

    return (
      <div
        ref={ref}
        className={classes}
        role="alert"
        aria-live={ariaLive}
        data-variant={variant}
        {...props}
      >
        <div className="error-message-content">
          {showIcon && (
            <div className="error-message-icon" aria-hidden="true">
              <Icon className="error-message-icon-svg" />
            </div>
          )}

          <div className="error-message-body">
            {displayTitle && (
              <h4 className="error-message-title">{displayTitle}</h4>
            )}

            {children && (
              <div className="error-message-description">{children}</div>
            )}

            {actions.length > 0 && (
              <div className="error-message-actions">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "secondary"}
                    size="sm"
                    onClick={action.onClick}
                    className="error-message-action-button"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {dismissible && (
            <div className="error-message-dismiss">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                aria-label="Dismiss message"
                className="error-message-dismiss-button"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ErrorMessage.displayName = "ErrorMessage";

export default ErrorMessage;
