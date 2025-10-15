import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import InventoryTracker from '../InventoryTracker'

describe('InventoryTracker', () => {
  it('renders with initial values', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('Inventory Tracker')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument() // Current inventory display
  })

  it('switches between tablets and sheets input modes', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    // Should start in tablets mode
    expect(screen.getByLabelText(/total tablets/i)).toBeInTheDocument()
    
    // Switch to sheets mode
    const sheetsButton = screen.getByText('Sheets')
    fireEvent.click(sheetsButton)
    
    expect(screen.getByLabelText(/number of sheets/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tablets per sheet/i)).toBeInTheDocument()
  })

  it('calculates sheet equivalent in tablets mode', () => {
    render(
      <InventoryTracker 
        totalTablets={55}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    expect(screen.getByText(/Equivalent: 5 sheet\(s\) \+ 5 tablet\(s\)/)).toBeInTheDocument()
  })

  it('auto-calculates tablets when in sheets mode', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    // Switch to sheets mode
    const sheetsButton = screen.getByText('Sheets')
    fireEvent.click(sheetsButton)
    
    // Change sheet count
    const sheetCountInput = screen.getByLabelText(/number of sheets/i)
    fireEvent.change(sheetCountInput, { target: { value: '3' } })
    
    // Should show calculated total - look for the specific value in the calculation area
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('validates input values', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    // Enter negative value
    const tabletsInput = screen.getByLabelText(/total tablets/i)
    fireEvent.change(tabletsInput, { target: { value: '-5' } })
    
    const updateButton = screen.getByText('Update Inventory')
    fireEvent.click(updateButton)
    
    expect(screen.getByText('Total tablets must be 0 or greater')).toBeInTheDocument()
  })

  it('calls onInventoryChange when update button is clicked', () => {
    const mockOnInventoryChange = vi.fn()
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={mockOnInventoryChange}
      />
    )
    
    // Change value
    const tabletsInput = screen.getByLabelText(/total tablets/i)
    fireEvent.change(tabletsInput, { target: { value: '60' } })
    
    // Click update
    const updateButton = screen.getByText('Update Inventory')
    fireEvent.click(updateButton)
    
    expect(mockOnInventoryChange).toHaveBeenCalledWith({
      totalTablets: 60,
      sheetSize: 10
    })
  })

  it('shows update button only when changes are made', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    // No update button initially
    expect(screen.queryByText('Update Inventory')).not.toBeInTheDocument()
    
    // Make a change
    const tabletsInput = screen.getByLabelText(/total tablets/i)
    fireEvent.change(tabletsInput, { target: { value: '60' } })
    
    // Update button should appear
    expect(screen.getByText('Update Inventory')).toBeInTheDocument()
  })

  it('handles quick action buttons', () => {
    render(
      <InventoryTracker 
        totalTablets={40}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    const tabletsInput = screen.getByLabelText(/total tablets/i)
    
    // Initial value should be 40
    expect(tabletsInput.value).toBe('40')
    
    // Click +1 Sheet button
    const addSheetButton = screen.getByText('+1 Sheet')
    fireEvent.click(addSheetButton)
    
    // Should increase tablets by sheet size
    expect(tabletsInput.value).toBe('50')
    
    // Click -1 Sheet button
    const removeSheetButton = screen.getByText('-1 Sheet')
    fireEvent.click(removeSheetButton)
    
    // Should decrease tablets by sheet size
    expect(tabletsInput.value).toBe('40')
  })

  it('prevents negative values with quick actions', () => {
    render(
      <InventoryTracker 
        totalTablets={5}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    // Click -1 Sheet button (should not go below 0)
    const removeSheetButton = screen.getByText('-1 Sheet')
    fireEvent.click(removeSheetButton)
    
    expect(screen.getByDisplayValue('0')).toBeInTheDocument()
  })

  it('disables remove sheet button when tablets is 0', () => {
    render(
      <InventoryTracker 
        totalTablets={0}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    const removeSheetButton = screen.getByText('-1 Sheet')
    expect(removeSheetButton).toBeDisabled()
  })

  it('respects disabled prop', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
        disabled={true}
      />
    )
    
    const tabletsInput = screen.getByLabelText(/total tablets/i)
    expect(tabletsInput).toBeDisabled()
    
    const addSheetButton = screen.getByText('+1 Sheet')
    expect(addSheetButton).toBeDisabled()
  })

  it('shows current inventory display', () => {
    render(
      <InventoryTracker 
        totalTablets={55}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('Current Inventory')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument() // Total tablets
    expect(screen.getByText('5 sheets + 5 tablets')).toBeInTheDocument() // Sheet equivalent
  })

  it('handles sheet size changes in sheets mode', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    // Switch to sheets mode
    const sheetsButton = screen.getByText('Sheets')
    fireEvent.click(sheetsButton)
    
    // Change sheet size
    const sheetSizeInput = screen.getByLabelText(/tablets per sheet/i)
    fireEvent.change(sheetSizeInput, { target: { value: '20' } })
    
    // Should recalculate total tablets (5 sheets * 20 tablets = 100)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('validates sheet size is positive in sheets mode', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
      />
    )
    
    // Switch to sheets mode
    const sheetsButton = screen.getByText('Sheets')
    fireEvent.click(sheetsButton)
    
    // Enter invalid sheet size
    const sheetSizeInput = screen.getByLabelText(/tablets per sheet/i)
    fireEvent.change(sheetSizeInput, { target: { value: '0' } })
    
    // The update button should be disabled due to validation error
    expect(screen.getByText('Sheet size must be greater than 0')).toBeInTheDocument()
  })

  it('hides conversion controls when showConversion is false', () => {
    render(
      <InventoryTracker 
        totalTablets={50}
        sheetSize={10}
        onInventoryChange={vi.fn()}
        showConversion={false}
      />
    )
    
    expect(screen.queryByText('Sheets')).not.toBeInTheDocument()
    expect(screen.queryByText('Tablets')).not.toBeInTheDocument()
  })
})