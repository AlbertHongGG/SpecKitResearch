import { z } from 'zod';

export class AuditLogsQueryDto {
  static schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    actor_role: z.enum(['developer', 'admin', 'system']).optional(),
    actor_user_id: z.string().uuid().optional(),
    action: z.string().min(1).optional(),
    target_type: z.string().min(1).optional(),
    target_id: z.string().optional()
  });

  from!: string;
  to!: string;
  actor_role?: 'developer' | 'admin' | 'system';
  actor_user_id?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
}
