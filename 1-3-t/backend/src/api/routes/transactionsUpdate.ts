import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AppError } from '../http/errors';
import { requireAuth } from '../middleware/requireAuth';
import { categoryRepoPrisma } from '../../infra/db/categoryRepoPrisma';
import { transactionRepoPrisma } from '../../infra/db/transactionRepoPrisma';
import { isCategoryTypeCompatible } from '../../domain/categories/categoryRules';
import { TransactionCreateSchema, formatDateOnly } from '../../domain/transactions/transactionRules';

const ParamsSchema = z.object({
  transactionId: z.string().uuid(),
});

export async function registerTransactionsUpdateRoute(app: FastifyInstance) {
  app.put(
    '/transactions/:transactionId',
    {
      preHandler: requireAuth,
    },
    async (request) => {
      const params = ParamsSchema.parse(request.params);
      const input = TransactionCreateSchema.parse(request.body);
      const userId = request.auth!.user!.id;

      const existing = await transactionRepoPrisma.findById({ transactionId: params.transactionId });
      if (!existing) {
        throw new AppError({ code: 'NOT_FOUND', status: 404, message: '找不到交易' });
      }

      if (existing.userId !== userId) {
        // Contract: PUT /transactions/{id} does not expose 403; treat as not found.
        throw new AppError({ code: 'NOT_FOUND', status: 404, message: '找不到交易' });
      }

      const category = await categoryRepoPrisma.findByIdForUser({
        userId,
        categoryId: input.categoryId,
      });

      if (!category || !category.isActive) {
        throw new AppError({
          code: 'NOT_FOUND',
          status: 404,
          message: '找不到類別',
        });
      }

      if (!isCategoryTypeCompatible({ categoryType: category.type, transactionType: input.type })) {
        throw new AppError({
          code: 'NOT_FOUND',
          status: 404,
          message: '找不到類別',
        });
      }

      const updated = await transactionRepoPrisma.update({
        transactionId: params.transactionId,
        userId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        note: input.note ?? null,
      });

      if (!updated) {
        throw new AppError({ code: 'NOT_FOUND', status: 404, message: '找不到交易' });
      }

      return {
        id: updated.id,
        type: updated.type,
        amount: updated.amount,
        categoryId: updated.categoryId,
        categoryName: updated.categoryName,
        date: formatDateOnly(updated.date),
        note: updated.note,
      };
    },
  );
}
