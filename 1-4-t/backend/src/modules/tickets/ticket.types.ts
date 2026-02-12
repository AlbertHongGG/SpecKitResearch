export type UserRole = 'Customer' | 'Agent' | 'Admin'

export type TicketCategory = 'Account' | 'Billing' | 'Technical' | 'Other'

export type TicketStatus =
  | 'Open'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Resolved'
  | 'Closed'

export type TicketVisibilityContext = {
  user: { id: string; role: UserRole }
  ticket: {
    customerId: string
    assigneeId: string | null
  }
}
