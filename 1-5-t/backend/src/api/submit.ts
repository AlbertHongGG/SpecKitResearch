import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SubmitForApprovalRequestSchema } from '@internal/contracts';
import { parseBody, parseParams } from './validation.js';
import { requireAuthenticatedUser } from '../auth/session.js';
import { submitService } from '../services/submitService.js';

const DocumentIdParamsSchema = z.object({ documentId: z.string().uuid() });

export async function registerSubmitRoutes(app: FastifyInstance) {
  app.post('/:documentId/submit', async (request) => {
    const user = requireAuthenticatedUser(request);
    const { documentId } = parseParams(request, DocumentIdParamsSchema);
    const body = parseBody(request, SubmitForApprovalRequestSchema);
    await submitService.submitForApproval({ user, documentId, templateId: body.templateId });
    return { ok: true };
  });
}
