import { z } from 'zod';

export const uploadMetaSchema = z.object({
  courseId: z.string().min(1).optional(),
});

export const uploadLimits = {
  maxBytes: 10 * 1024 * 1024,
};
