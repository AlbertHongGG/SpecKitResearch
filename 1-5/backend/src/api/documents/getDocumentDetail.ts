import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../../lib/authMiddleware.js';
import { notFound } from '../../lib/httpError.js';
import { prisma } from '../../repo/prisma.js';
import { toContractDocumentStatus } from '../../domain/types.js';
import { documentWhereForDetail } from '../../lib/visibility.js';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

type Params = z.infer<typeof ParamsSchema>;

export async function registerGetDocumentDetailRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Params: Params }>(
    '/documents/:id',
    async (request) => {
      const user = await requireAuth(request);
      const { id } = ParamsSchema.parse(request.params);

      const where = documentWhereForDetail({ documentId: id, user });

      const document = await prisma.document.findFirst({
        where,
        include: {
          owner: { select: { id: true, email: true } },
          currentVersion: true,
          versions: {
            orderBy: { versionNo: 'asc' },
            include: { attachments: true },
          },
          reviewTasks: {
            orderBy: { createdAt: 'asc' },
            include: { assignee: { select: { id: true, email: true, role: true } } },
          },
          approvalRecord: {
            orderBy: { createdAt: 'asc' },
            include: { actor: { select: { id: true, email: true, role: true } } },
          },
        },
      });

      if (!document) throw notFound();

      const auditLogs = await prisma.auditLog.findMany({
        where: { entityType: 'Document', entityId: document.id },
        orderBy: { createdAt: 'asc' },
      });

      return {
        document: {
          id: document.id,
          title: document.title,
          status: toContractDocumentStatus(document.status),
          owner: document.owner,
          flowTemplateId: document.flowTemplateId,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          currentVersionId: document.currentVersionId,
        },
        versions: document.versions.map((v) => ({
          id: v.id,
          versionNo: v.versionNo,
          kind: v.kind,
          createdAt: v.createdAt.toISOString(),
          content: v.content,
          attachments: v.attachments.map((a) => ({
            id: a.id,
            filename: a.filename,
            contentType: a.contentType,
            sizeBytes: a.sizeBytes,
            storageKey: a.storageKey,
            createdAt: a.createdAt.toISOString(),
          })),
        })),
        reviewTasks: document.reviewTasks.map((t) => ({
          id: t.id,
          documentId: t.documentId,
          documentVersionId: t.documentVersionId,
          assignee: t.assignee,
          stepKey: t.stepKey,
          mode: t.mode,
          status: t.status,
          actedAt: t.actedAt ? t.actedAt.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
        })),
        approvalRecords: document.approvalRecord.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          documentVersionId: r.documentVersionId,
          reviewTaskId: r.reviewTaskId,
          actor: r.actor,
          action: r.action,
          reason: r.reason,
          createdAt: r.createdAt.toISOString(),
        })),
        auditLogs: auditLogs.map((l) => ({
          id: l.id,
          actorId: l.actorId,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          requestId: l.requestId,
          metadata: JSON.parse(l.metadataJson),
          createdAt: l.createdAt.toISOString(),
        })),
      };
    },
  );
}
