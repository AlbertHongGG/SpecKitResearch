import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';
import { ApiUserRole, toApiMessage } from '../tickets/api-mappers';
import { canSeeTicket } from '../tickets/ticket-visibility';
import { assertNotClosed } from '../tickets/ticket-state-machine';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createCustomerReply(params: {
    ticketId: string;
    customerId: string;
    content: string;
  }) {
    const ticket = await this.getVisibleTicketOrThrow({
      ticketId: params.ticketId,
      user: { id: params.customerId, role: 'Customer' },
    });

    assertNotClosed(ticket.status);

    if (ticket.status !== TicketStatus.WAITING_FOR_CUSTOMER) {
      throw new AppError({
        status: 400,
        code: ErrorCodes.TICKET_STATE_INVALID,
        message: 'Customer can reply only when waiting for customer',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: params.customerId,
          authorRole: UserRole.CUSTOMER,
          content: params.content,
          isInternal: false,
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          entityType: AuditEntityType.TICKET,
          entityId: ticket.id,
          actorId: params.customerId,
          action: AuditAction.MESSAGE_CREATED,
          metadataJson: JSON.stringify({
            message_id: message.id,
            is_internal: false,
          }),
        },
      });

      return { message: toApiMessage(message) };
    });
  }

  async createAgentMessage(params: {
    ticketId: string;
    actor: { id: string; role: ApiUserRole };
    content: string;
    isInternal: boolean;
  }) {
    const ticket = await this.getVisibleTicketOrThrow({
      ticketId: params.ticketId,
      user: params.actor,
    });

    assertNotClosed(ticket.status);

    if (params.actor.role === 'Customer') {
      throw new AppError({
        status: 403,
        code: ErrorCodes.FORBIDDEN,
        message: 'Customer cannot create agent messages',
      });
    }

    if (params.actor.role === 'Agent') {
      if (ticket.assigneeId !== params.actor.id && ticket.assigneeId !== null) {
        throw new AppError({
          status: 404,
          code: ErrorCodes.NOT_FOUND,
          message: 'Not found',
        });
      }
    }

    const authorRole =
      params.actor.role === 'Agent' ? UserRole.AGENT : UserRole.ADMIN;

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: params.actor.id,
          authorRole,
          content: params.content,
          isInternal: params.isInternal,
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          entityType: AuditEntityType.TICKET,
          entityId: ticket.id,
          actorId: params.actor.id,
          action: AuditAction.MESSAGE_CREATED,
          metadataJson: JSON.stringify({
            message_id: message.id,
            is_internal: message.isInternal,
          }),
        },
      });

      return { message: toApiMessage(message) };
    });
  }
}
