import type { PrismaClient } from '@prisma/client';

export type AuditActor =
  | { type: 'admin'; userId: string }
  | { type: 'user'; userId: string }
  | { type: 'system' };

export class AuditLogService {
  constructor(private prisma: PrismaClient) {}

  async write(input: {
    actor: AuditActor;
    action: string;
    target: { type: string; id?: string | null };
    meta?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actor_type: input.actor.type,
        actor_user_id: input.actor.type === 'system' ? null : input.actor.userId,
        action: input.action,
        target_type: input.target.type,
        target_id: input.target.id ?? null,
        meta: input.meta ?? undefined,
      },
    });
  }
}
