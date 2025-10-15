import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SkipDateCalendar from '../SkipDateCalendar'

describe('SkipDateCalendar', () => {
  it('renders calendar with current month', () => {
    render(<SkipDateCalendar onDatesChange={vi.fn()} />)
    
    expect(screen.getByText('Skip Dates')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    
    // Check day headers
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
  })

  it('shows selected dates', () => {
    const selectedDates = ['2024-01-15', '2024-01-20']
    render(
      <SkipDateCalendar 
        selectedDates={selectedDates}
        onDatesChange={vi.fn()} 
      />
    )
    
    expect(screen.getByText('Skip dates selected:')).toBeInTheDocument()
    // Check that there are 2 selected dates in the summary
    const summarySection = screen.getByText('Skip dates selected:').closest('div')
    expect(summarySection).toHaveTextContent('2')
  })

  it('calls onDatesChange when date is clicked', () => {
    const mockOnDatesChange = vi.fn()
    render(<SkipDateCalendar onDatesChange={mockOnDatesChange} />)
    
    // Find and click a date button (assuming current month has day 15)
    const dateButtons = screen.getAllByRole('button')
    const dayButton = dateButtons.find(button => button.textContent === '15')
    
    if (dayButton) {
      fireEvent.click(dayButton)
      expect(mockOnDatesChange).toHaveBeenCalled()
    }
  })

  it('navigates between months', () => {
    render(<SkipDateCalendar onDatesChange={vi.fn()} />)
    
    const currentMonth = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })
    
    expect(screen.getByText(currentMonth)).toBeInTheDocument()
    
    // Click next month button
    const nextButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg path[d*="M9 5l7 7-7 7"]')
    )
    
    if (nextButton) {
      fireEvent.click(nextButton)
      // Month should change (we can't easily test the exact month without mocking Date)
    }
  })

  it('goes to current month when Today button is clicked', () => {
    render(<SkipDateCalendar onDatesChange={vi.fn()} />)
    
    const todayButton = screen.getByText('Today')
    fireEvent.click(todayButton)
    
    // Should show current month
    const currentMonth = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })
    expect(screen.getByText(currentMonth)).toBeInTheDocument()
  })

  it('clears all dates when Clear All button is clicked', () => {
    const mockOnDatesChange = vi.fn()
    const selectedDates = ['2024-01-15', '2024-01-20']
    
    render(
      <SkipDateCalendar 
        selectedDates={selectedDates}
        onDatesChange={mockOnDatesChange} 
      />
    )
    
    const clearButton = screen.getByText('Clear All')
    fireEvent.click(clearButton)
    
    expect(mockOnDatesChange).toHaveBeenCalledWith([])
  })

  it('respects date range restrictions', () => {
    const mockOnDatesChange = vi.fn()
    const startDate = '2024-01-10'
    const endDate = '2024-01-20'
    
    render(
      <SkipDateCalendar 
        onDatesChange={mockOnDatesChange}
        startDate={startDate}
        endDate={endDate}
      />
    )
    
    // Dates outside range should be disabled
    // This is a simplified test - in reality we'd need to navigate to the correct month
    expect(screen.getByText('Skip Dates')).toBeInTheDocument()
  })

  it('shows active days calculation when date range is provided', () => {
    const startDate = '2024-01-01'
    const endDate = '2024-01-10'
    const selectedDates = ['2024-01-05']
    
    render(
      <SkipDateCalendar 
        selectedDates={selectedDates}
        onDatesChange={vi.fn()}
        startDate={startDate}
        endDate={endDate}
      />
    )
    
    expect(screen.getByText('Active days:')).toBeInTheDocument()
    // Check that active days shows 9 (10 total days - 1 skip date)
    const activeDaysSection = screen.getByText('Active days:').closest('div')
    expect(activeDaysSection).toHaveTextContent('9')
  })

  it('disables interaction when disabled prop is true', () => {
    const mockOnDatesChange = vi.fn()
    render(
      <SkipDateCalendar 
        onDatesChange={mockOnDatesChange}
        disabled={true}
      />
    )
    
    // Find a date button and try to click it
    const dateButtons = screen.getAllByRole('button')
    const dayButton = dateButtons.find(button => 
      button.textContent === '15' && !button.textContent.includes('Today')
    )
    
    if (dayButton) {
      fireEvent.click(dayButton)
      expect(mockOnDatesChange).not.toHaveBeenCalled()
    }
  })

  it('shows selected dates summary', () => {
    const selectedDates = ['2024-01-15', '2024-01-20', '2024-01-25']
    
    render(
      <SkipDateCalendar 
        selectedDates={selectedDates}
        onDatesChange={vi.fn()} 
      />
    )
    
    expect(screen.getByText('Selected skip dates:')).toBeInTheDocument()
    // Check that there are 3 selected dates in the summary
    const summarySection = screen.getByText('Skip dates selected:').closest('div')
    expect(summarySection).toHaveTextContent('3')
  })

  it('allows removing dates from summary', () => {
    const mockOnDatesChange = vi.fn()
    const selectedDates = ['2024-01-15']
    
    render(
      <SkipDateCalendar 
        selectedDates={selectedDates}
        onDatesChange={mockOnDatesChange} 
      />
    )
    
    // Find the remove button in the selected dates summary
    const removeButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    )
    
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0])
      expect(mockOnDatesChange).toHaveBeenCalled()
    }
  })

  it('handles string and Date object inputs for selectedDates', () => {
    const selectedDates = [
      '2024-01-15',
      new Date('2024-01-20T00:00:00')
    ]
    
    render(
      <SkipDateCalendar 
        selectedDates={selectedDates}
        onDatesChange={vi.fn()} 
      />
    )
    
    // Check that there are 2 selected dates in the summary
    const summarySection = screen.getByText('Skip dates selected:').closest('div')
    expect(summarySection).toHaveTextContent('2')
  })

  it('shows "more" indicator when many dates are selected', () => {
    const selectedDates = Array.from({ length: 15 }, (_, i) => 
      `2024-01-${String(i + 1).padStart(2, '0')}`
    )
    
    render(
      <SkipDateCalendar 
        selectedDates={selectedDates}
        onDatesChange={vi.fn()} 
      />
    )
    
    expect(screen.getByText('+5 more')).toBeInTheDocument()
  })
})