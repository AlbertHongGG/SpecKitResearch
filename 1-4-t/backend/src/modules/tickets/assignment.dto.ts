import { z } from 'zod'

export const ticketIdParamSchema = z.object({
  ticketId: z.string().uuid(),
})

export type TicketIdParamDto = z.infer<typeof ticketIdParamSchema>
