import { useState, useEffect } from 'react'

const SearchFilter = ({ 
  onSearch, 
  onFilter, 
  onSort,
  placeholder = 'Search...',
  searchValue = '',
  filters = [],
  sortOptions = [],
  selectedFilters = {},
  selectedSort = '',
  disabled = false
}) => {
  const [localSearchValue, setLocalSearchValue] = useState(searchValue)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  useEffect(() => {
    setLocalSearchValue(searchValue)
  }, [searchValue])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setLocalSearchValue(value)
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      onSearch(value)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    onSearch(localSearchValue)
  }

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...selectedFilters }
    
    if (value === '' || value === null) {
      delete newFilters[filterKey]
    } else {
      newFilters[filterKey] = value
    }
    
    onFilter(newFilters)
  }

  const handleSortChange = (sortValue) => {
    onSort(sortValue)
  }

  const clearAllFilters = () => {
    onFilter({})
    onSort('')
    onSearch('')
    setLocalSearchValue('')
  }

  const activeFilterCount = Object.keys(selectedFilters).length + (selectedSort ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={localSearchValue}
            onChange={handleSearchChange}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {localSearchValue && (
            <button
              type="button"
              onClick={() => {
                setLocalSearchValue('')
                onSearch('')
              }}
              disabled={disabled}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Filter Toggle Button */}
        {(filters.length > 0 || sortOptions.length > 0) && (
          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            disabled={disabled}
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
              isFiltersOpen || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </div>
          </button>
        )}
      </form>

      {/* Filters Panel */}
      {isFiltersOpen && (filters.length > 0 || sortOptions.length > 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">Filters & Sorting</h3>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={disabled}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sort Options */}
            {sortOptions.length > 0 && (
              <div>
                <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  id="sort-select"
                  value={selectedSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
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

            {/* Filter Options */}
            {filters.map((filter) => (
              <div key={filter.key}>
                <label htmlFor={`filter-${filter.key}`} className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                {filter.type === 'select' ? (
                  <select
                    id={`filter-${filter.key}`}
                    value={selectedFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {filter.options.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedFilters[filter.key]?.includes(option.value) || false}
                          onChange={(e) => {
                            const currentValues = selectedFilters[filter.key] || []
                            const newValues = e.target.checked
                              ? [...currentValues, option.value]
                              : currentValues.filter(v => v !== option.value)
                            handleFilterChange(filter.key, newValues.length > 0 ? newValues : null)
                          }}
                          disabled={disabled}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    id={`filter-${filter.key}`}
                    type={filter.type || 'text'}
                    value={selectedFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    disabled={disabled}
                    placeholder={filter.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(selectedFilters).map(([key, value]) => {
            const filter = filters.find(f => f.key === key)
            if (!filter || !value) return null
            
            const displayValue = Array.isArray(value) 
              ? value.join(', ')
              : filter.options?.find(opt => opt.value === value)?.label || value
            
            return (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {filter.label}: {displayValue}
                <button
                  type="button"
                  onClick={() => handleFilterChange(key, null)}
                  disabled={disabled}
                  className="ml-2 hover:bg-blue-200 rounded-full p-0.5 disabled:opacity-50"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )
          })}
          
          {selectedSort && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              Sort: {sortOptions.find(opt => opt.value === selectedSort)?.label || selectedSort}
              <button
                type="button"
                onClick={() => handleSortChange('')}
                disabled={disabled}
                className="ml-2 hover:bg-green-200 rounded-full p-0.5 disabled:opacity-50"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchFilter