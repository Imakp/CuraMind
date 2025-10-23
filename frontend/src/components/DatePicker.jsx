import { useState } from "react";
import { CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";

const DatePicker = ({
  value = "",
  onChange,
  label = "Date",
  placeholder = "Select date",
  disabled = false,
  required = false,
  error = "",
  minDate = null,
  maxDate = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    // Ensure the date is in YYYY-MM-DD format for input[type="date"]
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    onChange(newDate);
  };

  const handleClear = () => {
    onChange("");
  };

  const setToday = () => {
    const today = new Date().toISOString().split("T")[0];
    onChange(today);
  };

  const inputValue = formatDateForInput(value);
  const displayValue = formatDateForDisplay(value);

  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-label-required">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Enhanced input container with better mobile experience */}
        <div className="form-input-container">
          <div className="relative flex-1">
            <input
              type="date"
              value={inputValue}
              onChange={handleDateChange}
              disabled={disabled}
              min={minDate ? formatDateForInput(minDate) : undefined}
              max={maxDate ? formatDateForInput(maxDate) : undefined}
              className={`form-input-base form-input-md w-full pl-12 ${
                error ? "form-input-error" : ""
              }`}
              placeholder={placeholder}
              aria-describedby={error ? `${label}-error` : undefined}
            />

            {/* Calendar icon */}
            <div className="form-input-icon form-input-icon-left">
              <HeroIcon
                icon={CalendarIcon}
                size="md"
                className="text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Enhanced quick action buttons with better mobile touch targets */}
        <div className="flex gap-2 mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={setToday}
            disabled={disabled}
            className="flex-1 sm:flex-none"
          >
            Today
          </Button>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="flex-1 sm:flex-none text-error-600 hover:text-error-700 hover:bg-error-50"
            >
              <HeroIcon icon={XMarkIcon} size="sm" className="mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Enhanced display formatted date with better visual treatment */}
        {displayValue && (
          <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <HeroIcon
                icon={CalendarIcon}
                size="sm"
                className="text-primary-600 dark:text-primary-400"
              />
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Selected: {displayValue}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="form-message form-error" id={`${label}-error`}>
          <HeroIcon
            icon={XMarkIcon}
            size="sm"
            className="text-error-600 flex-shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      {/* Enhanced helper text with better typography */}
      {(minDate || maxDate) && (
        <div className="form-help">
          {minDate && maxDate && (
            <span>
              Date must be between {formatDateForDisplay(minDate)} and{" "}
              {formatDateForDisplay(maxDate)}
            </span>
          )}
          {minDate && !maxDate && (
            <span>
              Date must be on or after {formatDateForDisplay(minDate)}
            </span>
          )}
          {!minDate && maxDate && (
            <span>
              Date must be on or before {formatDateForDisplay(maxDate)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DatePicker;
