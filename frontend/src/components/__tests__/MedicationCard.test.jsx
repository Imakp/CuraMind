import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MedicationCard from '../MedicationCard'

const mockMedication = {
  id: 1,
  name: 'Aspirin',
  strength: '100mg',
  route: 'Oral',
  total_tablets: 50,
  sheet_size: 10,
  defaultDoseAmount: 1,
  dailyConsumption: 2,
  notes: 'Take with food'
}

describe('MedicationCard', () => {
  it('renders medication information correctly', () => {
    render(<MedicationCard medication={mockMedication} />)
    
    expect(screen.getByText('Aspirin')).toBeInTheDocument()
    expect(screen.getByText('100mg')).toBeInTheDocument()
    expect(screen.getByText('Take with food')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument() // tablets remaining
    expect(screen.getByText('5')).toBeInTheDocument() // sheets remaining (50/10)
  })

  it('shows correct inventory status for good stock', () => {
    render(<MedicationCard medication={mockMedication} />)
    
    expect(screen.getByText('In stock')).toBeInTheDocument()
    expect(screen.getByText('In stock')).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows correct inventory status for low stock', () => {
    const lowStockMedication = {
      ...mockMedication,
      total_tablets: 5, // 5 tablets, daily consumption is 2, so 5 <= 2*3 = low stock
    }
    
    render(<MedicationCard medication={lowStockMedication} />)
    
    expect(screen.getByText('Low stock')).toBeInTheDocument()
    expect(screen.getByText('Low stock')).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('shows correct inventory status for critical stock', () => {
    const criticalStockMedication = {
      ...mockMedication,
      total_tablets: 1, // 1 tablet, daily consumption is 2, so 1 <= 2 = critical
    }
    
    render(<MedicationCard medication={criticalStockMedication} />)
    
    expect(screen.getByText('Buy soon!')).toBeInTheDocument()
    expect(screen.getByText('Buy soon!')).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('shows correct inventory status for empty stock', () => {
    const emptyStockMedication = {
      ...mockMedication,
      total_tablets: 0,
    }
    
    render(<MedicationCard medication={emptyStockMedication} />)
    
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    expect(screen.getByText('Out of stock')).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('displays time when showTime is true', () => {
    render(
      <MedicationCard 
        medication={mockMedication} 
        showTime={true} 
        timeOfDay="08:00 AM" 
      />
    )
    
    expect(screen.getByText('08:00 AM')).toBeInTheDocument()
  })

  it('displays dose amount when provided', () => {
    render(
      <MedicationCard 
        medication={mockMedication} 
        doseAmount={2} 
      />
    )
    
    expect(screen.getByText('Dose:')).toBeInTheDocument()
    expect(screen.getByText('2 tablet(s)')).toBeInTheDocument()
  })

  it('calls onMarkAsGiven when mark as given button is clicked', async () => {
    const mockOnMarkAsGiven = vi.fn().mockResolvedValue()
    
    render(
      <MedicationCard 
        medication={mockMedication} 
        onMarkAsGiven={mockOnMarkAsGiven}
        doseAmount={1}
      />
    )
    
    const markButton = screen.getByText('Mark as Given')
    fireEvent.click(markButton)
    
    expect(mockOnMarkAsGiven).toHaveBeenCalledWith(1, 1)
    
    // Button should show loading state
    expect(screen.getByText('Marking...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Mark as Given')).toBeInTheDocument()
    })
  })

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = vi.fn()
    
    render(
      <MedicationCard 
        medication={mockMedication} 
        onEdit={mockOnEdit}
      />
    )
    
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockMedication)
  })

  it('disables mark as given button when out of stock', () => {
    const emptyStockMedication = {
      ...mockMedication,
      total_tablets: 0,
    }
    
    render(
      <MedicationCard 
        medication={emptyStockMedication} 
        onMarkAsGiven={vi.fn()}
        doseAmount={1}
      />
    )
    
    const markButton = screen.getByText('Mark as Given')
    expect(markButton).toBeDisabled()
    expect(markButton).toHaveClass('cursor-not-allowed')
  })

  it('shows warning message for critical stock', () => {
    const criticalStockMedication = {
      ...mockMedication,
      total_tablets: 1,
    }
    
    render(<MedicationCard medication={criticalStockMedication} />)
    
    expect(screen.getByText(/This medication is running low/)).toBeInTheDocument()
  })

  it('shows warning message for empty stock', () => {
    const emptyStockMedication = {
      ...mockMedication,
      total_tablets: 0,
    }
    
    render(<MedicationCard medication={emptyStockMedication} />)
    
    expect(screen.getByText(/This medication is out of stock/)).toBeInTheDocument()
  })

  it('does not show mark as given button when onMarkAsGiven is not provided', () => {
    render(<MedicationCard medication={mockMedication} />)
    
    expect(screen.queryByText('Mark as Given')).not.toBeInTheDocument()
  })

  it('does not show edit button when onEdit is not provided', () => {
    render(<MedicationCard medication={mockMedication} />)
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('handles medication without sheet_size', () => {
    const medicationWithoutSheets = {
      ...mockMedication,
      sheet_size: null,
    }
    
    render(<MedicationCard medication={medicationWithoutSheets} />)
    
    expect(screen.getByText('50')).toBeInTheDocument() // tablets remaining
    expect(screen.queryByText('Sheets remaining:')).not.toBeInTheDocument()
  })

  it('handles medication without notes', () => {
    const medicationWithoutNotes = {
      ...mockMedication,
      notes: null,
    }
    
    render(<MedicationCard medication={medicationWithoutNotes} />)
    
    expect(screen.queryByText('Take with food')).not.toBeInTheDocument()
  })
})