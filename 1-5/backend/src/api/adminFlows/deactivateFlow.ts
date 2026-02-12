import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../../lib/rbac.js';
import { notFound } from '../../lib/httpError.js';
import { prisma } from '../../repo/prisma.js';
import { appendAuditLog } from '../../repo/auditRepo.js';
import { AuditActions, buildAuditEvent } from '../../domain/auditEvents.js';

const ParamsSchema = z.object({ id: z.string().uuid() });
type Params = z.infer<typeof ParamsSchema>;

export async function registerAdminDeactivateFlowRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Params: Params }>(
    '/admin/flows/:id/deactivate',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = request.currentUser!;
      const { id } = ParamsSchema.parse(request.params);

      const exists = await prisma.approvalFlowTemplate.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw notFound();

      const updated = await prisma.approvalFlowTemplate.update({
        where: { id },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });

      await appendAuditLog(
        buildAuditEvent({
          actorId: user.id,
          requestId: request.id,
          action: AuditActions.FlowDeactivated,
          entityType: 'ApprovalFlowTemplate',
          entityId: updated.id,
          metadata: { isActive: updated.isActive },
        }),
      );

      return { templateId: updated.id, isActive: updated.isActive };
    },
  );
}
