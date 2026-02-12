import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../../lib/rbac.js';
import { createDraftDocument } from '../../repo/documentRepo.js';
import { appendAuditLog } from '../../repo/auditRepo.js';
import { AuditActions, buildAuditEvent } from '../../domain/auditEvents.js';

const CreateDocumentSchema = z.object({
  title: z.string().max(120).optional(),
  content: z.string().optional(),
});

type CreateDocumentBody = z.infer<typeof CreateDocumentSchema>;

export async function registerCreateDocumentRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateDocumentBody }>(
    '/documents',
    {
      preHandler: requireRole(['User', 'Admin']),
    },
    async (request, reply) => {
      const user = request.currentUser!;
      const body = CreateDocumentSchema.parse(request.body);

      const { document } = await createDraftDocument({
        ownerId: user.id,
        title: body.title?.trim() || 'Untitled',
        content: body.content ?? '',
      });

      await appendAuditLog(
        buildAuditEvent({
          actorId: user.id,
          requestId: request.id,
          action: AuditActions.DocumentCreated,
          entityType: 'Document',
          entityId: document.id,
          metadata: { title: document.title },
        }),
      );

      return reply.code(201).send({ id: document.id });
    },
  );
}
