import type { FastifyInstance } from 'fastify';

import { AppError } from '../http/errors';
import { requireAuth } from '../middleware/requireAuth';
import { categoryRepoPrisma } from '../../infra/db/categoryRepoPrisma';
import { transactionRepoPrisma } from '../../infra/db/transactionRepoPrisma';
import { isCategoryTypeCompatible } from '../../domain/categories/categoryRules';
import {
  TransactionCreateSchema,
  formatDateOnly,
} from '../../domain/transactions/transactionRules';

export async function registerTransactionsCreateRoute(app: FastifyInstance) {
  app.post(
    '/transactions',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const userId = request.auth!.user!.id;

      const input = TransactionCreateSchema.parse(request.body);

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

      if (
        !isCategoryTypeCompatible({
          categoryType: category.type,
          transactionType: input.type,
        })
      ) {
        throw new AppError({
          code: 'NOT_FOUND',
          status: 404,
          message: '找不到類別',
        });
      }

      const tx = await transactionRepoPrisma.create({
        userId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        note: input.note ?? null,
      });

      reply.status(201).send({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        date: formatDateOnly(tx.date),
        note: tx.note,
      });
    },
  );
}
