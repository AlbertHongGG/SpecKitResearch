import { AuditActions } from '../audit/audit.actions.js';
import type { AuditService } from '../audit/audit.service.js';

export async function auditInviteCreated(
  audit: AuditService,
  input: {
    actorUserId: string;
    actorEmail: string;
    organizationId: string;
    invite: { id: string; email: string; token: string; expiresAt: Date };
  },
) {
  await audit.append({
    action: AuditActions.ORG_INVITE_CREATED,
    entityType: 'OrganizationInvite',
    entityId: input.invite.id,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    organizationId: input.organizationId,
    beforeJson: null,
    afterJson: {
      email: input.invite.email,
      token: input.invite.token,
      expiresAt: input.invite.expiresAt.toISOString(),
    },
  });
}

export async function auditInviteAccepted(
  audit: AuditService,
  input: {
    actorUserId: string;
    actorEmail: string;
    organizationId: string;
    invite: { id: string; email: string; token: string; expiresAt: Date; acceptedAt: Date | null };
  },
) {
  await audit.append({
    action: AuditActions.ORG_INVITE_ACCEPTED,
    entityType: 'OrganizationInvite',
    entityId: input.invite.id,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    organizationId: input.organizationId,
    beforeJson: {
      email: input.invite.email,
      token: input.invite.token,
      expiresAt: input.invite.expiresAt.toISOString(),
      acceptedAt: input.invite.acceptedAt ? input.invite.acceptedAt.toISOString() : null,
    },
    afterJson: {
      acceptedAt: new Date().toISOString(),
    },
  });
}
