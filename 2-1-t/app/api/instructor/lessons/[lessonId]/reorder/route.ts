import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../src/server/errors/errors';
import { reorderRequestSchema } from '../../../../../../src/shared/schema/instructor';

function getLessonId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const lessonId = parts[parts.indexOf('lessons') + 1];
  if (!lessonId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'lessonId required' });
  return lessonId;
}

export const POST = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const lessonId = getLessonId(req);

  const json = await req.json().catch(() => null);
  const parsed = reorderRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, sectionId: true } });
  if (!lesson) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到單元' });

  const section = await prisma.section.findUnique({ where: { id: lesson.sectionId }, select: { courseId: true } });
  if (!section) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到章節' });

  const course = await prisma.course.findUnique({ where: { id: section.courseId }, select: { instructorId: true, status: true } });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const isAuthor = user.id === course.instructorId;
  if (!(user.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }
  if (course.status === 'submitted') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '送審中不可編輯課綱' });
  }

  const lessons = await prisma.lesson.findMany({ where: { sectionId: lesson.sectionId }, orderBy: { order: 'asc' }, select: { id: true } });
  const ids = lessons.map((l) => l.id);
  const fromIdx = ids.indexOf(lessonId);
  if (fromIdx === -1) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到單元' });

  const toIdx = Math.max(0, Math.min(ids.length - 1, parsed.data.order - 1));
  ids.splice(fromIdx, 1);
  ids.splice(toIdx, 0, lessonId);

  await prisma.$transaction(ids.map((id, idx) => prisma.lesson.update({ where: { id }, data: { order: idx + 1 } })));

  return NextResponse.json({ ok: true });
});
