import { NextResponse, type NextRequest } from 'next/server';

import { withRouteHandler } from '../../../../../src/server/http/routeHandler';
import { requireAuth } from '../../../../../src/server/guards/auth';
import { prisma } from '../../../../../src/server/db/prisma';
import { HttpError } from '../../../../../src/server/errors/errors';
import { markLessonProgressRequestSchema } from '../../../../../src/shared/schema/api';
import { canAccessCourseContent, type ViewerContext } from '../../../../../src/domain/accessControl';

export const PUT = withRouteHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const lessonId = req.nextUrl.pathname.split('/').slice(-2)[0];
  if (!lessonId) {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'lessonId required' });
  }

  const json = await req.json().catch(() => null);
  const parsed = markLessonProgressRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '輸入格式錯誤',
      details: parsed.error.flatten(),
    });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      section: { select: { course: { select: { id: true, instructorId: true } } } },
    },
  });

  if (!lesson) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到單元' });
  }

  const course = lesson.section.course;

  const isPurchased =
    (await prisma.purchase.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      select: { id: true },
    })) != null;

  const viewer: ViewerContext = { isAuthenticated: true, userId: user.id, role: user.role };

  const decision = canAccessCourseContent({
    courseInstructorId: course.instructorId,
    viewer,
    isPurchased,
  });

  if (decision !== 'ALLOW') {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '沒有權限存取內容' });
  }

  const now = new Date();
  const isCompleted = parsed.data.isCompleted;

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    update: {
      isCompleted,
      completedAt: isCompleted ? now : null,
    },
    create: {
      userId: user.id,
      lessonId: lesson.id,
      isCompleted,
      completedAt: isCompleted ? now : null,
    },
    select: { lessonId: true, isCompleted: true, completedAt: true },
  });

  return NextResponse.json({
    progress: {
      lessonId: progress.lessonId,
      isCompleted: progress.isCompleted,
      completedAt: progress.completedAt?.toISOString() ?? null,
    },
  });
});
