import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../middleware/requireAuth';
import { exportMonthlyTransactionsCsv } from '../../domain/reports/monthlyCsvExport';

const QuerySchema = z.object({
  year: z.preprocess((v) => Number(v), z.number().int().min(2000)),
  month: z.preprocess((v) => Number(v), z.number().int().min(1).max(12)),
});

export async function registerReportsMonthlyCsvRoute(app: FastifyInstance) {
  app.get(
    '/reports/monthly/csv',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const query = QuerySchema.parse(request.query);
      const userId = request.auth!.user!.id;

      const { filename, csv } = await exportMonthlyTransactionsCsv({
        userId,
        year: query.year,
        month: query.month,
      });

      reply.header('content-type', 'text/csv; charset=utf-8');
      reply.header('content-disposition', `attachment; filename="${filename}"`);
      reply.header('cache-control', 'no-store');

      return csv;
    },
  );
}
