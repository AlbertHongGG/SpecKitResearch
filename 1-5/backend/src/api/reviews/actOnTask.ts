import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../../lib/rbac.js';
import { ActOnTaskSchema, type ActOnTaskBody } from './actOnTask.schema.js';
import { actOnReviewTask } from '../../domain/usecases/actOnReviewTask.js';

const ParamsSchema = z.object({ taskId: z.string().uuid() });
type Params = z.infer<typeof ParamsSchema>;

export async function registerActOnTaskRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Params: Params; Body: ActOnTaskBody }>(
    '/review-tasks/:taskId/action',
    {
      preHandler: requireRole(['Reviewer']),
    },
    async (request) => {
      const user = request.currentUser!;
      const { taskId } = ParamsSchema.parse(request.params);
      const body = ActOnTaskSchema.parse(request.body);

      return actOnReviewTask({
        actorId: user.id,
        taskId,
        action: body.action,
        reason: body.reason,
        requestId: request.id,
      });
    },
  );
}
