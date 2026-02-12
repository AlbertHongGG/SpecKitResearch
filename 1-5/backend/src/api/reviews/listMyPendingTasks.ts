import type { FastifyInstance } from 'fastify';

import { requireRole } from '../../lib/rbac.js';
import { listMyPendingTasks } from '../../repo/reviewTaskRepo.js';
import { toContractDocumentStatus } from '../../domain/types.js';

export async function registerListMyPendingTasksRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/reviews/tasks',
    {
      preHandler: requireRole(['Reviewer']),
    },
    async (request) => {
      const user = request.currentUser!;
      const tasks = await listMyPendingTasks(user.id);
      return {
        tasks: tasks.map((t) => ({
          id: t.id,
          documentId: t.documentId,
          stepKey: t.stepKey,
          mode: t.mode,
          status: t.status,
          createdAt: t.createdAt,
          document: {
            title: t.document.title,
            status: toContractDocumentStatus(t.document.status),
            updatedAt: t.document.updatedAt,
          },
        })),
      };
    },
  );
}
