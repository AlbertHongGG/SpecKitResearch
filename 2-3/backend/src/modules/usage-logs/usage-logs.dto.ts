import { z } from 'zod';

export class UsageLogsQueryDto {
  static schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    status_code: z.coerce.number().int().optional(),
    endpoint: z.string().min(1).optional()
  });

  from!: string;
  to!: string;
  status_code?: number;
  endpoint?: string;
}

export class UsageStatsQueryDto {
  static schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    endpoint: z.string().min(1).optional(),
  });

  from!: string;
  to!: string;
  endpoint?: string;
}
