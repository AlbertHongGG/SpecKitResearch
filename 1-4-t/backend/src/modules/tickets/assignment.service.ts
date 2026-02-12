import { Injectable } from '@nestjs/common'
import type { AuditAction, AuditEntityType, Prisma, TicketStatus as PrismaTicketStatus } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { transactionWithSqliteRetry } from '../../common/prisma/sqlite-retry'
import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import { AuditService } from '../audit/audit.service'
import { assertTicketVisibleOrNotFound } from './ticket.policy'
import type { TicketStatus, UserRole } from './ticket.types'

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
  }
}

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async takeTicket(params: { ticketId: string; actor: { id: string; role: UserRole } }) {
    if (params.actor.role !== 'Agent') {
      throw new DomainError({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Forbidden',
        status: 403,
      })
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: params.ticketId },
      select: { id: true, status: true, customerId: true, assigneeId: true, updatedAt: true },
    })

    if (!ticket) {
      throw new DomainError({ code: ERROR_CODES.NOT_FOUND, message: 'Not Found', status: 404 })
    }

    assertTicketVisibleOrNotFound({
      user: params.actor,
      ticket: { customerId: ticket.customerId, assigneeId: ticket.assigneeId },
    })

    if (ticket.status === 'Closed') {
      throw new DomainError({ code: ERROR_CODES.CLOSED_FINAL, message: 'Ticket is closed', status: 400 })
    }

    const result = await transactionWithSqliteRetry(this.prisma, async (tx: Prisma.TransactionClient) => {
      const updated = await tx.ticket.updateMany({
        where: { id: ticket.id, status: 'Open', assigneeId: null },
        data: { status: 'InProgress', assigneeId: params.actor.id },
      })

      if (updated.count !== 1) {
        throw new DomainError({ code: ERROR_CODES.CONFLICT, message: 'Conflict', status: 409 })
      }

      await this.audit.append({
        tx,
        entityType: 'Ticket' as AuditEntityType,
        entityId: ticket.id,
        action: 'ASSIGNEE_CHANGED' as AuditAction,
        actorId: params.actor.id,
        metadata: {
          ticket_id: ticket.id,
          before: { assignee_id: null },
          after: { assignee_id: params.actor.id },
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
        select: { id: true, status: true, assigneeId: true, updatedAt: true, closedAt: true },
      })

      if (!latest) {
        throw new DomainError({ code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error', status: 500 })
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

  async cancelTake(params: { ticketId: string; actor: { id: string; role: UserRole } }) {
    if (params.actor.role !== 'Agent') {
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
      throw new DomainError({ code: ERROR_CODES.NOT_FOUND, message: 'Not Found', status: 404 })
    }

    assertTicketVisibleOrNotFound({
      user: params.actor,
      ticket: { customerId: ticket.customerId, assigneeId: ticket.assigneeId },
    })

    if (ticket.status === 'Closed') {
      throw new DomainError({ code: ERROR_CODES.CLOSED_FINAL, message: 'Ticket is closed', status: 400 })
    }

    if (ticket.status !== 'InProgress' || ticket.assigneeId !== params.actor.id) {
      throw new DomainError({
        code: ERROR_CODES.INVALID_TRANSITION,
        message: 'Cancel take only allowed for current assignee in In Progress',
        status: 400,
      })
    }

    const result = await transactionWithSqliteRetry(this.prisma, async (tx: Prisma.TransactionClient) => {
      const updated = await tx.ticket.updateMany({
        where: { id: ticket.id, status: 'InProgress', assigneeId: params.actor.id },
        data: { status: 'Open', assigneeId: null },
      })

      if (updated.count !== 1) {
        throw new DomainError({ code: ERROR_CODES.CONFLICT, message: 'Conflict', status: 409 })
      }

      await this.audit.append({
        tx,
        entityType: 'Ticket' as AuditEntityType,
        entityId: ticket.id,
        action: 'ASSIGNEE_CHANGED' as AuditAction,
        actorId: params.actor.id,
        metadata: {
          ticket_id: ticket.id,
          before: { assignee_id: params.actor.id },
          after: { assignee_id: null },
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
          before: { status: 'In Progress' },
          after: { status: 'Open' },
        },
      })

      const latest = await tx.ticket.findUnique({
        where: { id: ticket.id },
        select: { id: true, status: true, assigneeId: true, updatedAt: true, closedAt: true },
      })

      if (!latest) {
        throw new DomainError({ code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error', status: 500 })
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
