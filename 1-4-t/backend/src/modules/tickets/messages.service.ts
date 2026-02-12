import { Injectable } from '@nestjs/common'
import type {
  AuditAction,
  AuditEntityType,
  Prisma,
  Role,
  TicketStatus as PrismaTicketStatus,
} from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import { AuditService } from '../audit/audit.service'
import { assertTicketVisibleOrNotFound } from './ticket.policy'
import type { TicketStatus, UserRole } from './ticket.types'
import { transactionWithSqliteRetry } from '../../common/prisma/sqlite-retry'

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

function buildUserSummary(user: { id: string; email: string; role: Role }) {
  return { id: user.id, email: user.email, role: user.role as UserRole }
}

function buildMessage(msg: {
  id: string
  ticketId: string
  author: { id: string; email: string; role: Role }
  role: Role
  content: string
  isInternal: boolean
  createdAt: Date
}) {
  return {
    id: msg.id,
    ticket_id: msg.ticketId,
    author: buildUserSummary(msg.author),
    role: msg.role as UserRole,
    content: msg.content,
    is_internal: msg.isInternal,
    created_at: msg.createdAt.toISOString(),
  }
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async postPublicMessage(params: {
    ticketId: string
    actor: { id: string; role: UserRole }
    content: string
  }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: params.ticketId },
      select: {
        id: true,
        status: true,
        customerId: true,
        assigneeId: true,
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

    const isCustomer = params.actor.role === 'Customer'

    const result = await transactionWithSqliteRetry(this.prisma, async (tx: Prisma.TransactionClient) => {
      if (isCustomer) {
        if (ticket.status !== 'WaitingForCustomer') {
          throw new DomainError({
            code: ERROR_CODES.INVALID_TRANSITION,
            message: 'Customer can only reply when ticket is Waiting for Customer',
            status: 400,
          })
        }

        const updated = await tx.ticket.updateMany({
          where: { id: ticket.id, status: 'WaitingForCustomer' },
          data: { status: 'InProgress' },
        })

        if (updated.count !== 1) {
          throw new DomainError({
            code: ERROR_CODES.CONFLICT,
            message: 'Conflict',
            status: 409,
          })
        }

        const message = await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            authorId: params.actor.id,
            role: 'Customer',
            content: params.content,
            isInternal: false,
          },
          include: { author: { select: { id: true, email: true, role: true } } },
        })

        await this.audit.append({
          tx,
          entityType: 'TicketMessage' as AuditEntityType,
          entityId: message.id,
          action: 'MESSAGE_CREATED' as AuditAction,
          actorId: params.actor.id,
          metadata: {
            ticket_id: ticket.id,
            message: { id: message.id, is_internal: false },
          },
        })

        await this.audit.append({
          tx,
          entityType: 'Ticket' as AuditEntityType,
          entityId: ticket.id,
          action: 'STATUS_CHANGED' as AuditAction,
          actorId: params.actor.id,
          metadata: {
            ticket_id: ticket.id,
            before: { status: toDomainTicketStatus(ticket.status) },
            after: { status: 'In Progress' },
          },
        })

        const latest = await tx.ticket.findUnique({
          where: { id: ticket.id },
          select: { id: true, status: true, updatedAt: true },
        })

        if (!latest) {
          throw new DomainError({
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Internal Server Error',
            status: 500,
          })
        }

        return {
          message,
          ticket: latest,
        }
      }

      const message = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: params.actor.id,
          role: params.actor.role,
          content: params.content,
          isInternal: false,
        },
        include: { author: { select: { id: true, email: true, role: true } } },
      })

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
        select: { id: true },
      })

      await this.audit.append({
        tx,
        entityType: 'TicketMessage' as AuditEntityType,
        entityId: message.id,
        action: 'MESSAGE_CREATED' as AuditAction,
        actorId: params.actor.id,
        metadata: {
          ticket_id: ticket.id,
          message: { id: message.id, is_internal: false },
        },
      })

      const latest = await tx.ticket.findUnique({
        where: { id: ticket.id },
        select: { id: true, status: true, updatedAt: true },
      })

      if (!latest) {
        throw new DomainError({
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal Server Error',
          status: 500,
        })
      }

      return {
        message,
        ticket: latest,
      }
    })

    return {
      message: buildMessage({
        id: result.message.id,
        ticketId: result.message.ticketId,
        author: result.message.author,
        role: result.message.role,
        content: result.message.content,
        isInternal: result.message.isInternal,
        createdAt: result.message.createdAt,
      }),
      ticket: {
        id: result.ticket.id,
        status: toDomainTicketStatus(result.ticket.status),
        updated_at: result.ticket.updatedAt.toISOString(),
      },
    }
  }

  async postInternalNote(params: {
    ticketId: string
    actor: { id: string; role: UserRole }
    content: string
  }) {
    if (params.actor.role !== 'Agent' && params.actor.role !== 'Admin') {
      throw new DomainError({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Forbidden',
        status: 403,
      })
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: params.ticketId },
      select: { id: true, status: true, customerId: true, assigneeId: true },
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

    if (params.actor.role === 'Agent' && ticket.assigneeId !== params.actor.id) {
      throw new DomainError({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Forbidden',
        status: 403,
      })
    }

    const result = await transactionWithSqliteRetry(this.prisma, async (tx: Prisma.TransactionClient) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: params.actor.id,
          role: params.actor.role,
          content: params.content,
          isInternal: true,
        },
        include: { author: { select: { id: true, email: true, role: true } } },
      })

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
        select: { id: true },
      })

      await this.audit.append({
        tx,
        entityType: 'TicketMessage' as AuditEntityType,
        entityId: message.id,
        action: 'MESSAGE_CREATED' as AuditAction,
        actorId: params.actor.id,
        metadata: {
          ticket_id: ticket.id,
          message: { id: message.id, is_internal: true },
        },
      })

      const latest = await tx.ticket.findUnique({
        where: { id: ticket.id },
        select: { id: true, status: true, updatedAt: true },
      })

      if (!latest) {
        throw new DomainError({
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal Server Error',
          status: 500,
        })
      }

      return { message, ticket: latest }
    })

    return {
      message: buildMessage({
        id: result.message.id,
        ticketId: result.message.ticketId,
        author: result.message.author,
        role: result.message.role,
        content: result.message.content,
        isInternal: result.message.isInternal,
        createdAt: result.message.createdAt,
      }),
      ticket: {
        id: result.ticket.id,
        status: toDomainTicketStatus(result.ticket.status),
        updated_at: result.ticket.updatedAt.toISOString(),
      },
    }
  }
}
