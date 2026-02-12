import { Injectable } from '@nestjs/common'
import type { Prisma, Role } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import type { TicketStatus, UserRole } from './ticket.types'

function toPrismaTicketStatus(status: TicketStatus) {
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

function toDomainTicketStatus(status: any): TicketStatus {
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

@Injectable()
export class AgentWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    actor: { id: string; role: UserRole }
    view: 'unassigned' | 'mine'
    status?: TicketStatus
    limit: number
    offset: number
  }) {
    if (params.actor.role !== 'Agent' && params.actor.role !== 'Admin') {
      throw new DomainError({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Forbidden',
        status: 403,
      })
    }

    const where: Prisma.TicketWhereInput = {}

    if (params.view === 'unassigned') {
      where.assigneeId = null
    } else {
      where.assigneeId = params.actor.id
    }

    if (params.status) {
      where.status = toPrismaTicketStatus(params.status)
    }

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: params.offset,
        take: params.limit,
        include: {
          assignee: { select: { id: true, email: true, role: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ])

    return {
      items: items.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        status: toDomainTicketStatus(t.status),
        updated_at: t.updatedAt.toISOString(),
        assignee: t.assignee ? buildUserSummary(t.assignee) : null,
      })),
      total,
      limit: params.limit,
      offset: params.offset,
    }
  }
}
