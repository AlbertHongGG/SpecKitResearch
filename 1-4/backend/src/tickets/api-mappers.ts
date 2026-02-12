import { TicketCategory, TicketStatus, UserRole } from '@prisma/client';

export type ApiUserRole = 'Customer' | 'Agent' | 'Admin';
export type ApiTicketStatus =
  | 'Open'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Resolved'
  | 'Closed';
export type ApiTicketCategory = 'Account' | 'Billing' | 'Technical' | 'Other';

export function toDbUserRole(role: ApiUserRole): UserRole {
  switch (role) {
    case 'Customer':
      return UserRole.CUSTOMER;
    case 'Agent':
      return UserRole.AGENT;
    case 'Admin':
      return UserRole.ADMIN;
  }
}

export function toApiUserRole(role: UserRole): ApiUserRole {
  switch (role) {
    case UserRole.CUSTOMER:
      return 'Customer';
    case UserRole.AGENT:
      return 'Agent';
    case UserRole.ADMIN:
      return 'Admin';
  }

  throw new Error(`Unknown role: ${String(role)}`);
}

export function toDbTicketStatus(status: ApiTicketStatus): TicketStatus {
  switch (status) {
    case 'Open':
      return TicketStatus.OPEN;
    case 'In Progress':
      return TicketStatus.IN_PROGRESS;
    case 'Waiting for Customer':
      return TicketStatus.WAITING_FOR_CUSTOMER;
    case 'Resolved':
      return TicketStatus.RESOLVED;
    case 'Closed':
      return TicketStatus.CLOSED;
  }
}

export function toApiTicketStatus(status: TicketStatus): ApiTicketStatus {
  switch (status) {
    case TicketStatus.OPEN:
      return 'Open';
    case TicketStatus.IN_PROGRESS:
      return 'In Progress';
    case TicketStatus.WAITING_FOR_CUSTOMER:
      return 'Waiting for Customer';
    case TicketStatus.RESOLVED:
      return 'Resolved';
    case TicketStatus.CLOSED:
      return 'Closed';
  }

  throw new Error(`Unknown status: ${String(status)}`);
}

export function toDbTicketCategory(
  category: ApiTicketCategory,
): TicketCategory {
  switch (category) {
    case 'Account':
      return TicketCategory.ACCOUNT;
    case 'Billing':
      return TicketCategory.BILLING;
    case 'Technical':
      return TicketCategory.TECHNICAL;
    case 'Other':
      return TicketCategory.OTHER;
  }
}

export function toApiTicketCategory(
  category: TicketCategory,
): ApiTicketCategory {
  switch (category) {
    case TicketCategory.ACCOUNT:
      return 'Account';
    case TicketCategory.BILLING:
      return 'Billing';
    case TicketCategory.TECHNICAL:
      return 'Technical';
    case TicketCategory.OTHER:
      return 'Other';
  }

  throw new Error(`Unknown category: ${String(category)}`);
}

export function toApiTicket(ticket: {
  id: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  customerId: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}) {
  return {
    id: ticket.id,
    title: ticket.title,
    category: toApiTicketCategory(ticket.category),
    status: toApiTicketStatus(ticket.status),
    customer_id: ticket.customerId,
    assignee_id: ticket.assigneeId,
    created_at: ticket.createdAt.toISOString(),
    updated_at: ticket.updatedAt.toISOString(),
    closed_at: ticket.closedAt ? ticket.closedAt.toISOString() : null,
  };
}

export function toApiMessage(message: {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: UserRole;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}) {
  return {
    id: message.id,
    ticket_id: message.ticketId,
    author_id: message.authorId,
    role: toApiUserRole(message.authorRole),
    content: message.content,
    is_internal: message.isInternal,
    created_at: message.createdAt.toISOString(),
  };
}
