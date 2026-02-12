import { NextResponse, type NextRequest } from 'next/server';

import { Prisma } from '@prisma/client';

import { prisma } from '../../../src/server/db/prisma';
import { withRouteHandler } from '../../../src/server/http/routeHandler';
import { requireAuth } from '../../../src/server/guards/auth';

type CountRow = { courseId: string; n: number | bigint };

export const GET = withRouteHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          price: true,
          coverImageUrl: true,
          status: true,
          category: { select: { id: true, name: true } },
          instructor: { select: { id: true, email: true } },
        },
      },
    },
  });

  const courseIds = purchases.map((p) => p.course.id);
  if (courseIds.length === 0) {
    return NextResponse.json({ courses: [] });
  }

  const totalLessonsRows = await prisma.$queryRaw<CountRow[]>`
    SELECT s.courseId as courseId, COUNT(l.id) as n
    FROM Section s
    JOIN Lesson l ON l.sectionId = s.id
    WHERE s.courseId IN (${Prisma.join(courseIds)})
    GROUP BY s.courseId;
  `;

  const completedLessonsRows = await prisma.$queryRaw<CountRow[]>`
    SELECT s.courseId as courseId, COUNT(lp.id) as n
    FROM LessonProgress lp
    JOIN Lesson l ON lp.lessonId = l.id
    JOIN Section s ON l.sectionId = s.id
    WHERE lp.userId = ${user.id} AND lp.isCompleted = 1 AND s.courseId IN (${Prisma.join(courseIds)})
    GROUP BY s.courseId;
  `;

  const totals = new Map(totalLessonsRows.map((r) => [r.courseId, Number(r.n)]));
  const completes = new Map(completedLessonsRows.map((r) => [r.courseId, Number(r.n)]));

  const courses = purchases.map((p) => {
    const totalLessons = totals.get(p.course.id) ?? 0;
    const completedLessons = completes.get(p.course.id) ?? 0;
    return {
      ...p.course,
      progress: { completedLessons, totalLessons },
    };
  });

  return NextResponse.json({ courses });
});
