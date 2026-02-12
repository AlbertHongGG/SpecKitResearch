import { Injectable } from '@nestjs/common'
import type {
  AuditAction,
  AuditEntityType,
  Prisma,
  TicketStatus as PrismaTicketStatus,
} from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { transactionWithSqliteRetry } from '../../common/prisma/sqlite-retry'
import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import { AuditService } from '../audit/audit.service'
import { assertTicketVisibleOrNotFound } from './ticket.policy'
import type { TicketStatus, UserRole } from './ticket.types'
import { validateTransition } from './ticket.state-machine'

function toDomainTicketStatus(status: PrismaTicketStatus): TicketStatus {
  switch (status) {
    case 'Open':
      return 'Open'
    case 'InProgress':
      return 'In Progress'
    case 'WaitingForCustomer':
      return 'Waiting for Customer'
    case 'Resolved':
      return 'Resolved'
    case 'Closed':
      return 'Closed'
    default:
      throw new Error(`Unknown ticket status: ${status}`)
  }
}

function toPrismaTicketStatus(status: TicketStatus): PrismaTicketStatus {
  switch (status) {
    case 'Open':
      return 'Open'
    case 'In Progress':
      return 'InProgress'
    case 'Waiting for Customer':
      return 'WaitingForCustomer'
    case 'Resolved':
      return 'Resolved'
    case 'Closed':
      return 'Closed'
  }
}

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async changeStatus(params: {
    ticketId: string
    actor: { id: string; role: UserRole }
    from: TicketStatus
    to: TicketStatus
  }) {
    validateTransition({ from: params.from, to: params.to })

    // These transitions are handled by dedicated endpoints and should not be done via /status.
    if (params.from === 'Open' && params.to === 'In Progress') {
      throw new DomainError({
        code: ERROR_CODES.INVALID_TRANSITION,
        message: 'Use /tickets/:id/take to take a ticket',
        status: 400,
      })
    }

    if (params.from === 'In Progress' && params.to === 'Open') {
      throw new DomainError({
        code: ERROR_CODES.INVALID_TRANSITION,
        message: 'Use /tickets/:id/cancel-take to cancel take',
        status: 400,
      })
    }

    if (params.from === 'Waiting for Customer' && params.to === 'In Progress') {
      throw new DomainError({
        code: ERROR_CODES.INVALID_TRANSITION,
        message: 'Customer reply drives this transition',
        status: 400,
      })
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: params.ticketId },
      select: {
        id: true,
        status: true,
        customerId: true,
        assigneeId: true,
        closedAt: true,
      },
    })

    if (!ticket) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Not Found',
        status: 404,
      })
    }

    assertTicketVisibleOrNotFound({
      user: params.actor,
      ticket: { customerId: ticket.customerId, assigneeId: ticket.assigneeId },
    })

    if (ticket.status === 'Closed') {
      throw new DomainError({
        code: ERROR_CODES.CLOSED_FINAL,
        message: 'Ticket is closed',
        status: 400,
      })
    }

    const current = toDomainTicketStatus(ticket.status)

    if (current !== params.from) {
      throw new DomainError({
        code: ERROR_CODES.CONFLICT,
        message: 'Conflict',
        status: 409,
      })
    }

    if (params.actor.role === 'Customer') {
      if (!(params.from === 'Resolved' && params.to === 'Closed')) {
        throw new DomainError({
          code: ERROR_CODES.INVALID_TRANSITION,
          message: `Invalid transition: ${params.from} -> ${params.to}`,
          status: 400,
        })
      }
    }

    if (params.actor.role === 'Agent') {
      if (ticket.assigneeId !== params.actor.id) {
        throw new DomainError({
          code: ERROR_CODES.FORBIDDEN,
          message: 'Forbidden',
          status: 403,
        })
      }

      const ok =
        (params.from === 'In Progress' && params.to === 'Waiting for Customer') ||
        (params.from === 'In Progress' && params.to === 'Resolved') ||
        (params.from === 'Resolved' && params.to === 'In Progress')

      if (!ok) {
        throw new DomainError({
          code: ERROR_CODES.INVALID_TRANSITION,
          message: `Invalid transition: ${params.from} -> ${params.to}`,
          status: 400,
        })
      }
    }

    if (params.actor.role === 'Admin') {
      const ok =
        (params.from === 'Resolved' && params.to === 'Closed') ||
        (params.from === 'Resolved' && params.to === 'In Progress') ||
        (params.from === 'In Progress' && params.to === 'Waiting for Customer') ||
        (params.from === 'In Progress' && params.to === 'Resolved')

      if (!ok) {
        throw new DomainError({
          code: ERROR_CODES.INVALID_TRANSITION,
          message: `Invalid transition: ${params.from} -> ${params.to}`,
          status: 400,
        })
      }
    }

    const prismaFrom = toPrismaTicketStatus(params.from)
    const prismaTo = toPrismaTicketStatus(params.to)

    const result = await transactionWithSqliteRetry(this.prisma, async (tx: Prisma.TransactionClient) => {
      const where: Prisma.TicketWhereInput = { id: ticket.id, status: prismaFrom }
      if (params.actor.role === 'Agent') {
        where.assigneeId = params.actor.id
      }

      const updated = await tx.ticket.updateMany({
        where,
        data: {
          status: prismaTo,
          closedAt: params.to === 'Closed' ? new Date() : ticket.closedAt,
        },
      })

      if (updated.count !== 1) {
        throw new DomainError({
          code: ERROR_CODES.CONFLICT,
          message: 'Conflict',
          status: 409,
        })
      }

      await this.audit.append({
        tx,
        entityType: 'Ticket' as AuditEntityType,
        entityId: ticket.id,
        action: 'STATUS_CHANGED' as AuditAction,
        actorId: params.actor.id,
        metadata: {
          ticket_id: ticket.id,
          before: { status: params.from },
          after: { status: params.to },
        },
      })

      const latest = await tx.ticket.findUnique({
        where: { id: ticket.id },
        select: { id: true, status: true, assigneeId: true, updatedAt: true, closedAt: true },
      })

      if (!latest) {
        throw new DomainError({
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal Server Error',
          status: 500,
        })
      }

      return latest
    })

    return {
      ticket: {
        id: result.id,
        status: toDomainTicketStatus(result.status),
        assignee_id: result.assigneeId,
        updated_at: result.updatedAt.toISOString(),
        closed_at: result.closedAt ? result.closedAt.toISOString() : null,
      },
    }
  }
}
