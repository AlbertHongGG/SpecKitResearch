import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../src/server/guards/auth';

export const GET = withRouteHandler(async (req: NextRequest) => {
  await requireRole(req, ['admin']);

  const courses = await prisma.course.findMany({
    where: { status: 'submitted' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      coverImageUrl: true,
      status: true,
      category: { select: { id: true, name: true } },
      instructor: { select: { id: true, email: true } },
      courseTags: { select: { tag: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      price: c.price,
      coverImageUrl: c.coverImageUrl,
      status: c.status,
      category: c.category,
      instructor: c.instructor,
      tags: c.courseTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name })),
    })),
  });
});
