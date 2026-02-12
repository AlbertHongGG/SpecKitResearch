import type { FastifyInstance } from 'fastify';

import { registerListActiveFlowsRoute } from './listActiveFlows.js';

export async function registerFlowsRoutes(app: FastifyInstance): Promise<void> {
  await registerListActiveFlowsRoute(app);
}
