import { Injectable } from '@nestjs/common'
import type { AuditAction, AuditEntityType, Prisma, Role, TicketStatus as PrismaTicketStatus } from '@prisma/client'
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

function buildUserSummary(user: { id: string; email: string; role: Role }) {
  return { id: user.id, email: user.email, role: user.role as UserRole }
}

@Injectable()
export class AdminAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async assign(params: {
    ticketId: string
    actor: { id: string; role: UserRole }
    assigneeId: string | null
  }) {
    if (params.actor.role !== 'Admin') {
      throw new DomainError({ code: ERROR_CODES.FORBIDDEN, message: 'Forbidden', status: 403 })
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: params.ticketId },
      select: { id: true, status: true, customerId: true, assigneeId: true, updatedAt: true, assignee: { select: { id: true, email: true, role: true } } },
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

    if (params.assigneeId) {
      const user = await this.prisma.user.findUnique({
        where: { id: params.assigneeId },
        select: { id: true, role: true, isActive: true, email: true },
      })

      if (!user || !user.isActive) {
        throw new DomainError({ code: ERROR_CODES.NOT_FOUND, message: 'Not Found', status: 404 })
      }

      if (user.role !== 'Agent') {
        throw new DomainError({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'assignee_id must be an active Agent',
          status: 400,
        })
      }
    }

    const beforeStatus = toDomainTicketStatus(ticket.status)

    // Preserve invariants around take/cancel-take:
    // - assigning an Open ticket implies In Progress
    // - unassigning an In Progress ticket implies Open
    let nextStatus: PrismaTicketStatus | undefined
    if (params.assigneeId && ticket.status === 'Open') {
      nextStatus = 'InProgress'
    }
    if (!params.assigneeId && ticket.status === 'InProgress') {
      nextStatus = 'Open'
    }

    const result = await transactionWithSqliteRetry(this.prisma, async (tx: Prisma.TransactionClient) => {
      const updated = await tx.ticket.updateMany({
        where: { id: ticket.id, updatedAt: ticket.updatedAt },
        data: {
          assigneeId: params.assigneeId,
          status: nextStatus,
        },
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
          before: { assignee_id: ticket.assigneeId },
          after: { assignee_id: params.assigneeId },
        },
      })

      if (nextStatus) {
        await this.audit.append({
          tx,
          entityType: 'Ticket' as AuditEntityType,
          entityId: ticket.id,
          action: 'STATUS_CHANGED' as AuditAction,
          actorId: params.actor.id,
          metadata: {
            ticket_id: ticket.id,
            before: { status: beforeStatus },
            after: { status: toDomainTicketStatus(nextStatus) },
          },
        })
      }

      return tx.ticket.findUnique({
        where: { id: ticket.id },
        select: {
          id: true,
          assigneeId: true,
          updatedAt: true,
          status: true,
          assignee: { select: { id: true, email: true, role: true } },
        },
      })
    })

    if (!result) {
      throw new DomainError({ code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error', status: 500 })
    }

    return {
      ticket: {
        id: result.id,
        assignee_id: result.assigneeId,
        updated_at: result.updatedAt.toISOString(),
      },
    }
  }
}
