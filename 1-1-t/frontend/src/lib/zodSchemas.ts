import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email 格式不正確'),
  password: z.string().min(1, '必填'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, '必填'),
  email: z.string().email('Email 格式不正確'),
  password: z.string().min(8, '至少 8 碼'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const adminActivitySchema = z
  .object({
    title: z.string().min(1, '必填'),
    description: z.string(),
    date: z.string().min(1, '必填'),
    deadline: z.string().min(1, '必填'),
    location: z.string().min(1, '必填'),
    capacity: z.number().int('必須是整數').min(1, '至少 1 人'),
  })
  .superRefine((val, ctx) => {
    const date = new Date(val.date);
    const deadline = new Date(val.deadline);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: '日期格式不正確' });
      return;
    }

    if (Number.isNaN(deadline.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: '截止時間格式不正確' });
      return;
    }

    if (date.getTime() <= deadline.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: '活動時間必須晚於截止時間',
      });
    }
  });

export type AdminActivityFormValues = z.infer<typeof adminActivitySchema>;
