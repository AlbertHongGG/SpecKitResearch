import type { FastifyInstance } from 'fastify';

import { requireRole } from '../../lib/rbac.js';
import { prisma } from '../../repo/prisma.js';

export async function registerAdminListFlowsRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/admin/flows',
    {
      preHandler: requireRole(['Admin']),
    },
    async () => {
      const flows = await prisma.approvalFlowTemplate.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          steps: {
            orderBy: { orderIndex: 'asc' },
            include: {
              assignees: { include: { reviewer: { select: { id: true, email: true } } } },
            },
          },
        },
      });

      return {
        flows: flows.map((f) => ({
          id: f.id,
          name: f.name,
          isActive: f.isActive,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
          steps: f.steps.map((s) => ({
            id: s.id,
            stepKey: s.stepKey,
            orderIndex: s.orderIndex,
            mode: s.mode,
            assignees: s.assignees.map((a) => ({
              reviewerId: a.reviewerId,
              reviewerEmail: a.reviewer.email,
            })),
          })),
        })),
      };
    },
  );
}
