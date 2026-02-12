import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../src/api/agent', async () => {
  const actual = await vi.importActual<any>('../../src/api/agent')
  return {
    ...actual,
    useAgentTickets: vi.fn(() => ({
      isLoading: false,
      isError: false,
      data: { items: [], total: 0 },
    })),
  }
})

import { useAgentTickets } from '../../src/api/agent'
import { AgentTicketsPage } from '../../src/pages/agent-tickets/AgentTicketsPage'

describe('AgentTicketsPage tabs', () => {
  it('switching tabs changes view parameter (drives query key)', async () => {
    const user = userEvent.setup()
    render(<AgentTicketsPage />)

    // initial render
    expect(useAgentTickets).toHaveBeenCalledWith({ view: 'unassigned', status: undefined, limit: 20, offset: 0 })

    await user.click(screen.getByRole('button', { name: '我的工單' }))
    expect(useAgentTickets).toHaveBeenLastCalledWith({ view: 'mine', status: undefined, limit: 20, offset: 0 })
  })
})
