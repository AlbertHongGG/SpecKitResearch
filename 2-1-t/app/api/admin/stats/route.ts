import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../src/server/guards/auth';

export const GET = withRouteHandler(async (req: NextRequest) => {
  await requireRole(req, ['admin']);

  const [usersTotal, purchasesTotal, coursesByStatus] = await Promise.all([
    prisma.user.count(),
    prisma.purchase.count(),
    prisma.course.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const byStatus = { draft: 0, submitted: 0, published: 0, rejected: 0, archived: 0 };
  for (const row of coursesByStatus) {
    byStatus[row.status] = row._count._all;
  }

  return NextResponse.json({
    counts: {
      usersTotal,
      purchasesTotal,
      coursesByStatus: byStatus,
    },
  });
});
