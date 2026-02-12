import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../../lib/rbac.js';
import { notFound } from '../../lib/httpError.js';
import { prisma } from '../../repo/prisma.js';
import { submitDocument } from '../../domain/usecases/submitDocument.js';

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({ flowTemplateId: z.string().uuid() });

type Params = z.infer<typeof ParamsSchema>;
type Body = z.infer<typeof BodySchema>;

export async function registerSubmitDocumentRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Params: Params; Body: Body }>(
    '/documents/:id/submit',
    {
      preHandler: requireRole(['User', 'Admin']),
    },
    async (request) => {
      const user = request.currentUser!;
      const { id } = ParamsSchema.parse(request.params);
      const body = BodySchema.parse(request.body);

      const where = user.role === 'Admin' ? { id } : { id, ownerId: user.id };
      const exists = await prisma.document.findFirst({ where, select: { id: true } });
      if (!exists) throw notFound();

      return submitDocument({
        actorId: user.id,
        documentId: id,
        flowTemplateId: body.flowTemplateId,
        requestId: request.id,
      });
    },
  );
}
