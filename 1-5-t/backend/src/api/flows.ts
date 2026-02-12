import type { FastifyInstance } from 'fastify';
import { requireAuthenticatedUser } from '../auth/session.js';
import { flowQueryService } from '../services/flowQueryService.js';

export async function registerFlowsRoutes(app: FastifyInstance) {
  app.get('/active', async (request) => {
    requireAuthenticatedUser(request);
    const templates = await flowQueryService.listActiveTemplates();
    return { templates };
  });
}
