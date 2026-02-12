import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CustomerTicketsPage } from '../CustomerTicketsPage'
import { useCustomerTicketsQuery } from '../../../features/tickets/api/tickets.queries'

vi.mock('../../../features/tickets/api/tickets.queries', () => {
  return {
    useCustomerTicketsQuery: vi.fn(),
  }
})

const useCustomerTicketsQueryMock = vi.mocked(useCustomerTicketsQuery)

describe('CustomerTicketsPage', () => {
  it('shows loading state', () => {
    useCustomerTicketsQueryMock.mockReturnValue({
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useCustomerTicketsQuery>)

    render(
      <MemoryRouter>
        <CustomerTicketsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/載入中/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    useCustomerTicketsQueryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as unknown as ReturnType<typeof useCustomerTicketsQuery>)

    render(
      <MemoryRouter>
        <CustomerTicketsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/boom/i)).toBeInTheDocument()
  })

  it('shows empty state', () => {
    useCustomerTicketsQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { tickets: [], total: 0 },
    } as unknown as ReturnType<typeof useCustomerTicketsQuery>)

    render(
      <MemoryRouter>
        <CustomerTicketsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/尚無工單/i)).toBeInTheDocument()
  })
})
