import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../src/server/errors/errors';
import { createLessonRequestSchema } from '../../../../../../src/shared/schema/instructor';
import { normalizeLessonContent } from '../../../../../../src/use-cases/instructor/updateLesson';

function getSectionId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const sectionId = parts[parts.indexOf('sections') + 1];
  if (!sectionId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'sectionId required' });
  return sectionId;
}

async function assertCanAccessSection(params: { sectionId: string; userId: string; role: string }) {
  const section = await prisma.section.findUnique({ where: { id: params.sectionId }, select: { id: true, courseId: true } });
  if (!section) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到章節' });

  const course = await prisma.course.findUnique({ where: { id: section.courseId }, select: { id: true, instructorId: true, status: true } });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const isAuthor = params.userId === course.instructorId;
  if (!(params.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }
  return { section, course };
}

async function assertCanMutateSection(params: { sectionId: string; userId: string; role: string }) {
  const res = await assertCanAccessSection(params);
  if (res.course.status === 'submitted') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '送審中不可編輯課綱' });
  }
  return res;
}

export const GET = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const sectionId = getSectionId(req);

  await assertCanAccessSection({ sectionId, userId: user.id, role: user.role });

  const lessons = await prisma.lesson.findMany({
    where: { sectionId },
    orderBy: { order: 'asc' },
    select: { id: true, title: true, order: true, contentType: true, contentText: true, contentFileId: true, contentFileName: true },
  });

  return NextResponse.json({ lessons });
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const sectionId = getSectionId(req);

  await assertCanMutateSection({ sectionId, userId: user.id, role: user.role });

  const json = await req.json().catch(() => null);
  const parsed = createLessonRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const max = await prisma.lesson.aggregate({ where: { sectionId }, _max: { order: true } });
  const nextOrder = (max._max.order ?? 0) + 1;

  const nextType = parsed.data.contentType;
  const normalized = normalizeLessonContent({
    nextContentType: nextType,
    contentText: parsed.data.contentText,
    contentFileId: parsed.data.contentFileId,
    contentFileName: parsed.data.contentFileName,
  });

  const lesson = await prisma.lesson.create({
    data: {
      sectionId,
      title: parsed.data.title,
      order: nextOrder,
      contentType: normalized.contentType,
      contentText: normalized.contentType === 'text' ? normalized.contentText : null,
      contentFileId: normalized.contentType === 'text' ? null : normalized.contentFileId,
      contentFileName: normalized.contentType === 'pdf' ? normalized.contentFileName : null,
    },
    select: { id: true, title: true, order: true },
  });

  return NextResponse.json({ lesson }, { status: 201 });
});
