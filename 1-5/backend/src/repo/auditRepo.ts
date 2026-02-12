import { prisma } from './prisma.js';

export async function appendAuditLog(options: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId: string;
  metadata: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: options.actorId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      requestId: options.requestId,
      metadataJson: JSON.stringify(options.metadata),
    },
  });
}
