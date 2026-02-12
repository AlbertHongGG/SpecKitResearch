import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AppError } from '../http/errors';
import { requireAuth } from '../middleware/requireAuth';
import { categoryRepoPrisma } from '../../infra/db/categoryRepoPrisma';

const ParamsSchema = z.object({
  categoryId: z.string().uuid(),
});

const BodySchema = z.object({
  isActive: z.boolean(),
});

export async function registerCategoriesToggleActiveRoute(app: FastifyInstance) {
  app.patch(
    '/categories/:categoryId/active',
    {
      preHandler: requireAuth,
    },
    async (request) => {
      const userId = request.auth!.user!.id;
      const params = ParamsSchema.parse(request.params);
      const body = BodySchema.parse(request.body);

      const updated = await categoryRepoPrisma.setActiveForUser({
        userId,
        categoryId: params.categoryId,
        isActive: body.isActive,
      });

      if (!updated) {
        throw new AppError({
          code: 'NOT_FOUND',
          status: 404,
          message: '找不到類別',
        });
      }

      return {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        isActive: updated.isActive,
        isDefault: updated.isDefault,
      };
    },
  );
}
