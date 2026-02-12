import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { assertLessonContentConsistency } from '@/lib/courses/lessonContentValidation';
import { updateLessonBodySchema } from '@/lib/validators/curriculum';
import { deleteLesson, updateLesson } from '@/services/instructorRepo';

async function requireManagedLesson(lessonId: string, user: { id: string; role: string }) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { course: { select: { instructorId: true, status: true } } } } },
  });
  if (!lesson) throw AppError.notFound();
  if (user.role !== 'admin' && lesson.section.course.instructorId !== user.id) throw AppError.notFound();
  if (user.role !== 'admin' && !['draft', 'rejected'].includes(lesson.section.course.status)) {
    throw AppError.badRequest('目前狀態不可編輯課綱');
  }
  return lesson;
}

export const PATCH = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const lessonId = ctx.params.lessonId;

  const existing = await requireManagedLesson(lessonId, user);
  const body = await parseJson(req, updateLessonBodySchema);

  const contentType = body.contentType ?? (existing.contentType as any);
  assertLessonContentConsistency({
    contentType,
    contentText: body.contentText ?? existing.contentText,
    contentImageFileId: body.contentImageFileId ?? existing.contentImageFileId,
    contentPdfFileId: body.contentPdfFileId ?? existing.contentPdfFileId,
  });

  if (body.order !== undefined) {
    const conflict = await prisma.lesson.findFirst({
      where: { sectionId: existing.sectionId, order: body.order, NOT: { id: lessonId } },
      select: { id: true },
    });
    if (conflict) throw AppError.badRequest('單元排序衝突');
  }

  const updated = await updateLesson(lessonId, {
    title: body.title,
    order: body.order,
    contentType: body.contentType,
    contentText: body.contentText,
    contentImageFileId: body.contentImageFileId,
    contentPdfFileId: body.contentPdfFileId,
  });

  return ok({ lesson: updated });
});

export const DELETE = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const lessonId = ctx.params.lessonId;

  await requireManagedLesson(lessonId, user);
  await deleteLesson(lessonId);

  return ok({ deleted: true });
});
