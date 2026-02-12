import type { FastifyInstance } from 'fastify';

import { requireRole } from '../../lib/rbac.js';
import { listDocumentsAll, listDocumentsByOwner } from '../../repo/documentRepo.js';
import { toContractDocumentStatus } from '../../domain/types.js';

export async function registerListDocumentsRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/documents',
    {
      preHandler: requireRole(['User', 'Admin']),
    },
    async (request) => {
      const user = request.currentUser!;

      const docs =
        user.role === 'Admin' ? await listDocumentsAll() : await listDocumentsByOwner(user.id);

      return {
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          status: toContractDocumentStatus(d.status),
          updatedAt: d.updatedAt.toISOString(),
        })),
      };
    },
  );
}
