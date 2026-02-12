import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TicketWriteControls } from '../../src/pages/ticket-detail/TicketDetailPage'

describe('TicketDetail - Closed', () => {
  it('does not render write controls when Closed', () => {
    render(<TicketWriteControls role="Customer" ticketId="t1" status="Closed" />)
    expect(screen.queryByText('回覆客服')).toBeNull()
    expect(screen.queryByText('關閉工單')).toBeNull()
  })
})
