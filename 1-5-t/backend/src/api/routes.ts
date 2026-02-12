import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.js';
import { registerDocumentsRoutes } from './documents.js';
import { registerAttachmentsRoutes } from './attachments.js';
import { registerSubmitRoutes } from './submit.js';
import { registerFlowsRoutes } from './flows.js';
import { registerReviewsRoutes } from './reviews.js';
import { registerAdminFlowsRoutes } from './adminFlows.js';
import { registerAdminUsersRoutes } from './adminUsers.js';
import { registerArchiveRoutes } from './archive.js';

export async function registerApiRoutes(app: FastifyInstance) {
  await app.register(registerAuthRoutes, { prefix: '/api/auth' });
  await app.register(registerDocumentsRoutes, { prefix: '/api/documents' });
  await app.register(registerAttachmentsRoutes, { prefix: '/api/documents' });
  await app.register(registerSubmitRoutes, { prefix: '/api/documents' });
  await app.register(registerArchiveRoutes, { prefix: '/api/documents' });
  await app.register(registerFlowsRoutes, { prefix: '/api/flows' });
  await app.register(registerReviewsRoutes, { prefix: '/api/reviews' });
  await app.register(registerAdminFlowsRoutes, { prefix: '/api/admin/flows' });
  await app.register(registerAdminUsersRoutes, { prefix: '/api/admin/users' });
}
