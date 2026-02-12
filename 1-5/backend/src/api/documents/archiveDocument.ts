import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../../lib/rbac.js';
import { archiveDocument } from '../../domain/usecases/archiveDocument.js';

const ParamsSchema = z.object({ id: z.string().uuid() });
type Params = z.infer<typeof ParamsSchema>;

export async function registerArchiveDocumentRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Params: Params }>(
    '/documents/:id/archive',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = request.currentUser!;
      const { id } = ParamsSchema.parse(request.params);
      return archiveDocument({ actorId: user.id, documentId: id, requestId: request.id });
    },
  );
}
