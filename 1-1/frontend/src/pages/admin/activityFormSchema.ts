import { z } from 'zod'

export const activityFormSchema = z
  .object({
    title: z.string().min(1, '標題必填'),
    description: z.string().default(''),
    date: z.string().min(1, '活動時間必填'),
    deadline: z.string().min(1, '截止時間必填'),
    location: z.string().min(1, '地點必填'),
    capacity: z.coerce.number().int().min(1, '名額至少 1'),
    status: z.enum(['draft', 'published', 'closed', 'archived', 'full']),
  })
  .superRefine((val, ctx) => {
    const date = new Date(val.date)
    const deadline = new Date(val.deadline)
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(deadline.getTime())) return
    if (date.getTime() <= deadline.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '活動開始時間必須晚於報名截止時間',
        path: ['date'],
      })
    }
  })

export type ActivityFormValues = z.infer<typeof activityFormSchema>
