import type { FastifyInstance } from 'fastify';

import { registerListMyPendingTasksRoute } from './listMyPendingTasks.js';
import { registerActOnTaskRoute } from './actOnTask.js';

export async function registerReviewsRoutes(app: FastifyInstance): Promise<void> {
  await registerListMyPendingTasksRoute(app);
  await registerActOnTaskRoute(app);
}
