import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import type { TicketStatus } from './ticket.types'

const allowed: Record<TicketStatus, TicketStatus[]> = {
  Open: ['In Progress'],
  'In Progress': ['Waiting for Customer', 'Resolved', 'Open'], // Open via cancel_take
  'Waiting for Customer': ['In Progress'],
  Resolved: ['Closed', 'In Progress'],
  Closed: [],
}

export function validateTransition(params: {
  from: TicketStatus
  to: TicketStatus
}) {
  const { from, to } = params

  if (from === 'Closed') {
    throw new DomainError({
      code: ERROR_CODES.CLOSED_FINAL,
      message: 'Ticket is closed',
      status: 400,
    })
  }

  const allowedTo = allowed[from] ?? []
  if (!allowedTo.includes(to)) {
    throw new DomainError({
      code: ERROR_CODES.INVALID_TRANSITION,
      message: `Invalid transition: ${from} -> ${to}`,
      status: 400,
    })
  }
}
