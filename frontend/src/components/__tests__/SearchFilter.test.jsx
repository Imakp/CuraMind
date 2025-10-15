import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SearchFilter from '../SearchFilter'

const mockFilters = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  },
  {
    key: 'category',
    label: 'Category',
    type: 'checkbox',
    options: [
      { value: 'medication', label: 'Medication' },
      { value: 'supplement', label: 'Supplement' }
    ]
  }
]

const mockSortOptions = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'date_desc', label: 'Newest First' }
]

describe('SearchFilter', () => {
  it('renders search input with placeholder', () => {
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
        placeholder="Search medications..."
      />
    )
    
    expect(screen.getByPlaceholderText('Search medications...')).toBeInTheDocument()
  })

  it('calls onSearch when typing in search input', async () => {
    const mockOnSearch = vi.fn()
    render(
      <SearchFilter 
        onSearch={mockOnSearch} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
      />
    )
    
    const searchInput = screen.getByRole('textbox')
    fireEvent.change(searchInput, { target: { value: 'test search' } })
    
    // Wait for debounced search
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test search')
    }, { timeout: 500 })
  })

  it('shows filters button when filters are provided', () => {
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
        filters={mockFilters}
      />
    )
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('opens filter panel when filters button is clicked', () => {
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
        filters={mockFilters}
        sortOptions={mockSortOptions}
      />
    )
    
    const filtersButton = screen.getByText('Filters')
    fireEvent.click(filtersButton)
    
    expect(screen.getByText('Filters & Sorting')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Sort By')).toBeInTheDocument()
  })

  it('calls onFilter when filter value changes', () => {
    const mockOnFilter = vi.fn()
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={mockOnFilter} 
        onSort={vi.fn()}
        filters={mockFilters}
      />
    )
    
    // Open filters
    fireEvent.click(screen.getByText('Filters'))
    
    // Change status filter
    const statusSelect = screen.getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'active' } })
    
    expect(mockOnFilter).toHaveBeenCalledWith({ status: 'active' })
  })

  it('calls onSort when sort option changes', () => {
    const mockOnSort = vi.fn()
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={vi.fn()} 
        onSort={mockOnSort}
        sortOptions={mockSortOptions}
      />
    )
    
    // Open filters
    fireEvent.click(screen.getByText('Filters'))
    
    // Change sort option
    const sortSelect = screen.getByLabelText('Sort By')
    fireEvent.change(sortSelect, { target: { value: 'name_asc' } })
    
    expect(mockOnSort).toHaveBeenCalledWith('name_asc')
  })

  it('handles checkbox filters correctly', () => {
    const mockOnFilter = vi.fn()
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={mockOnFilter} 
        onSort={vi.fn()}
        filters={mockFilters}
      />
    )
    
    // Open filters
    fireEvent.click(screen.getByText('Filters'))
    
    // Check a checkbox
    const medicationCheckbox = screen.getByLabelText('Medication')
    fireEvent.click(medicationCheckbox)
    
    expect(mockOnFilter).toHaveBeenCalledWith({ category: ['medication'] })
  })

  it('displays active filters as tags', () => {
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
        filters={mockFilters}
        selectedFilters={{ status: 'active' }}
        selectedSort="name_asc"
        sortOptions={mockSortOptions}
      />
    )
    
    expect(screen.getByText('Status: Active')).toBeInTheDocument()
    expect(screen.getByText('Sort: Name (A-Z)')).toBeInTheDocument()
  })

  it('shows filter count badge when filters are active', () => {
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
        filters={mockFilters}
        selectedFilters={{ status: 'active' }}
        selectedSort="name_asc"
      />
    )
    
    expect(screen.getByText('2')).toBeInTheDocument() // 1 filter + 1 sort
  })

  it('clears all filters when Clear All is clicked', () => {
    const mockOnFilter = vi.fn()
    const mockOnSort = vi.fn()
    const mockOnSearch = vi.fn()
    
    render(
      <SearchFilter 
        onSearch={mockOnSearch} 
        onFilter={mockOnFilter} 
        onSort={mockOnSort}
        filters={mockFilters}
        selectedFilters={{ status: 'active' }}
        selectedSort="name_asc"
        searchValue="test"
      />
    )
    
    // Open filters
    fireEvent.click(screen.getByText('Filters'))
    
    // Click Clear All
    fireEvent.click(screen.getByText('Clear All'))
    
    expect(mockOnFilter).toHaveBeenCalledWith({})
    expect(mockOnSort).toHaveBeenCalledWith('')
    expect(mockOnSearch).toHaveBeenCalledWith('')
  })

  it('removes individual filter when tag close button is clicked', () => {
    const mockOnFilter = vi.fn()
    
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={mockOnFilter} 
        onSort={vi.fn()}
        filters={mockFilters}
        selectedFilters={{ status: 'active' }}
      />
    )
    
    // Find and click the close button on the filter tag
    const filterTag = screen.getByText('Status: Active').closest('span')
    const closeButton = filterTag.querySelector('button')
    fireEvent.click(closeButton)
    
    expect(mockOnFilter).toHaveBeenCalledWith({})
  })

  it('clears search when clear search button is clicked', () => {
    const mockOnSearch = vi.fn()
    
    render(
      <SearchFilter 
        onSearch={mockOnSearch} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
        searchValue="test search"
      />
    )
    
    // Find the clear search button (X icon)
    const searchInput = screen.getByDisplayValue('test search')
    const clearButton = searchInput.parentElement.querySelector('button')
    fireEvent.click(clearButton)
    
    expect(mockOnSearch).toHaveBeenCalledWith('')
  })

  it('respects disabled state', () => {
    render(
      <SearchFilter 
        onSearch={vi.fn()} 
        onFilter={vi.fn()} 
        onSort={vi.fn()}
        filters={mockFilters}
        disabled={true}
      />
    )
    
    const searchInput = screen.getByRole('textbox')
    const filtersButton = screen.getByRole('button', { name: /filters/i })
    
    expect(searchInput).toBeDisabled()
    expect(filtersButton).toBeDisabled()
  })
})