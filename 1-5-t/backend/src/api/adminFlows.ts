import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UpsertFlowTemplateRequestSchema } from '@internal/contracts';
import { parseBody, parseParams } from './validation.js';
import { requireAuthenticatedUser } from '../auth/session.js';
import { requireRole } from '../auth/rbac.js';
import { adminFlowService } from '../services/adminFlowService.js';

const TemplateIdParamsSchema = z.object({ templateId: z.string().uuid() });

export async function registerAdminFlowsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      requireAuthenticatedUser(request);
      const templates = await adminFlowService.listTemplates();
      return { templates };
    },
  );

  app.post(
    '/',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = requireAuthenticatedUser(request);
      const body = parseBody(request, UpsertFlowTemplateRequestSchema);
      const created = await adminFlowService.upsertTemplate({
        user,
        name: body.name,
        isActive: body.isActive,
        steps: body.steps,
      });
      return { templateId: created.id };
    },
  );

  app.put(
    '/:templateId',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = requireAuthenticatedUser(request);
      const { templateId } = parseParams(request, TemplateIdParamsSchema);
      const body = parseBody(request, UpsertFlowTemplateRequestSchema);
      const updated = await adminFlowService.upsertTemplate({
        user,
        templateId,
        name: body.name,
        isActive: body.isActive,
        steps: body.steps,
      });
      return { templateId: updated.id };
    },
  );

  app.post(
    '/:templateId/deactivate',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = requireAuthenticatedUser(request);
      const { templateId } = parseParams(request, TemplateIdParamsSchema);
      return adminFlowService.deactivateTemplate({ user, templateId });
    },
  );
}
