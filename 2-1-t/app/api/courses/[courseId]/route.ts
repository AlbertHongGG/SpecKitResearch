import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../src/server/db/prisma';
import { HttpError } from '../../../../src/server/errors/errors';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { getCurrentUser } from '../../../../src/server/session/getCurrentUser';
import { canViewCourseMarketing, type ViewerContext } from '../../../../src/domain/accessControl';

export const GET = withRouteHandler(async (req: NextRequest) => {
  const courseId = req.nextUrl.pathname.split('/').pop();
  if (!courseId) {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'courseId required' });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      coverImageUrl: true,
      status: true,
      instructorId: true,
      category: { select: { id: true, name: true } },
      instructor: { select: { id: true, email: true } },
      courseTags: { select: { tag: { select: { id: true, name: true } } } },
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: { title: true, order: true },
          },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });
  }

  const user = await getCurrentUser(req);
  const viewer: ViewerContext = user
    ? { isAuthenticated: true, userId: user.id, role: user.role }
    : { isAuthenticated: false };

  const decision = canViewCourseMarketing({
    courseStatus: course.status,
    courseInstructorId: course.instructorId,
    viewer,
  });

  if (decision !== 'ALLOW') {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });
  }

  const isPurchased =
    user != null
      ? (await prisma.purchase.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          select: { id: true },
        })) != null
      : false;

  const viewerFlags = {
    isAuthenticated: user != null,
    role: user?.role ?? null,
    isAuthor: user?.id === course.instructorId,
    isPurchased,
  };

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      coverImageUrl: course.coverImageUrl,
      status: course.status,
      category: course.category,
      tags: course.courseTags.map((ct) => ct.tag),
      instructor: course.instructor,
    },
    outline: course.sections,
    viewerFlags,
  });
});
