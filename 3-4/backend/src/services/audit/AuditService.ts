import { createAuditLog } from '../../repositories/auditRepo.js';

export async function audit(input: {
  actorUserId?: string;
  actorRole?: 'USER' | 'ADMIN';
  action: string;
  targetType: string;
  targetId?: string;
  requestId?: string;
  meta?: unknown;
}) {
  return createAuditLog({
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    requestId: input.requestId ?? null,
    meta: input.meta ?? null,
  });
}
