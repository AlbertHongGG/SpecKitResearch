import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../../lib/rbac.js';
import { notFound, validationFailed } from '../../lib/httpError.js';
import { prisma } from '../../repo/prisma.js';
import { assertCanUploadDraftAttachment } from '../../domain/documentStateMachine.js';
import { saveAttachmentStream } from '../../lib/attachmentStorage.js';
import { createAttachment } from '../../repo/attachmentRepo.js';
import { appendAuditLog } from '../../repo/auditRepo.js';
import { AuditActions, buildAuditEvent } from '../../domain/auditEvents.js';

const ParamsSchema = z.object({ id: z.string().uuid() });
type Params = z.infer<typeof ParamsSchema>;

export async function registerUploadDraftAttachmentRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Params: Params }>(
    '/documents/:id/attachments',
    {
      preHandler: requireRole(['User', 'Admin']),
    },
    async (request, reply) => {
      const user = request.currentUser!;
      const { id } = ParamsSchema.parse(request.params);

      const where = user.role === 'Admin' ? { id } : { id, ownerId: user.id };
      const doc = await prisma.document.findFirst({
        where,
        include: { currentVersion: { include: { attachments: true } } },
      });
      if (!doc) throw notFound();

      assertCanUploadDraftAttachment({ id: doc.id, status: doc.status, currentVersion: doc.currentVersion });

      const file = await request.file();
      if (!file) throw validationFailed('Missing file');
      if (!file.filename) throw validationFailed('Missing filename');

      const saved = await saveAttachmentStream({ stream: file.file });
      const attachment = await createAttachment({
        documentVersionId: doc.currentVersionId!,
        filename: file.filename,
        contentType: file.mimetype,
        sizeBytes: saved.sizeBytes,
        storageKey: saved.storageKey,
      });

      await appendAuditLog(
        buildAuditEvent({
          actorId: user.id,
          requestId: request.id,
          action: AuditActions.DraftAttachmentUploaded,
          entityType: 'Document',
          entityId: doc.id,
          metadata: {
            attachmentId: attachment.id,
            filename: attachment.filename,
            storageKey: attachment.storageKey,
          },
        }),
      );

      return reply.code(201).send({ id: attachment.id });
    },
  );
}
