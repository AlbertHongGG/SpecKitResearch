import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
  TicketCategory,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';
import {
  ApiTicketCategory,
  ApiTicketStatus,
  ApiUserRole,
  toApiMessage,
  toApiTicket,
  toDbTicketCategory,
  toDbTicketStatus,
} from './api-mappers';
import { canSeeTicket } from './ticket-visibility';
import {
  assertNotClosed,
  assertStatusTransitionAllowed,
} from './ticket-state-machine';
import { MessagesService } from '../messages/messages.service';

function parseMetadataJson(metadataJson: string) {
  try {
    return JSON.parse(metadataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
  ) {}

  async closeTicketAsCustomer(params: {
    ticketId: string;
    customerId: string;
    expectedAssigneeId?: string | null;
  }) {
    return this.changeStatus({
      ticketId: params.ticketId,
      actor: { id: params.customerId, role: 'Customer' },
      fromStatus: 'Resolved',
      toStatus: 'Closed',
      expectedAssigneeId: params.expectedAssigneeId,
    });
  }

  async createTicket(params: {
    customerId: string;
    title: string;
    category: ApiTicketCategory;
    description: string;
  }) {
    if (params.title.length > 100) {
      throw new AppError({
        status: 400,
        code: ErrorCodes.BAD_REQUEST,
        message: 'Title too long',
      });
    }

    const category: TicketCategory = toDbTicketCategory(params.category);

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          title: params.title,
          category,
          status: TicketStatus.OPEN,
          customerId: params.customerId,
          assigneeId: null,
        },
      });

      const initialMessage = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: params.customerId,
          authorRole: UserRole.CUSTOMER,
          content: params.description,
          isInternal: false,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: AuditEntityType.TICKET,
          entityId: ticket.id,
          actorId: params.customerId,
          action: AuditAction.TICKET_CREATED,
          metadataJson: JSON.stringify({ ticket_id: ticket.id }),
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: AuditEntityType.TICKET,
          entityId: ticket.id,
          actorId: params.customerId,
          action: AuditAction.MESSAGE_CREATED,
          metadataJson: JSON.stringify({
            message_id: initialMessage.id,
            is_internal: false,
          }),
        },
      });

      return {
        ticket: toApiTicket(ticket),
        initial_message: {
          id: initialMessage.id,
          created_at: initialMessage.createdAt.toISOString(),
        },
      };
    });
  }

  async listForCustomer(params: {
    customerId: string;
    status?: ApiTicketStatus;
    limit?: number;
  }) {
    const status = params.status ? toDbTicketStatus(params.status) : undefined;
    const limit = params.limit ?? 50;

    const where = {
      customerId: params.customerId,
      ...(status ? { status } : {}),
    };

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { tickets: tickets.map(toApiTicket), total };
  }

  async listForAgent(params: {
    agentId: string;
    view: 'unassigned' | 'mine';
    status?: ApiTicketStatus;
    limit?: number;
  }) {
    const status = params.status ? toDbTicketStatus(params.status) : undefined;
    const limit = params.limit ?? 50;

    const where = {
      ...(params.view === 'unassigned'
        ? { assigneeId: null }
        : { assigneeId: params.agentId }),
      ...(status ? { status } : {}),
    };

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { tickets: tickets.map(toApiTicket), total };
  }

  private async getVisibleTicketOrThrow(params: {
    ticketId: string;
    user: { id: string; role: ApiUserRole };
  }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: params.ticketId },
    });
    if (!ticket) {
      throw new AppError({
        status: 404,
        code: ErrorCodes.NOT_FOUND,
        message: 'Not found',
      });
    }

    if (!canSeeTicket({ user: params.user, ticket })) {
      throw new AppError({
        status: 404,
        code: ErrorCodes.NOT_FOUND,
        message: 'Not found',
      });
    }

    return ticket;
  }

  async getDetail(params: {
    ticketId: string;
    user: { id: string; role: ApiUserRole };
  }) {
    const ticket = await this.getVisibleTicketOrThrow(params);

    const [messages, audits] = await this.prisma.$transaction([
      this.prisma.ticketMessage.findMany({
        where: {
          ticketId: ticket.id,
          ...(params.user.role === 'Customer' ? { isInternal: false } : {}),
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: AuditEntityType.TICKET,
          entityId: ticket.id,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const visibleAudits =
      params.user.role === 'Customer'
        ? audits.filter((a) => {
            if (a.action !== AuditAction.MESSAGE_CREATED) return true;
            const metadata = parseMetadataJson(a.metadataJson);
            return metadata.is_internal !== true;
          })
        : audits;

    const timeline = [
      ...messages.map((m) => ({
        type: 'message' as const,
        message: toApiMessage(m),
      })),
      ...visibleAudits.map((a) => ({
        type: 'audit' as const,
        action: a.action,
        created_at: a.createdAt.toISOString(),
        metadata: parseMetadataJson(a.metadataJson),
      })),
    ];

    type TimelineItem = (typeof timeline)[number];

    timeline.sort((a: TimelineItem, b: TimelineItem) => {
      const at = a.type === 'message' ? a.message.created_at : a.created_at;
      const bt = b.type === 'message' ? b.message.created_at : b.created_at;
      return new Date(at).getTime() - new Date(bt).getTime();
    });

    return {
      ticket: toApiTicket(ticket),
      timeline,
    };
  }

  async addMessage(params: {
    ticketId: string;
    actor: { id: string; role: ApiUserRole };
    content: string;
    isInternal: boolean;
  }) {
    if (params.actor.role === 'Customer') {
      if (params.isInternal) {
        throw new AppError({
          status: 400,
          code: ErrorCodes.BAD_REQUEST,
          message: 'Customer cannot create internal notes',
        });
      }

      return this.messages.createCustomerReply({
        ticketId: params.ticketId,
        customerId: params.actor.id,
        content: params.content,
      });
    }

    return this.messages.createAgentMessage({
      ticketId: params.ticketId,
      actor: params.actor,
      content: params.content,
      isInternal: params.isInternal,
    });
  }

  async changeStatus(params: {
    ticketId: string;
    actor: { id: string; role: ApiUserRole };
    fromStatus: ApiTicketStatus;
    toStatus: ApiTicketStatus;
    expectedAssigneeId?: string | null;
  }) {
    const ticket = await this.getVisibleTicketOrThrow({
      ticketId: params.ticketId,
      user: params.actor,
    });

    const from = toDbTicketStatus(params.fromStatus);
    const to = toDbTicketStatus(params.toStatus);

    assertStatusTransitionAllowed({ actorRole: params.actor.role, from, to });

    const closedAt = to === TicketStatus.CLOSED ? new Date() : null;

    const where: Prisma.TicketWhereInput = {
      id: ticket.id,
      status: from,
    };

    if (params.actor.role === 'Agent') {
      if (
        params.expectedAssigneeId !== undefined &&
        params.expectedAssigneeId !== params.actor.id
      ) {
        throw new AppError({
          status: 400,
          code: ErrorCodes.BAD_REQUEST,
          message: 'expected_assignee_id must match agent id',
        });
      }

      where.assigneeId = params.actor.id;
    } else if (params.expectedAssigneeId !== undefined) {
      where.assigneeId = params.expectedAssigneeId;
    }

    // Customer can only close their own ticket, and only if visible already.
    // Agent transitions can be constrained by expectedAssigneeId if provided.

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.ticket.updateMany({
        where,
        data: {
          status: to,
          closedAt,
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (result.count !== 1) {
        throw new AppError({
          status: 409,
          code: ErrorCodes.TICKET_CONFLICT,
          message: 'Ticket changed, please refresh and retry',
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: AuditEntityType.TICKET,
          entityId: ticket.id,
          actorId: params.actor.id,
          action: AuditAction.STATUS_CHANGED,
          metadataJson: JSON.stringify({
            from_status: params.fromStatus,
            to_status: params.toStatus,
          }),
        },
      });

      const updated = await tx.ticket.findUnique({ where: { id: ticket.id } });
      if (!updated) {
        throw new AppError({
          status: 500,
          code: ErrorCodes.BAD_REQUEST,
          message: 'Unexpected error',
        });
      }

      return { ticket: toApiTicket(updated) };
    });
  }

  async changeAssignee(params: {
    ticketId: string;
    actor: { id: string; role: ApiUserRole };
    assigneeId: string | null;
    expectedStatus: ApiTicketStatus;
  }) {
    const ticket = await this.getVisibleTicketOrThrow({
      ticketId: params.ticketId,
      user: params.actor,
    });
    assertNotClosed(ticket.status);

    const expected = toDbTicketStatus(params.expectedStatus);

    // Agent can only claim/unclaim for themselves.
    if (params.actor.role === 'Agent') {
      if (params.assigneeId === null) {
        if (ticket.assigneeId !== params.actor.id) {
          throw new AppError({
            status: 409,
            code: ErrorCodes.TICKET_CONFLICT,
            message: 'Ticket changed, please refresh and retry',
          });
        }
      } else {
        if (params.assigneeId !== params.actor.id) {
          throw new AppError({
            status: 403,
            code: ErrorCodes.FORBIDDEN,
            message: 'Agent cannot assign other agents',
          });
        }
      }
    }

    if (params.actor.role === 'Customer') {
      throw new AppError({
        status: 403,
        code: ErrorCodes.FORBIDDEN,
        message: 'Customer cannot assign tickets',
      });
    }

    // If Agent takes an unassigned OPEN ticket, it becomes IN_PROGRESS.
    const taking =
      params.actor.role === 'Agent' &&
      ticket.assigneeId === null &&
      params.assigneeId === params.actor.id;

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          status: expected,
          ...(taking ? { assigneeId: null } : {}),
        },
        data: {
          assigneeId: params.assigneeId,
          status: taking
            ? TicketStatus.IN_PROGRESS
            : params.assigneeId === null &&
                ticket.status === TicketStatus.IN_PROGRESS
              ? TicketStatus.OPEN
              : undefined,
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (result.count !== 1) {
        throw new AppError({
          status: 409,
          code: ErrorCodes.TICKET_CONFLICT,
          message: 'Ticket changed, please refresh and retry',
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: AuditEntityType.TICKET,
          entityId: ticket.id,
          actorId: params.actor.id,
          action: AuditAction.ASSIGNEE_CHANGED,
          metadataJson: JSON.stringify({
            from_assignee_id: ticket.assigneeId,
            to_assignee_id: params.assigneeId,
          }),
        },
      });

      const updated = await tx.ticket.findUnique({ where: { id: ticket.id } });
      if (!updated) {
        throw new AppError({
          status: 500,
          code: ErrorCodes.BAD_REQUEST,
          message: 'Unexpected error',
        });
      }

      return { ticket: toApiTicket(updated) };
    });
  }
}
