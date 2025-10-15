import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorMessage from '../ErrorMessage'

describe('ErrorMessage', () => {
  it('renders with default title and message', () => {
    render(<ErrorMessage />)
    
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
  })

  it('renders with custom title and message', () => {
    render(
      <ErrorMessage 
        title="Custom Error" 
        message="This is a custom error message" 
      />
    )
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument()
    expect(screen.getByText('This is a custom error message')).toBeInTheDocument()
  })

  it('renders with different types and applies correct styling', () => {
    const { rerender, container } = render(<ErrorMessage type="error" />)
    
    let errorContainer = container.firstChild
    expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800')
    
    rerender(<ErrorMessage type="warning" />)
    errorContainer = container.firstChild
    expect(errorContainer).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800')
    
    rerender(<ErrorMessage type="success" />)
    errorContainer = container.firstChild
    expect(errorContainer).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800')
  })

  it('shows retry button when onRetry is provided', () => {
    const mockOnRetry = vi.fn()
    render(<ErrorMessage onRetry={mockOnRetry} />)
    
    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(mockOnRetry).toHaveBeenCalled()
  })

  it('shows dismiss button when onDismiss is provided', () => {
    const mockOnDismiss = vi.fn()
    render(<ErrorMessage onDismiss={mockOnDismiss} />)
    
    const dismissButtons = screen.getAllByText('Dismiss')
    expect(dismissButtons[0]).toBeInTheDocument()
    
    fireEvent.click(dismissButtons[0])
    expect(mockOnDismiss).toHaveBeenCalled()
  })

  it('shows close button when onDismiss is provided', () => {
    const mockOnDismiss = vi.fn()
    render(<ErrorMessage onDismiss={mockOnDismiss} />)
    
    const closeButtons = screen.getAllByRole('button', { name: /dismiss/i })
    expect(closeButtons[1]).toBeInTheDocument() // The X button
    
    fireEvent.click(closeButtons[1])
    expect(mockOnDismiss).toHaveBeenCalled()
  })

  it('shows both retry and dismiss buttons when both callbacks are provided', () => {
    render(<ErrorMessage onRetry={vi.fn()} onDismiss={vi.fn()} />)
    
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getAllByText('Dismiss')).toHaveLength(2) // Button text and sr-only text
  })

  it('hides icon when showIcon is false', () => {
    const { container } = render(<ErrorMessage showIcon={false} />)
    
    // Check that no SVG icon is present
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('shows appropriate icon for each type', () => {
    const { rerender, container } = render(<ErrorMessage type="error" />)
    
    // Error icon should be present
    expect(container.querySelector('svg')).toBeInTheDocument()
    
    rerender(<ErrorMessage type="warning" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    
    rerender(<ErrorMessage type="success" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    
    rerender(<ErrorMessage type="info" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts JSX as message', () => {
    const jsxMessage = (
      <div>
        <p>First paragraph</p>
        <p>Second paragraph</p>
      </div>
    )
    
    render(<ErrorMessage message={jsxMessage} />)
    
    expect(screen.getByText('First paragraph')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<ErrorMessage className="custom-class" />)
    
    const errorContainer = container.firstChild
    expect(errorContainer).toHaveClass('custom-class')
  })

  it('does not show action buttons when no callbacks are provided', () => {
    render(<ErrorMessage />)
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument()
  })

  it('applies correct button styling for different types', () => {
    const { rerender } = render(<ErrorMessage type="error" onRetry={vi.fn()} />)
    
    let retryButton = screen.getByText('Try Again')
    expect(retryButton).toHaveClass('bg-red-600', 'hover:bg-red-700')
    
    rerender(<ErrorMessage type="success" onRetry={vi.fn()} />)
    retryButton = screen.getByText('Try Again')
    expect(retryButton).toHaveClass('bg-green-600', 'hover:bg-green-700')
  })
})