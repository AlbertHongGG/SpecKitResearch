import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseParams } from './validation.js';
import { requireAuthenticatedUser } from '../auth/session.js';
import { attachmentService } from '../services/attachmentService.js';

const DocumentIdParamsSchema = z.object({ documentId: z.string().uuid() });

export async function registerAttachmentsRoutes(app: FastifyInstance) {
  app.post('/:documentId/attachments', async (request) => {
    const user = requireAuthenticatedUser(request);
    const { documentId } = parseParams(request, DocumentIdParamsSchema);

    const file = await (request as any).file();
    if (!file) {
      throw new Error('Missing file');
    }
    const created = await attachmentService.uploadDraftAttachment({
      user,
      documentId,
      filename: file.filename,
      contentType: file.mimetype,
      stream: file.file,
    });
    return {
      attachment: {
        id: created.id,
        filename: created.filename,
        contentType: created.contentType,
        sizeBytes: created.sizeBytes,
        createdAt: created.createdAt.toISOString(),
      },
    };
  });
}
