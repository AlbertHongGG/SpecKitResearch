import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageTimeline } from '../../src/pages/ticket-detail/MessageTimeline'

describe('MessageTimeline internal visibility', () => {
  it('Customer view does not render internal messages', () => {
    render(
      <MessageTimeline
        showInternal={false}
        messages={[
          {
            id: 'm1',
            ticket_id: 't1',
            author: { id: 'u1', email: 'a@a.com', role: 'Customer' },
            role: 'Customer',
            content: 'public',
            is_internal: false,
            created_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'm2',
            ticket_id: 't1',
            author: { id: 'u2', email: 'agent@a.com', role: 'Agent' },
            role: 'Agent',
            content: 'internal',
            is_internal: true,
            created_at: '2026-01-01T00:00:01.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('public')).toBeInTheDocument()
    expect(screen.queryByText('internal')).toBeNull()
  })
})
