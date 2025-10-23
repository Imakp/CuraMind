import { useState, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";

const SkipDateCalendar = ({
  selectedDates = [],
  onDatesChange,
  startDate = null,
  endDate = null,
  disabled = false,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [localSelectedDates, setLocalSelectedDates] = useState(new Set());

  useEffect(() => {
    setLocalSelectedDates(
      new Set(
        selectedDates.map((date) =>
          typeof date === "string" ? date : date.toISOString().split("T")[0]
        )
      )
    );
  }, [selectedDates]);

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const parseDate = (dateString) => {
    return new Date(dateString + "T00:00:00");
  };

  const isDateInRange = (date) => {
    if (!startDate && !endDate) return true;

    const checkDate = new Date(date);
    const start = startDate ? parseDate(startDate) : null;
    const end = endDate ? parseDate(endDate) : null;

    if (start && checkDate < start) return false;
    if (end && checkDate > end) return false;

    return true;
  };

  const isDateSelected = (date) => {
    return localSelectedDates.has(formatDate(date));
  };

  const toggleDate = (date) => {
    if (disabled || !isDateInRange(date)) return;

    const dateString = formatDate(date);
    const newSelectedDates = new Set(localSelectedDates);

    if (newSelectedDates.has(dateString)) {
      newSelectedDates.delete(dateString);
    } else {
      newSelectedDates.add(dateString);
    }

    setLocalSelectedDates(newSelectedDates);
    onDatesChange(Array.from(newSelectedDates));
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const clearAllDates = () => {
    if (disabled) return;
    setLocalSelectedDates(new Set());
    onDatesChange([]);
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedCount = localSelectedDates.size;
  const activeDays =
    startDate && endDate
      ? Math.ceil(
          (parseDate(endDate) - parseDate(startDate)) / (1000 * 60 * 60 * 24)
        ) +
        1 -
        selectedCount
      : null;

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
          <HeroIcon
            icon={CalendarIcon}
            size="lg"
            className="mr-2 text-primary-600"
          />
          Skip Dates
        </h3>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          {selectedCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllDates}
              disabled={disabled}
              className="text-error-600 hover:text-error-700 hover:bg-error-50"
            >
              <HeroIcon icon={XMarkIcon} size="sm" className="mr-1" />
              Clear All ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Calendar Navigation */}
      <div className="flex justify-between items-center mb-6">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => navigateMonth(-1)}
          className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
          aria-label="Previous month"
        >
          <HeroIcon icon={ChevronLeftIcon} size="md" />
        </Button>

        <h4 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 px-4">
          {monthYear}
        </h4>

        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => navigateMonth(1)}
          className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
          aria-label="Next month"
        >
          <HeroIcon icon={ChevronRightIcon} size="md" />
        </Button>
      </div>

      {/* Enhanced Calendar Grid with better touch interactions */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {/* Enhanced day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}

        {/* Enhanced calendar days with better touch targets */}
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="p-3" />;
          }

          const isSelected = isDateSelected(day);
          const isInRange = isDateInRange(day);
          const isToday = formatDate(day) === formatDate(new Date());

          return (
            <button
              key={index}
              type="button"
              onClick={() => toggleDate(day)}
              disabled={disabled || !isInRange}
              className={`
                min-h-12 p-3 text-sm font-medium rounded-xl transition-all duration-200 
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                transform hover:scale-105 active:scale-95
                ${
                  isSelected
                    ? "bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-200 border-2 border-error-300 dark:border-error-700 shadow-md"
                    : isInRange
                    ? "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-600"
                    : "text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-transparent"
                }
                ${
                  isToday && !isSelected
                    ? "bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-bold"
                    : ""
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
              aria-label={`${
                isSelected ? "Remove" : "Add"
              } ${day.toLocaleDateString()} as skip date`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Skip dates selected:</span>
            <p className="font-medium text-gray-900">{selectedCount}</p>
          </div>
          {activeDays !== null && (
            <div>
              <span className="text-gray-600">Active days:</span>
              <p className="font-medium text-gray-900">{activeDays}</p>
            </div>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Selected skip dates:</p>
            <div className="flex flex-wrap gap-1">
              {Array.from(localSelectedDates)
                .sort()
                .slice(0, 10) // Show first 10 dates
                .map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800"
                  >
                    {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    <button
                      type="button"
                      onClick={() => toggleDate(parseDate(date))}
                      disabled={disabled}
                      className="ml-1 hover:bg-red-200 rounded-full p-0.5 disabled:opacity-50"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              {selectedCount > 10 && (
                <span className="text-xs text-gray-500">
                  +{selectedCount - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkipDateCalendar;
