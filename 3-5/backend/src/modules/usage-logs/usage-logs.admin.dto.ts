import { z } from 'zod';

export class AdminUsageLogsQueryDto {
  static schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    status_code: z.coerce.number().int().optional(),
    endpoint: z.string().min(1).optional(),
    api_key_id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional()
  });

  from!: string;
  to!: string;
  status_code?: number;
  endpoint?: string;
  api_key_id?: string;
  user_id?: string;
}
