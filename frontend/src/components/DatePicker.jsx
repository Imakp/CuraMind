import { useState } from 'react'

const DatePicker = ({ 
  value = '', 
  onChange, 
  label = 'Date',
  placeholder = 'Select date',
  disabled = false,
  required = false,
  error = '',
  minDate = null,
  maxDate = null
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    // Ensure the date is in YYYY-MM-DD format for input[type="date"]
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toISOString().split('T')[0]
  }

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDateChange = (e) => {
    const newDate = e.target.value
    onChange(newDate)
  }

  const handleClear = () => {
    onChange('')
  }

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0]
    onChange(today)
  }

  const inputValue = formatDateForInput(value)
  const displayValue = formatDateForDisplay(value)

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="date"
            value={inputValue}
            onChange={handleDateChange}
            disabled={disabled}
            min={minDate ? formatDateForInput(minDate) : undefined}
            max={maxDate ? formatDateForInput(maxDate) : undefined}
            className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={placeholder}
          />
          
          {/* Quick action buttons */}
          <button
            type="button"
            onClick={setToday}
            disabled={disabled}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Today
          </button>
          
          {value && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
        
        {/* Display formatted date */}
        {displayValue && (
          <p className="mt-1 text-sm text-gray-600">
            Selected: {displayValue}
          </p>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {/* Helper text */}
      <div className="text-xs text-gray-500">
        {minDate && maxDate && (
          <span>Date must be between {formatDateForDisplay(minDate)} and {formatDateForDisplay(maxDate)}</span>
        )}
        {minDate && !maxDate && (
          <span>Date must be on or after {formatDateForDisplay(minDate)}</span>
        )}
        {!minDate && maxDate && (
          <span>Date must be on or before {formatDateForDisplay(maxDate)}</span>
        )}
      </div>
    </div>
  )
}

export default DatePicker