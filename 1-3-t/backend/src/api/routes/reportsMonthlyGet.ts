import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../middleware/requireAuth';
import { getMonthlyReport } from '../../domain/reports/monthlyReportService';

const QuerySchema = z.object({
  year: z.preprocess((v) => Number(v), z.number().int().min(2000)),
  month: z.preprocess((v) => Number(v), z.number().int().min(1).max(12)),
});

export async function registerReportsMonthlyGetRoute(app: FastifyInstance) {
  app.get(
    '/reports/monthly',
    {
      preHandler: requireAuth,
    },
    async (request) => {
      const query = QuerySchema.parse(request.query);
      const userId = request.auth!.user!.id;

      return getMonthlyReport({ userId, year: query.year, month: query.month });
    },
  );
}
