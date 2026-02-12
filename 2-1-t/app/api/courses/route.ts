import { NextResponse } from 'next/server';

import { prisma } from '../../../src/server/db/prisma';
import { withRouteHandler } from '../../../src/server/http/routeHandler';

export const GET = withRouteHandler(async () => {
  const courses = await prisma.course.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      price: true,
      coverImageUrl: true,
      category: { select: { id: true, name: true } },
      instructor: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json({ courses });
});
