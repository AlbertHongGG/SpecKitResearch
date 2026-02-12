import { TicketStatus } from '@prisma/client';
import { ApiUserRole } from './api-mappers';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';

export function assertNotClosed(currentStatus: TicketStatus) {
  if (currentStatus === TicketStatus.CLOSED) {
    throw new AppError({
      status: 400,
      code: ErrorCodes.TICKET_CLOSED,
      message: 'Ticket is closed',
    });
  }
}

export function assertStatusTransitionAllowed(params: {
  actorRole: ApiUserRole;
  from: TicketStatus;
  to: TicketStatus;
}) {
  const { actorRole, from, to } = params;

  if (from === TicketStatus.CLOSED) {
    throw new AppError({
      status: 400,
      code: ErrorCodes.TICKET_CLOSED,
      message: 'Ticket is closed',
    });
  }

  const allowed =
    (from === TicketStatus.OPEN &&
      to === TicketStatus.IN_PROGRESS &&
      actorRole === 'Admin') ||
    (from === TicketStatus.IN_PROGRESS &&
      to === TicketStatus.WAITING_FOR_CUSTOMER &&
      actorRole === 'Agent') ||
    (from === TicketStatus.WAITING_FOR_CUSTOMER &&
      to === TicketStatus.IN_PROGRESS &&
      actorRole === 'Customer') ||
    (from === TicketStatus.IN_PROGRESS &&
      to === TicketStatus.RESOLVED &&
      actorRole === 'Agent') ||
    (from === TicketStatus.RESOLVED &&
      to === TicketStatus.CLOSED &&
      (actorRole === 'Customer' || actorRole === 'Admin')) ||
    (from === TicketStatus.RESOLVED &&
      to === TicketStatus.IN_PROGRESS &&
      (actorRole === 'Agent' || actorRole === 'Admin'));

  if (!allowed) {
    throw new AppError({
      status: 400,
      code: ErrorCodes.TICKET_STATE_INVALID,
      message: 'Illegal status transition',
      details: { from, to, actor_role: actorRole },
    });
  }
}
