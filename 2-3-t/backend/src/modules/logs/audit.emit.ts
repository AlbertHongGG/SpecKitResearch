import { randomBytes } from 'node:crypto';
import type { AuthContext } from '../../common/security/rbac.guard';
import type { AuditEvent } from './audit.events';

export function makeAuditEvent(params: Omit<AuditEvent, 'eventId'> & { eventId?: string }) {
  return {
    eventId: params.eventId ?? randomBytes(12).toString('base64url'),
    requestId: params.requestId,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    success: params.success,
    metadata: params.metadata,
  } satisfies AuditEvent;
}

export function makeActorFromAuth(auth?: AuthContext) {
  return {
    actorUserId: auth?.user.id,
    actorRole: auth?.user.role,
  };
}
