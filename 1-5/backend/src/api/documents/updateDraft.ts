import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../../lib/rbac.js';
import { notFound } from '../../lib/httpError.js';
import { prisma } from '../../repo/prisma.js';
import { assertCanUpdateDraft } from '../../domain/documentStateMachine.js';
import { appendAuditLog } from '../../repo/auditRepo.js';
import { AuditActions, buildAuditEvent } from '../../domain/auditEvents.js';
import { toContractDocumentStatus } from '../../domain/types.js';

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string(),
});

type Params = z.infer<typeof ParamsSchema>;
type Body = z.infer<typeof BodySchema>;

export async function registerUpdateDraftRoute(app: FastifyInstance): Promise<void> {
  app.put<{ Params: Params; Body: Body }>(
    '/documents/:id/draft',
    {
      preHandler: requireRole(['User', 'Admin']),
    },
    async (request) => {
      const user = request.currentUser!;
      const { id } = ParamsSchema.parse(request.params);
      const body = BodySchema.parse(request.body);

      const where = user.role === 'Admin' ? { id } : { id, ownerId: user.id };

      const doc = await prisma.document.findFirst({
        where,
        include: { currentVersion: true },
      });
      if (!doc) throw notFound();

      assertCanUpdateDraft({ id: doc.id, status: doc.status, currentVersion: doc.currentVersion });

      await prisma.$transaction(async (tx) => {
        await tx.document.update({ where: { id: doc.id }, data: { title: body.title } });
        await tx.documentVersion.update({
          where: { id: doc.currentVersionId! },
          data: { content: body.content },
        });
      });

      await appendAuditLog(
        buildAuditEvent({
          actorId: user.id,
          requestId: request.id,
          action: AuditActions.DraftUpdated,
          entityType: 'Document',
          entityId: doc.id,
          metadata: { title: body.title },
        }),
      );

      const updated = await prisma.document.findUnique({ where: { id: doc.id } });
      return { id: doc.id, status: toContractDocumentStatus(updated!.status) };
    },
  );
}
