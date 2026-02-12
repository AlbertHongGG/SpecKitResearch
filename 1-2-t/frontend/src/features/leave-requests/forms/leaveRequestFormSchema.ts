import { z } from 'zod';

export const leaveRequestFormSchema = z.object({
  leave_type_id: z.string().min(1, '請選擇假別'),
  start_date: z.string().min(1, '請選擇開始日期'),
  end_date: z.string().min(1, '請選擇結束日期'),
  reason: z.string().min(1, '請填寫原因'),
  attachment_id: z.string().uuid().nullable().optional(),
});

export type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;
