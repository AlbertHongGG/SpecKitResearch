import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import type { TicketVisibilityContext, UserRole } from './ticket.types'

export function isTicketVisible(ctx: TicketVisibilityContext): boolean {
  const { user, ticket } = ctx

  if (user.role === 'Admin') return true

  if (user.role === 'Customer') {
    return ticket.customerId === user.id
  }

  // Agent
  return ticket.assigneeId === null || ticket.assigneeId === user.id
}

export function assertTicketVisibleOrNotFound(ctx: TicketVisibilityContext) {
  if (isTicketVisible(ctx)) return

  // anti-IDOR: not visible => 404
  throw new DomainError({
    code: ERROR_CODES.NOT_VISIBLE,
    message: 'Not Found',
    status: 404,
  })
}

export function assertRoleAllowed(params: {
  role: UserRole
  allowed: UserRole[]
}) {
  if (params.allowed.includes(params.role)) return
  throw new DomainError({
    code: ERROR_CODES.FORBIDDEN,
    message: 'Forbidden',
    status: 403,
  })
}
