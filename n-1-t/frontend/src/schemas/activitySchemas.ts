import { z } from 'zod';

export const adminUpsertActivitySchema = z
  .object({
    title: z.string().min(1, '請輸入標題'),
    description: z.string().min(1, '請輸入描述'),
    location: z.string().min(1, '請輸入地點'),
    date: z.string().min(1, '請輸入活動時間'),
    deadline: z.string().min(1, '請輸入截止時間'),
    capacity: z.coerce.number().int('名額必須為整數').min(1, '名額至少 1'),
  })
  .superRefine((v, ctx) => {
    const date = new Date(v.date);
    const deadline = new Date(v.deadline);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: '請輸入有效的活動時間' });
      return;
    }

    if (Number.isNaN(deadline.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: '請輸入有效的截止時間' });
      return;
    }

    if (date.getTime() <= deadline.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: '活動時間必須晚於截止時間' });
    }
  });

export type AdminUpsertActivityValues = z.infer<typeof adminUpsertActivitySchema>;

export function toAdminUpsertActivityRequest(values: AdminUpsertActivityValues) {
  return {
    title: values.title,
    description: values.description,
    location: values.location,
    date: new Date(values.date).toISOString(),
    deadline: new Date(values.deadline).toISOString(),
    capacity: values.capacity,
  };
}
