import { Ticket } from '@prisma/client';
import { ApiUserRole } from './api-mappers';

export function canSeeTicket(params: {
  user: { id: string; role: ApiUserRole };
  ticket: Pick<Ticket, 'customerId' | 'assigneeId'>;
}): boolean {
  const { user, ticket } = params;

  switch (user.role) {
    case 'Admin':
      return true;
    case 'Customer':
      return ticket.customerId === user.id;
    case 'Agent':
      return ticket.assigneeId === null || ticket.assigneeId === user.id;
  }

  return false;
}
