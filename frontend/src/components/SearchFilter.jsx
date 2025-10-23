import { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";

const SearchFilter = ({
  onSearch,
  onFilter,
  onSort,
  placeholder = "Search...",
  searchValue = "",
  filters = [],
  sortOptions = [],
  selectedFilters = {},
  selectedSort = "",
  disabled = false,
}) => {
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    setLocalSearchValue(searchValue);
  }, [searchValue]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchValue(value);

    // Debounce search
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(localSearchValue);
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...selectedFilters };

    if (value === "" || value === null) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = value;
    }

    onFilter(newFilters);
  };

  const handleSortChange = (sortValue) => {
    onSort(sortValue);
  };

  const clearAllFilters = () => {
    onFilter({});
    onSort("");
    onSearch("");
    setLocalSearchValue("");
  };

  const activeFilterCount =
    Object.keys(selectedFilters).length + (selectedSort ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Enhanced Search Bar with better visual hierarchy */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <div className="form-input-container">
            <input
              type="text"
              value={localSearchValue}
              onChange={handleSearchChange}
              disabled={disabled}
              placeholder={placeholder}
              className="form-input-base form-input-md w-full pl-12 pr-12"
              aria-label="Search medications"
            />

            {/* Search icon */}
            <div className="form-input-icon form-input-icon-left">
              <HeroIcon
                icon={MagnifyingGlassIcon}
                size="md"
                className="text-neutral-400"
              />
            </div>

            {/* Clear search button */}
            {localSearchValue && (
              <div className="form-input-icon form-input-icon-right">
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchValue("");
                    onSearch("");
                  }}
                  disabled={disabled}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Clear search"
                >
                  <HeroIcon icon={XMarkIcon} size="sm" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Filter Toggle Button */}
        {(filters.length > 0 || sortOptions.length > 0) && (
          <Button
            type="button"
            variant={
              isFiltersOpen || activeFilterCount > 0 ? "primary" : "secondary"
            }
            size="md"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            disabled={disabled}
            className="flex-shrink-0 relative"
            aria-label={`${
              isFiltersOpen ? "Hide" : "Show"
            } filters and sorting options`}
            aria-expanded={isFiltersOpen}
          >
            <HeroIcon
              icon={
                activeFilterCount > 0 ? AdjustmentsHorizontalIcon : FunnelIcon
              }
              size="sm"
              className="mr-2"
            />
            <span className="hidden sm:inline">Filters</span>

            {/* Active filter count badge */}
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-error-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </form>

      {/* Enhanced Filters Panel with better visual hierarchy */}
      {isFiltersOpen && (filters.length > 0 || sortOptions.length > 0) && (
        <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 space-y-6 animate-slide-down">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
              <HeroIcon
                icon={AdjustmentsHorizontalIcon}
                size="md"
                className="mr-2 text-primary-600"
              />
              Filters & Sorting
            </h3>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                disabled={disabled}
                className="text-error-600 hover:text-error-700 hover:bg-error-50"
              >
                <HeroIcon icon={XMarkIcon} size="sm" className="mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Enhanced Sort Options */}
            {sortOptions.length > 0 && (
              <div className="form-field">
                <label htmlFor="sort-select" className="form-label">
                  Sort By
                </label>
                <select
                  id="sort-select"
                  value={selectedSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  disabled={disabled}
                  className="form-input-base form-input-md w-full"
                >
                  <option value="">Default</option>
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Enhanced Filter Options */}
            {filters.map((filter) => (
              <div key={filter.key} className="form-field">
                <label htmlFor={`filter-${filter.key}`} className="form-label">
                  {filter.label}
                </label>
                {filter.type === "select" ? (
                  <select
                    id={`filter-${filter.key}`}
                    value={selectedFilters[filter.key] || ""}
                    onChange={(e) =>
                      handleFilterChange(filter.key, e.target.value)
                    }
                    disabled={disabled}
                    className="form-input-base form-input-md w-full"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === "checkbox" ? (
                  <div className="space-y-3">
                    {filter.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedFilters[filter.key]?.includes(
                              option.value
                            ) || false
                          }
                          onChange={(e) => {
                            const currentValues =
                              selectedFilters[filter.key] || [];
                            const newValues = e.target.checked
                              ? [...currentValues, option.value]
                              : currentValues.filter((v) => v !== option.value);
                            handleFilterChange(
                              filter.key,
                              newValues.length > 0 ? newValues : null
                            );
                          }}
                          disabled={disabled}
                          className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded disabled:opacity-50 transition-colors duration-200"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors duration-200">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    id={`filter-${filter.key}`}
                    type={filter.type || "text"}
                    value={selectedFilters[filter.key] || ""}
                    onChange={(e) =>
                      handleFilterChange(filter.key, e.target.value)
                    }
                    disabled={disabled}
                    placeholder={filter.placeholder}
                    className="form-input-base form-input-md w-full"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Active Filters ({activeFilterCount})
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedFilters).map(([key, value]) => {
              const filter = filters.find((f) => f.key === key);
              if (!filter || !value) return null;

              const displayValue = Array.isArray(value)
                ? value.join(", ")
                : filter.options?.find((opt) => opt.value === value)?.label ||
                  value;

              return (
                <span
                  key={key}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 border border-primary-200 dark:border-primary-800 transition-colors duration-200"
                >
                  <span className="font-medium">{filter.label}:</span>
                  <span className="ml-1">{displayValue}</span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange(key, null)}
                    disabled={disabled}
                    className="ml-2 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-1 disabled:opacity-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label={`Remove ${filter.label} filter`}
                  >
                    <HeroIcon icon={XMarkIcon} size="xs" />
                  </button>
                </span>
              );
            })}

            {selectedSort && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200 border border-success-200 dark:border-success-800 transition-colors duration-200">
                <span className="font-medium">Sort:</span>
                <span className="ml-1">
                  {sortOptions.find((opt) => opt.value === selectedSort)
                    ?.label || selectedSort}
                </span>
                <button
                  type="button"
                  onClick={() => handleSortChange("")}
                  disabled={disabled}
                  className="ml-2 hover:bg-success-200 dark:hover:bg-success-800 rounded-full p-1 disabled:opacity-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-success-500"
                  aria-label="Remove sort"
                >
                  <HeroIcon icon={XMarkIcon} size="xs" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
