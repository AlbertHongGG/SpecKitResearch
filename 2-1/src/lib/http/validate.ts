import { z } from 'zod';

import { AppError } from '@/lib/errors/AppError';

export async function parseJson<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw AppError.validationFailed({ issues: parsed.error.issues });
  }
  return parsed.data;
}

export function parseParams<T>(params: unknown, schema: z.ZodSchema<T>): T {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw AppError.validationFailed({ issues: parsed.error.issues });
  }
  return parsed.data;
}
