import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseParams } from './validation.js';
import { requireAuthenticatedUser } from '../auth/session.js';
import { requireRole } from '../auth/rbac.js';
import { archiveService } from '../services/archiveService.js';

const DocumentIdParamsSchema = z.object({ documentId: z.string().uuid() });

export async function registerArchiveRoutes(app: FastifyInstance) {
  app.post(
    '/:documentId/archive',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = requireAuthenticatedUser(request);
      const { documentId } = parseParams(request, DocumentIdParamsSchema);
      await archiveService.archiveApprovedDocument({ user, documentId });
      return { ok: true };
    },
  );
}
