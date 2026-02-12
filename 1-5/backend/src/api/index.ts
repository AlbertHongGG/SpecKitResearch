import type { FastifyInstance } from 'fastify';

import { registerAuthRoutes } from './auth/index.js';
import { registerDocumentsRoutes } from './documents/index.js';
import { registerFlowsRoutes } from './flows/index.js';
import { registerAttachmentsRoutes } from './attachments/index.js';
import { registerReviewsRoutes } from './reviews/index.js';
import { registerAdminFlowsRoutes } from './adminFlows/index.js';
import { enforceReadOnlyMode } from '../lib/readOnlyMiddleware.js';
import { requireCsrf } from '../lib/csrf.js';

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request) => {
    enforceReadOnlyMode(request);

    // CSRF for state-changing routes. Login is exempt.
    const routeUrl = request.routeOptions?.url;
    if (routeUrl === '/auth/login') return;
    requireCsrf(request);
  });

  await registerAuthRoutes(app);
  await registerDocumentsRoutes(app);
  await registerFlowsRoutes(app);
  await registerAttachmentsRoutes(app);
  await registerReviewsRoutes(app);
  await registerAdminFlowsRoutes(app);
}


