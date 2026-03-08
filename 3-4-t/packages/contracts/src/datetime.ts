import { z } from 'zod';

// ISO 8601 datetime string (accepts Z suffix or offset)
export const IsoDateTimeSchema = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Invalid ISO datetime string',
  );

export type IsoDateTimeString = z.infer<typeof IsoDateTimeSchema>;
