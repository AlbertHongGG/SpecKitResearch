import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AppError } from '../http/errors';
import { requireAuth } from '../middleware/requireAuth';
import { categoryRepoPrisma } from '../../infra/db/categoryRepoPrisma';
import { CategoryNameInUseError } from '../../domain/categories/categoryRepo';

const ParamsSchema = z.object({
  categoryId: z.string().uuid(),
});

const BodySchema = z.object({
  name: z.string().trim().min(1).max(20),
  type: z.enum(['income', 'expense', 'both']),
});

export async function registerCategoriesUpdateRoute(app: FastifyInstance) {
  app.put(
    '/categories/:categoryId',
    {
      preHandler: requireAuth,
    },
    async (request) => {
      const userId = request.auth!.user!.id;
      const params = ParamsSchema.parse(request.params);
      const body = BodySchema.parse(request.body);

      try {
        const updated = await categoryRepoPrisma.updateForUser({
          userId,
          categoryId: params.categoryId,
          name: body.name,
          type: body.type,
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
      } catch (error) {
        if (error instanceof CategoryNameInUseError) {
          throw new AppError({
            code: 'CATEGORY_NAME_IN_USE',
            status: 409,
            message: '類別名稱重複',
          });
        }

        throw error;
      }
    },
  );
}
