import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { requireAuth } from '../../../../src/server/guards/auth';
import { HttpError } from '../../../../src/server/errors/errors';
import { canAccessCourseContent, type ViewerContext } from '../../../../src/domain/accessControl';

export const GET = withRouteHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const courseId = req.nextUrl.pathname.split('/').pop();
  if (!courseId) {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'courseId required' });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      instructorId: true,
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              order: true,
              contentType: true,
              contentText: true,
              contentFileId: true,
              contentFileName: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });
  }

  const viewer: ViewerContext = { isAuthenticated: true, userId: user.id, role: user.role };

  const isPurchased =
    (await prisma.purchase.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      select: { id: true },
    })) != null;

  const decision = canAccessCourseContent({
    courseInstructorId: course.instructorId,
    viewer,
    isPurchased,
  });

  if (decision !== 'ALLOW') {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '沒有權限存取內容' });
  }

  const lessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId: user.id, lessonId: { in: lessonIds } },
    select: { lessonId: true, isCompleted: true, completedAt: true },
  });
  const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

  const sections = course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    lessons: section.lessons.map((lesson) => {
      const p = progressMap.get(lesson.id);
      const url = lesson.contentFileId ? `/api/files/${lesson.contentFileId}` : null;

      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        contentType: lesson.contentType,
        contentText: lesson.contentType === 'text' ? lesson.contentText : null,
        contentImageUrl: lesson.contentType === 'image' ? url : null,
        contentFileUrl: lesson.contentType === 'pdf' ? url : null,
        contentFileName: lesson.contentType === 'pdf' ? lesson.contentFileName : null,
        isCompleted: p?.isCompleted ?? false,
        completedAt: p?.completedAt?.toISOString() ?? null,
      };
    }),
  }));

  return NextResponse.json({
    course: { id: course.id, title: course.title },
    sections,
  });
});
