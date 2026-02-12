import { NextResponse } from 'next/server';

import { prisma } from '../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';

export const GET = withRouteHandler(async () => {
  const tags = await prisma.tag.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, isActive: true },
  });

  return NextResponse.json({ tags });
});
