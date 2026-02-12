import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AppError } from '../http/errors';
import { requireAuth } from '../middleware/requireAuth';
import { transactionRepoPrisma } from '../../infra/db/transactionRepoPrisma';

const ParamsSchema = z.object({
  transactionId: z.string().uuid(),
});

export async function registerTransactionsDeleteRoute(app: FastifyInstance) {
  app.delete(
    '/transactions/:transactionId',
    {
      preHandler: requireAuth,
    },
    async (request) => {
      const params = ParamsSchema.parse(request.params);
      const userId = request.auth!.user!.id;

      const existing = await transactionRepoPrisma.findById({ transactionId: params.transactionId });
      if (!existing) {
        throw new AppError({ code: 'NOT_FOUND', status: 404, message: '找不到交易' });
      }

      if (existing.userId !== userId) {
        throw new AppError({ code: 'FORBIDDEN', status: 403, message: '無權限' });
      }

      await transactionRepoPrisma.delete({ transactionId: params.transactionId });

      return { ok: true };
    },
  );
}
