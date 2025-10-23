import { forwardRef } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/20/solid";

const SummaryCard = forwardRef(
  (
    {
      title,
      value,
      subtitle,
      icon,
      trend,
      trendValue,
      trendLabel,
      color = "primary",
      size = "md",
      variant = "default",
      loading = false,
      className = "",
      onClick,
      ...props
    },
    ref
  ) => {
    const colorClasses = {
      primary: "summary-card-primary",
      success: "summary-card-success",
      warning: "summary-card-warning",
      error: "summary-card-error",
      info: "summary-card-info",
      neutral: "summary-card-neutral",
    };

    const sizeClasses = {
      sm: "summary-card-sm",
      md: "summary-card-md",
      lg: "summary-card-lg",
    };

    const variantClasses = {
      default: "summary-card-default",
      outlined: "summary-card-outlined",
      filled: "summary-card-filled",
      gradient: "summary-card-gradient",
    };

    const classes = [
      "summary-card-base",
      colorClasses[color],
      sizeClasses[size],
      variantClasses[variant],
      "hover-scale-sm transition-all duration-200 card-parallax tilt-hover",
      onClick && "summary-card-interactive interactive-enhanced",
      loading && "summary-card-loading",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const Component = onClick ? "button" : "div";

    const renderTrend = () => {
      if (!trend || !trendValue) return null;

      const trendIcon = trend === "up" ? ArrowUpIcon : ArrowDownIcon;
      const TrendIcon = trendIcon;
      const trendColorClass =
        trend === "up" ? "text-success-600" : "text-error-600";

      return (
        <div className="summary-card-trend">
          <div className={`summary-card-trend-indicator ${trendColorClass}`}>
            <TrendIcon className="w-3 h-3" aria-hidden="true" />
            <span className="summary-card-trend-value">{trendValue}</span>
          </div>
          {trendLabel && (
            <span className="summary-card-trend-label">{trendLabel}</span>
          )}
        </div>
      );
    };

    if (loading) {
      return (
        <div ref={ref} className={classes} {...props}>
          <div className="summary-card-content">
            <div className="summary-card-header">
              <div className="summary-card-icon-skeleton loading-skeleton" />
              <div className="summary-card-title-skeleton loading-skeleton" />
            </div>
            <div className="summary-card-body">
              <div className="summary-card-value-skeleton loading-skeleton" />
              <div className="summary-card-subtitle-skeleton loading-skeleton" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <Component
        ref={ref}
        className={classes}
        onClick={onClick}
        type={onClick ? "button" : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        {...props}
      >
        <div className="summary-card-content">
          <div className="summary-card-header">
            {icon && (
              <div className="summary-card-icon" aria-hidden="true">
                {icon}
              </div>
            )}
            <h3 className="summary-card-title">{title}</h3>
          </div>

          <div className="summary-card-body">
            <div className="summary-card-value-container">
              <span className="summary-card-value">{value}</span>
              {renderTrend()}
            </div>

            {subtitle && <p className="summary-card-subtitle">{subtitle}</p>}
          </div>
        </div>

        {onClick && (
          <div className="summary-card-hover-indicator" aria-hidden="true" />
        )}
      </Component>
    );
  }
);

SummaryCard.displayName = "SummaryCard";

export default SummaryCard;
