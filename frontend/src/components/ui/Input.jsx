import { forwardRef, useState } from "react";
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/20/solid";

const Input = forwardRef(
  (
    {
      label,
      error,
      success,
      helpText,
      className = "",
      id,
      required = false,
      size = "md",
      variant = "default",
      type = "text",
      showPasswordToggle = false,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helpId = helpText ? `${inputId}-help` : undefined;
    const successId = success ? `${inputId}-success` : undefined;

    const sizeClasses = {
      sm: "form-input-sm",
      md: "form-input-md",
      lg: "form-input-lg",
    };

    const variantClasses = {
      default: "form-input",
      filled: "form-input-filled",
      borderless: "form-input-borderless",
    };

    const inputClasses = [
      "form-input-base",
      "form-input-animated",
      sizeClasses[size],
      variantClasses[variant],
      error && "form-input-error form-error-animated",
      success && "form-input-success form-success-animated",
      isFocused && "form-input-focused",
      (leftIcon || rightIcon || (type === "password" && showPasswordToggle)) &&
        "form-input-with-icon",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const containerClasses = [
      "form-input-container",
      "form-field-animated",
      isFocused && "form-input-container-focused",
      error && "form-input-container-error",
      success && "form-input-container-success",
    ]
      .filter(Boolean)
      .join(" ");

    const actualType = type === "password" && showPassword ? "text" : type;

    return (
      <div className="form-field">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {required && (
              <span
                className="form-label-required"
                aria-label="required field"
                role="img"
              >
                *
              </span>
            )}
          </label>
        )}

        <div className={containerClasses}>
          {leftIcon && (
            <div
              className="form-input-icon form-input-icon-left"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={inputClasses}
            aria-invalid={error ? "true" : "false"}
            aria-required={required}
            aria-describedby={
              [errorId, helpId, successId].filter(Boolean).join(" ") ||
              undefined
            }
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {(rightIcon || (type === "password" && showPasswordToggle)) && (
            <div className="form-input-icon form-input-icon-right">
              {type === "password" && showPasswordToggle ? (
                <button
                  type="button"
                  className="form-input-password-toggle focus-visible"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            id={errorId}
            className="form-message form-error form-message-animated animate-error"
            role="alert"
          >
            <ExclamationCircleIcon
              className="w-4 h-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        )}

        {success && !error && (
          <div
            id={successId}
            className="form-message form-success form-message-animated success-checkmark"
            role="status"
          >
            <CheckCircleIcon
              className="w-4 h-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{success}</span>
          </div>
        )}

        {helpText && !error && !success && (
          <div id={helpId} className="form-help">
            {helpText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
