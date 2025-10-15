import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DatePicker from '../DatePicker'

describe('DatePicker', () => {
  it('renders with label and input', () => {
    const { container } = render(<DatePicker label="Test Date" onChange={vi.fn()} />)
    
    expect(screen.getByText('Test Date')).toBeInTheDocument()
    expect(container.querySelector('input[type="date"]')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows required indicator when required', () => {
    render(<DatePicker label="Required Date" required onChange={vi.fn()} />)
    
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('calls onChange when date is selected', () => {
    const mockOnChange = vi.fn()
    const { container } = render(<DatePicker onChange={mockOnChange} />)
    
    const input = container.querySelector('input[type="date"]')
    fireEvent.change(input, { target: { value: '2024-01-15' } })
    
    expect(mockOnChange).toHaveBeenCalledWith('2024-01-15')
  })

  it('displays formatted date when value is provided', () => {
    render(<DatePicker value="2024-01-15" onChange={vi.fn()} />)
    
    expect(screen.getByText(/Selected: January 15, 2024/)).toBeInTheDocument()
  })

  it('sets today date when Today button is clicked', () => {
    const mockOnChange = vi.fn()
    render(<DatePicker onChange={mockOnChange} />)
    
    const todayButton = screen.getByText('Today')
    fireEvent.click(todayButton)
    
    const today = new Date().toISOString().split('T')[0]
    expect(mockOnChange).toHaveBeenCalledWith(today)
  })

  it('clears date when Clear button is clicked', () => {
    const mockOnChange = vi.fn()
    render(<DatePicker value="2024-01-15" onChange={mockOnChange} />)
    
    const clearButton = screen.getByText('Clear')
    fireEvent.click(clearButton)
    
    expect(mockOnChange).toHaveBeenCalledWith('')
  })

  it('shows Clear button only when value is present', () => {
    const { rerender } = render(<DatePicker value="" onChange={vi.fn()} />)
    
    expect(screen.queryByText('Clear')).not.toBeInTheDocument()
    
    rerender(<DatePicker value="2024-01-15" onChange={vi.fn()} />)
    
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('displays error message when error is provided', () => {
    render(<DatePicker error="Invalid date" onChange={vi.fn()} />)
    
    expect(screen.getByText('Invalid date')).toBeInTheDocument()
  })

  it('applies error styling when error is present', () => {
    const { container } = render(<DatePicker error="Invalid date" onChange={vi.fn()} />)
    
    const input = container.querySelector('input[type="date"]')
    expect(input).toHaveClass('border-red-300')
  })

  it('respects disabled state', () => {
    const { container } = render(<DatePicker disabled onChange={vi.fn()} />)
    
    const input = container.querySelector('input[type="date"]')
    const todayButton = screen.getByText('Today')
    
    expect(input).toBeDisabled()
    expect(todayButton).toBeDisabled()
  })

  it('shows date range helper text when min/max dates are provided', () => {
    render(
      <DatePicker 
        minDate="2024-01-01" 
        maxDate="2024-12-31" 
        onChange={vi.fn()} 
      />
    )
    
    expect(screen.getByText(/Date must be between January 1, 2024 and December 31, 2024/)).toBeInTheDocument()
  })

  it('shows min date helper text when only minDate is provided', () => {
    render(<DatePicker minDate="2024-01-01" onChange={vi.fn()} />)
    
    expect(screen.getByText(/Date must be on or after January 1, 2024/)).toBeInTheDocument()
  })

  it('shows max date helper text when only maxDate is provided', () => {
    render(<DatePicker maxDate="2024-12-31" onChange={vi.fn()} />)
    
    expect(screen.getByText(/Date must be on or before December 31, 2024/)).toBeInTheDocument()
  })

  it('handles invalid date values gracefully', () => {
    const { container } = render(<DatePicker value="invalid-date" onChange={vi.fn()} />)
    
    const input = container.querySelector('input[type="date"]')
    expect(input.value).toBe('')
  })
})