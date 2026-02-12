'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodSchema } from 'zod';

export function resolver(schema: ZodSchema) {
  return zodResolver(schema as any) as any;
}
