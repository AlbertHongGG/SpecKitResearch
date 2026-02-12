import { z } from 'zod'

export const ticketIdParamSchema = z.object({
  ticketId: z.string().uuid(),
})

export const ticketCategorySchema = z.enum([
  'Account',
  'Billing',
  'Technical',
  'Other',
])

export const ticketStatusSchema = z.enum([
  'Open',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed',
])

export const createTicketSchema = z.object({
  title: z.string().min(1).max(100),
  category: ticketCategorySchema,
  description: z.string().min(1),
})

export const listTicketsQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type CreateTicketDto = z.infer<typeof createTicketSchema>
export type ListTicketsQueryDto = z.infer<typeof listTicketsQuerySchema>
