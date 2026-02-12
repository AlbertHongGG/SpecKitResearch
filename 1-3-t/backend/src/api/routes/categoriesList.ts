import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../middleware/requireAuth';
import { categoryRepoPrisma } from '../../infra/db/categoryRepoPrisma';

const QuerySchema = z.object({
  includeInactive: z
    .preprocess((v) => {
      if (v === undefined) return true;
      if (typeof v !== 'string') return v;
      if (v === 'true') return true;
      if (v === 'false') return false;
      return v;
    }, z.boolean())
    .optional(),
});

export async function registerCategoriesListRoute(app: FastifyInstance) {
  app.get(
    '/categories',
    {
      preHandler: requireAuth,
    },
    async (request) => {
      const query = QuerySchema.parse(request.query);
      const includeInactive = query.includeInactive ?? true;

      const userId = request.auth!.user!.id;
      const items = await categoryRepoPrisma.listByUser({ userId, includeInactive });

      return {
        items: items.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          isActive: c.isActive,
          isDefault: c.isDefault,
        })),
      };
    },
  );
}
