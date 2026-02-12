import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../middleware/requireAuth';
import { transactionRepoPrisma } from '../../infra/db/transactionRepoPrisma';
import { formatDateOnly } from '../../domain/transactions/transactionRules';

const QuerySchema = z.object({
  page: z
    .preprocess((v) => (v === undefined ? 1 : Number(v)), z.number().int().min(1))
    .optional(),
  pageSize: z
    .preprocess((v) => (v === undefined ? 30 : Number(v)), z.number().int().min(1).max(100))
    .optional(),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v))
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v))
    .optional(),
});

export async function registerTransactionsListRoute(app: FastifyInstance) {
  app.get(
    '/transactions',
    {
      preHandler: requireAuth,
    },
    async (request) => {
      const query = QuerySchema.parse(request.query);
      const userId = request.auth!.user!.id;

      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 30;

      const { items, total } = await transactionRepoPrisma.listByUser({
        userId,
        page,
        pageSize,
        fromDate: query.fromDate,
        toDate: query.toDate,
      });

      return {
        items: items.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          categoryName: t.categoryName,
          date: formatDateOnly(t.date),
          note: t.note,
        })),
        page,
        pageSize,
        total,
      };
    },
  );
}
