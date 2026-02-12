import type { FastifyInstance } from 'fastify';

import { Role } from '@prisma/client';
import { requireRole } from '../../lib/rbac.js';
import { prisma } from '../../repo/prisma.js';

export async function registerAdminListReviewersRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/admin/reviewers',
    {
      preHandler: requireRole(['Admin']),
    },
    async () => {
      const reviewers = await prisma.user.findMany({
        where: { role: Role.Reviewer },
        orderBy: { email: 'asc' },
        select: { id: true, email: true },
      });
      return { reviewers };
    },
  );
}
