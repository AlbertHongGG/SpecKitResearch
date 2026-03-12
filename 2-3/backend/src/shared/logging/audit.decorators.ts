import type { AuditActorRole, Prisma } from '@prisma/client';

import type { SessionPrincipal } from '../auth/auth.types';

import type { AuditAction } from './audit-actions';
import type { AuditLogService } from './audit-log.service';

export type AuditActor = {
  actorUserId?: string;
  actorRole: AuditActorRole;
};

export function auditActorFromSession(principal: SessionPrincipal): AuditActor {
  return {
    actorUserId: principal.userId,
    actorRole: principal.role === 'admin' ? 'admin' : 'developer'
  };
}

export async function writeAuditOrThrow(params: {
  audit: AuditLogService;
  tx: Prisma.TransactionClient;
  actor: AuditActor;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await params.audit.write(
    {
      actorUserId: params.actor.actorUserId,
      actorRole: params.actor.actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata
    },
    params.tx
  );
}
