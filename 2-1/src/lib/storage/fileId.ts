import { z } from 'zod';

import { AppError } from '@/lib/errors/AppError';

const fileIdSchema = z.string().min(5).max(64);

export function parseFileId(fileId: string): string {
  const parsed = fileIdSchema.safeParse(fileId);
  if (!parsed.success) throw AppError.badRequest('Invalid fileId');
  return parsed.data;
}
