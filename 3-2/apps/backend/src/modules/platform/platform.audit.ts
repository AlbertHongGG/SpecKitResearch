import type { Organization } from '@prisma/client';

import { AuditActions } from '../audit/audit.actions.js';
import type { AuditService } from '../audit/audit.service.js';

export async function auditPlatformOrgCreated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  org: Organization;
}) {
  await params.audit.append({
    action: AuditActions.PLATFORM_ORG_CREATED,
    entityType: 'Organization',
    entityId: params.org.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.org.id,
    afterJson: { name: params.org.name, plan: params.org.plan, status: params.org.status },
  });
}

export async function auditPlatformOrgUpdated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  org: Organization;
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.PLATFORM_ORG_UPDATED,
    entityType: 'Organization',
    entityId: params.org.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.org.id,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditOrgSuspended(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  org: Organization;
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.ORG_SUSPENDED,
    entityType: 'Organization',
    entityId: params.org.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.org.id,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditOrgUnsuspended(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  org: Organization;
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.ORG_UNSUSPENDED,
    entityType: 'Organization',
    entityId: params.org.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.org.id,
    beforeJson: params.before,
    afterJson: params.after,
  });
}
