import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders basic spinner', () => {
    const { container } = render(<LoadingSpinner />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  it('renders with text when provided', () => {
    render(<LoadingSpinner text="Loading..." />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('applies correct size classes', () => {
    const { rerender, container } = render(<LoadingSpinner size="sm" />)
    
    let spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('h-4', 'w-4')
    
    rerender(<LoadingSpinner size="lg" />)
    spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('h-12', 'w-12')
  })

  it('applies correct color classes', () => {
    const { rerender, container } = render(<LoadingSpinner color="red" />)
    
    let spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('text-red-600')
    
    rerender(<LoadingSpinner color="green" />)
    spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('text-green-600')
  })

  it('renders as full screen when fullScreen is true', () => {
    const { container } = render(<LoadingSpinner fullScreen />)
    
    const outerContainer = container.firstChild
    expect(outerContainer).toHaveClass('fixed', 'inset-0', 'z-50')
  })

  it('renders as overlay when overlay is true', () => {
    const { container } = render(<LoadingSpinner overlay />)
    
    const outerContainer = container.firstChild
    expect(outerContainer).toHaveClass('absolute', 'inset-0', 'z-10')
  })

  it('applies text color to loading text', () => {
    render(<LoadingSpinner text="Loading..." color="purple" />)
    
    const text = screen.getByText('Loading...')
    expect(text).toHaveClass('text-purple-600')
  })

  it('renders inline by default', () => {
    const { container } = render(<LoadingSpinner />)
    
    const outerContainer = container.firstChild
    expect(outerContainer).not.toHaveClass('fixed')
    expect(outerContainer).not.toHaveClass('absolute')
  })

  it('renders with default medium size and blue color', () => {
    const { container } = render(<LoadingSpinner />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('h-8', 'w-8', 'text-blue-600')
  })
})