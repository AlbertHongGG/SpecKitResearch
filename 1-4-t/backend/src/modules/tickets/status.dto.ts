import { z } from 'zod'
import { ticketStatusSchema } from './tickets.dto'

export const changeStatusSchema = z.object({
  from_status: ticketStatusSchema,
  to_status: ticketStatusSchema,
})

export type ChangeStatusDto = z.infer<typeof changeStatusSchema>
