import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DoseForm from '../DoseForm'

const mockRoutes = [
  { id: 1, name: 'Oral' },
  { id: 2, name: 'Sublingual' },
  { id: 3, name: 'Topical' }
]

describe('DoseForm', () => {
  it('renders form fields correctly', () => {
    render(<DoseForm onSave={vi.fn()} onCancel={vi.fn()} />)
    
    expect(screen.getByLabelText(/dose amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/time of day/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/special instructions/i)).toBeInTheDocument()
    expect(screen.getByText('Add Dose')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows route override when routes are provided', () => {
    render(
      <DoseForm 
        onSave={vi.fn()} 
        onCancel={vi.fn()} 
        availableRoutes={mockRoutes}
        defaultRoute="Oral"
      />
    )
    
    expect(screen.getByLabelText(/route override/i)).toBeInTheDocument()
    expect(screen.getByText('Use default (Oral)')).toBeInTheDocument()
    expect(screen.getByText('Sublingual')).toBeInTheDocument()
  })

  it('populates form when editing existing dose', () => {
    const existingDose = {
      dose_amount: 2,
      time_of_day: '08:30',
      route_override: 2,
      instructions: 'Take with food'
    }
    
    render(
      <DoseForm 
        dose={existingDose}
        onSave={vi.fn()} 
        onCancel={vi.fn()}
        availableRoutes={mockRoutes}
      />
    )
    
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('08:30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Take with food')).toBeInTheDocument()
    expect(screen.getByText('Update Dose')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const mockOnSave = vi.fn()
    render(<DoseForm onSave={mockOnSave} onCancel={vi.fn()} />)
    
    const submitButton = screen.getByText('Add Dose')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Dose amount must be greater than 0')).toBeInTheDocument()
      expect(screen.getByText('Time is required')).toBeInTheDocument()
    })
    
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('validates dose amount is positive', async () => {
    const mockOnSave = vi.fn()
    render(<DoseForm onSave={mockOnSave} onCancel={vi.fn()} />)
    
    const doseInput = screen.getByLabelText(/dose amount/i)
    const timeInput = screen.getByLabelText(/time of day/i)
    
    fireEvent.change(doseInput, { target: { value: '0' } })
    fireEvent.change(timeInput, { target: { value: '08:30' } })
    
    const submitButton = screen.getByText('Add Dose')
    fireEvent.click(submitButton)
    
    // The form should not submit with invalid data
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('validates time format', async () => {
    render(<DoseForm onSave={vi.fn()} onCancel={vi.fn()} />)
    
    const doseInput = screen.getByLabelText(/dose amount/i)
    const timeInput = screen.getByLabelText(/time of day/i)
    
    fireEvent.change(doseInput, { target: { value: '1' } })
    // HTML time input won't accept invalid format, so test with empty time
    fireEvent.change(timeInput, { target: { value: '' } })
    
    const submitButton = screen.getByText('Add Dose')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Time is required')).toBeInTheDocument()
    })
  })

  it('calls onSave with correct data when form is valid', async () => {
    const mockOnSave = vi.fn().mockResolvedValue()
    render(<DoseForm onSave={mockOnSave} onCancel={vi.fn()} />)
    
    const doseInput = screen.getByLabelText(/dose amount/i)
    const timeInput = screen.getByLabelText(/time of day/i)
    const instructionsInput = screen.getByLabelText(/special instructions/i)
    
    fireEvent.change(doseInput, { target: { value: '1.5' } })
    fireEvent.change(timeInput, { target: { value: '08:30' } })
    fireEvent.change(instructionsInput, { target: { value: 'Take with food' } })
    
    const submitButton = screen.getByText('Add Dose')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        dose_amount: 1.5,
        time_of_day: '08:30',
        route_override: null,
        instructions: 'Take with food'
      })
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = vi.fn()
    render(<DoseForm onSave={vi.fn()} onCancel={mockOnCancel} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    const mockOnSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    render(<DoseForm onSave={mockOnSave} onCancel={vi.fn()} />)
    
    const doseInput = screen.getByLabelText(/dose amount/i)
    const timeInput = screen.getByLabelText(/time of day/i)
    
    fireEvent.change(doseInput, { target: { value: '1' } })
    fireEvent.change(timeInput, { target: { value: '08:30' } })
    
    const submitButton = screen.getByText('Add Dose')
    fireEvent.click(submitButton)
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    await waitFor(() => {
      expect(screen.getByText('Add Dose')).toBeInTheDocument()
    })
  })

  it('sets current time when "Now" button is clicked', () => {
    render(<DoseForm onSave={vi.fn()} onCancel={vi.fn()} />)
    
    const nowButton = screen.getByText('Now')
    fireEvent.click(nowButton)
    
    const timeInput = screen.getByLabelText(/time of day/i)
    expect(timeInput.value).toMatch(/^\d{2}:\d{2}$/)
  })

  it('clears errors when user starts typing', async () => {
    render(<DoseForm onSave={vi.fn()} onCancel={vi.fn()} />)
    
    // Trigger validation errors
    const submitButton = screen.getByText('Add Dose')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Dose amount must be greater than 0')).toBeInTheDocument()
    })
    
    // Start typing in dose field
    const doseInput = screen.getByLabelText(/dose amount/i)
    fireEvent.change(doseInput, { target: { value: '1' } })
    
    expect(screen.queryByText('Dose amount must be greater than 0')).not.toBeInTheDocument()
  })

  it('includes route override in submission when selected', async () => {
    const mockOnSave = vi.fn().mockResolvedValue()
    render(
      <DoseForm 
        onSave={mockOnSave} 
        onCancel={vi.fn()} 
        availableRoutes={mockRoutes}
      />
    )
    
    const doseInput = screen.getByLabelText(/dose amount/i)
    const timeInput = screen.getByLabelText(/time of day/i)
    const routeSelect = screen.getByLabelText(/route override/i)
    
    fireEvent.change(doseInput, { target: { value: '1' } })
    fireEvent.change(timeInput, { target: { value: '08:30' } })
    fireEvent.change(routeSelect, { target: { value: '2' } })
    
    const submitButton = screen.getByText('Add Dose')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        dose_amount: 1,
        time_of_day: '08:30',
        route_override: '2',
        instructions: ''
      })
    })
  })
})