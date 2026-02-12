import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../src/server/errors/errors';
import { transitionCourseStatus } from '../../../../../../src/domain/courseStatus';

function getCourseId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const courseId = parts[parts.indexOf('courses') + 1];
  if (!courseId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'courseId required' });
  return courseId;
}

export const POST = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const courseId = getCourseId(req);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, status: true, publishedAt: true, archivedAt: true, rejectedReason: true },
  });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const isAuthor = user.id === course.instructorId;
  if (!(user.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }

  const update = transitionCourseStatus({
    current: {
      status: course.status,
      publishedAt: course.publishedAt,
      archivedAt: course.archivedAt,
      rejectedReason: course.rejectedReason,
    },
    action: { type: 'SUBMIT' },
  });

  await prisma.course.update({ where: { id: courseId }, data: update });
  return NextResponse.json({ ok: true });
});
