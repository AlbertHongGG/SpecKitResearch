import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../../src/server/errors/errors';
import { updateLessonRequestSchema } from '../../../../../../../src/shared/schema/instructor';
import { normalizeLessonContent } from '../../../../../../../src/use-cases/instructor/updateLesson';

function getParams(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const sectionId = parts[parts.indexOf('sections') + 1];
  const lessonId = parts[parts.indexOf('lessons') + 1];
  if (!sectionId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'sectionId required' });
  if (!lessonId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'lessonId required' });
  return { sectionId, lessonId };
}

async function assertCanEditLesson(params: { sectionId: string; lessonId: string; userId: string; role: string }) {
  const section = await prisma.section.findUnique({ where: { id: params.sectionId }, select: { id: true, courseId: true } });
  if (!section) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到章節' });

  const course = await prisma.course.findUnique({ where: { id: section.courseId }, select: { id: true, instructorId: true, status: true } });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId }, select: { id: true, sectionId: true, contentType: true } });
  if (!lesson || lesson.sectionId !== params.sectionId) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到單元' });

  const isAuthor = params.userId === course.instructorId;
  if (!(params.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }
  if (course.status === 'submitted') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '送審中不可編輯課綱' });
  }

  return { section, course, lesson };
}

export const PATCH = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const { sectionId, lessonId } = getParams(req);

  const { lesson } = await assertCanEditLesson({ sectionId, lessonId, userId: user.id, role: user.role });

  const json = await req.json().catch(() => null);
  const parsed = updateLessonRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const nextContentType = parsed.data.contentType ?? lesson.contentType;

  let contentUpdate: ReturnType<typeof normalizeLessonContent> | null = null;
  if (
    parsed.data.contentType != null ||
    parsed.data.contentText != null ||
    parsed.data.contentFileId != null ||
    parsed.data.contentFileName != null
  ) {
    let inferredName = parsed.data.contentFileName ?? null;
    if (!inferredName && parsed.data.contentFileId) {
      const f = await prisma.fileUpload.findUnique({ where: { id: parsed.data.contentFileId }, select: { originalName: true, mimeType: true } });
      if (f) inferredName = f.originalName;
      if (nextContentType === 'image' && f && !f.mimeType.startsWith('image/')) {
        throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '檔案不是圖片' });
      }
      if (nextContentType === 'pdf' && f && f.mimeType !== 'application/pdf') {
        throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '檔案不是 PDF' });
      }
    }

    contentUpdate = normalizeLessonContent({
      nextContentType,
      contentText: parsed.data.contentText,
      contentFileId: parsed.data.contentFileId,
      contentFileName: inferredName,
    });
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      contentType: nextContentType,
      contentText: contentUpdate?.contentType === 'text' ? contentUpdate.contentText : contentUpdate ? null : undefined,
      contentFileId: contentUpdate?.contentType === 'text' ? null : contentUpdate ? contentUpdate.contentFileId : undefined,
      contentFileName: contentUpdate?.contentType === 'pdf' ? contentUpdate.contentFileName : contentUpdate ? null : undefined,
    },
  });

  return NextResponse.json({ ok: true });
});

async function resequenceLessons(sectionId: string) {
  const lessons = await prisma.lesson.findMany({ where: { sectionId }, orderBy: { order: 'asc' }, select: { id: true } });
  await prisma.$transaction(lessons.map((l, idx) => prisma.lesson.update({ where: { id: l.id }, data: { order: idx + 1 } })));
}

export const DELETE = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const { sectionId, lessonId } = getParams(req);

  await assertCanEditLesson({ sectionId, lessonId, userId: user.id, role: user.role });

  await prisma.lesson.delete({ where: { id: lessonId } });
  await resequenceLessons(sectionId);

  return NextResponse.json({ ok: true });
});
