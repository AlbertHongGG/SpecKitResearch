import { z } from 'zod'
import { ticketIdParamSchema } from './tickets.dto'

export const assignTicketParamSchema = ticketIdParamSchema

export const assignTicketSchema = z.object({
  assignee_id: z.string().uuid().nullable(),
})

export type AssignTicketDto = z.infer<typeof assignTicketSchema>
