import type { FastifyInstance } from 'fastify';

import { requireRole } from '../../lib/rbac.js';
import { listActiveFlowTemplates } from '../../repo/flowRepo.js';

export async function registerListActiveFlowsRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/flows/active',
    {
      preHandler: requireRole(['User', 'Admin']),
    },
    async () => {
      const templates = await listActiveFlowTemplates();
      return {
        flows: templates.map((t) => ({ id: t.id, name: t.name })),
      };
    },
  );
}
