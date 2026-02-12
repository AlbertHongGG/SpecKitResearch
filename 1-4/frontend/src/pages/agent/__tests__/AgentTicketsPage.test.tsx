import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AgentTicketsPage } from '../AgentTicketsPage'
import { useAgentTicketsQuery } from '../../../features/agent/api/agent.queries'

vi.mock('../../../features/agent/api/agent.queries', () => {
  return {
    useAgentTicketsQuery: vi.fn(),
  }
})

const useAgentTicketsQueryMock = vi.mocked(useAgentTicketsQuery)

describe('AgentTicketsPage', () => {
  it('shows loading state', () => {
    useAgentTicketsQueryMock.mockReturnValue({
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useAgentTicketsQuery>)

    render(
      <MemoryRouter>
        <AgentTicketsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/載入中/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    useAgentTicketsQueryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as unknown as ReturnType<typeof useAgentTicketsQuery>)

    render(
      <MemoryRouter>
        <AgentTicketsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/boom/i)).toBeInTheDocument()
  })

  it('shows empty state and switches tabs', () => {
    useAgentTicketsQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { tickets: [], total: 0 },
    } as unknown as ReturnType<typeof useAgentTicketsQuery>)

    render(
      <MemoryRouter>
        <AgentTicketsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/尚無工單/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /我的/i }))

    expect(useAgentTicketsQueryMock).toHaveBeenCalled()
  })
})
