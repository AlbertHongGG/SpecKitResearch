import { z } from 'zod'
import { ticketStatusSchema } from './tickets.dto'

export const agentWorkspaceQuerySchema = z.object({
  view: z.enum(['unassigned', 'mine']),
  status: ticketStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AgentWorkspaceQueryDto = z.infer<typeof agentWorkspaceQuerySchema>
