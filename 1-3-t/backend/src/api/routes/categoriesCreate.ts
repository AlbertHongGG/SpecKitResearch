import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AppError } from '../http/errors';
import { requireAuth } from '../middleware/requireAuth';
import { categoryRepoPrisma } from '../../infra/db/categoryRepoPrisma';
import { CategoryNameInUseError } from '../../domain/categories/categoryRepo';

const BodySchema = z.object({
  name: z.string().trim().min(1).max(20),
  type: z.enum(['income', 'expense', 'both']),
});

export async function registerCategoriesCreateRoute(app: FastifyInstance) {
  app.post(
    '/categories',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const userId = request.auth!.user!.id;
      const body = BodySchema.parse(request.body);

      try {
        const created = await categoryRepoPrisma.create({
          userId,
          name: body.name,
          type: body.type,
          isActive: true,
          isDefault: false,
        });

        reply.status(201).send({
          id: created.id,
          name: created.name,
          type: created.type,
          isActive: created.isActive,
          isDefault: created.isDefault,
        });
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
