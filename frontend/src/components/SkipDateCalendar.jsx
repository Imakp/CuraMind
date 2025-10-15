import { useState, useEffect } from 'react'

const SkipDateCalendar = ({ 
  selectedDates = [], 
  onDatesChange, 
  startDate = null, 
  endDate = null,
  disabled = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [localSelectedDates, setLocalSelectedDates] = useState(new Set())

  useEffect(() => {
    setLocalSelectedDates(new Set(selectedDates.map(date => 
      typeof date === 'string' ? date : date.toISOString().split('T')[0]
    )))
  }, [selectedDates])

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  const parseDate = (dateString) => {
    return new Date(dateString + 'T00:00:00')
  }

  const isDateInRange = (date) => {
    if (!startDate && !endDate) return true
    
    const checkDate = new Date(date)
    const start = startDate ? parseDate(startDate) : null
    const end = endDate ? parseDate(endDate) : null
    
    if (start && checkDate < start) return false
    if (end && checkDate > end) return false
    
    return true
  }

  const isDateSelected = (date) => {
    return localSelectedDates.has(formatDate(date))
  }

  const toggleDate = (date) => {
    if (disabled || !isDateInRange(date)) return
    
    const dateString = formatDate(date)
    const newSelectedDates = new Set(localSelectedDates)
    
    if (newSelectedDates.has(dateString)) {
      newSelectedDates.delete(dateString)
    } else {
      newSelectedDates.add(dateString)
    }
    
    setLocalSelectedDates(newSelectedDates)
    onDatesChange(Array.from(newSelectedDates))
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(prev.getMonth() + direction)
      return newMonth
    })
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const clearAllDates = () => {
    if (disabled) return
    setLocalSelectedDates(new Set())
    onDatesChange([])
  }

  const days = getDaysInMonth(currentMonth)
  const monthYear = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })

  const selectedCount = localSelectedDates.size
  const activeDays = startDate && endDate ? 
    Math.ceil((parseDate(endDate) - parseDate(startDate)) / (1000 * 60 * 60 * 24)) + 1 - selectedCount :
    null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Skip Dates</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Today
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={clearAllDates}
              disabled={disabled}
              className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h4 className="text-lg font-medium text-gray-900">{monthYear}</h4>
        
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="p-2" />
          }
          
          const isSelected = isDateSelected(day)
          const isInRange = isDateInRange(day)
          const isToday = formatDate(day) === formatDate(new Date())
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => toggleDate(day)}
              disabled={disabled || !isInRange}
              className={`
                p-2 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                ${isSelected 
                  ? 'bg-red-100 text-red-800 border border-red-300' 
                  : isInRange 
                    ? 'hover:bg-gray-100 text-gray-900' 
                    : 'text-gray-400 cursor-not-allowed'
                }
                ${isToday && !isSelected ? 'bg-blue-50 border border-blue-200' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {day.getDate()}
            </button>
          )
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
                .map(date => (
                  <span
                    key={date}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800"
                  >
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    <button
                      type="button"
                      onClick={() => toggleDate(parseDate(date))}
                      disabled={disabled}
                      className="ml-1 hover:bg-red-200 rounded-full p-0.5 disabled:opacity-50"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
  )
}

export default SkipDateCalendar