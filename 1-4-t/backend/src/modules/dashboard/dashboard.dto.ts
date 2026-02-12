import { z } from 'zod'

export const dashboardQuerySchema = z.object({
  range: z.enum(['last_7_days', 'last_30_days']),
})

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>
