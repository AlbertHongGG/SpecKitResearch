import type { FastifyInstance } from 'fastify';

import { registerAdminListFlowsRoute } from './listFlows.js';
import { registerAdminUpsertFlowRoute } from './upsertFlow.js';
import { registerAdminDeactivateFlowRoute } from './deactivateFlow.js';
import { registerAdminListReviewersRoute } from './listReviewers.js';

export async function registerAdminFlowsRoutes(app: FastifyInstance): Promise<void> {
  await registerAdminListFlowsRoute(app);
  await registerAdminUpsertFlowRoute(app);
  await registerAdminDeactivateFlowRoute(app);
  await registerAdminListReviewersRoute(app);
}
