import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RejectTaskRequestSchema } from '@internal/contracts';
import { parseBody, parseParams } from './validation.js';
import { requireAuthenticatedUser } from '../auth/session.js';
import { reviewService } from '../services/reviewService.js';

const TaskIdParamsSchema = z.object({ reviewTaskId: z.string().uuid() });

export async function registerReviewsRoutes(app: FastifyInstance) {
  app.get('/tasks', async (request) => {
    const user = requireAuthenticatedUser(request);
    const tasks = await reviewService.listMyPending(user);
    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        documentId: t.documentId,
        documentTitle: t.document.title,
        stepKey: t.stepKey,
        mode: t.mode,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  });

  app.post('/tasks/:reviewTaskId/approve', async (request) => {
    const user = requireAuthenticatedUser(request);
    const { reviewTaskId } = parseParams(request, TaskIdParamsSchema);
    return reviewService.approve({ user, reviewTaskId });
  });

  app.post('/tasks/:reviewTaskId/reject', async (request) => {
    const user = requireAuthenticatedUser(request);
    const { reviewTaskId } = parseParams(request, TaskIdParamsSchema);
    const body = parseBody(request, RejectTaskRequestSchema);
    return reviewService.reject({ user, reviewTaskId, reason: body.reason });
  });
}
