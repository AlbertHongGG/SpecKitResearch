import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { created } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { assertLessonContentConsistency } from '@/lib/courses/lessonContentValidation';
import { createLessonBodySchema } from '@/lib/validators/curriculum';
import { createLesson } from '@/services/instructorRepo';

export const POST = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const sectionId = ctx.params.sectionId;

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { id: true, instructorId: true, status: true } } },
  });
  if (!section) throw AppError.notFound();
  if (user.role !== 'admin' && section.course.instructorId !== user.id) throw AppError.notFound();
  if (user.role !== 'admin' && !['draft', 'rejected'].includes(section.course.status)) throw AppError.badRequest('目前狀態不可編輯課綱');

  const body = await parseJson(req, createLessonBodySchema);
  assertLessonContentConsistency(body);

  const existing = await prisma.lesson.findFirst({ where: { sectionId, order: body.order } });
  if (existing) throw AppError.badRequest('單元排序衝突');

  const lesson = await createLesson(sectionId, {
    title: body.title,
    order: body.order,
    contentType: body.contentType,
    contentText: body.contentText ?? null,
    contentImageFileId: body.contentImageFileId ?? null,
    contentPdfFileId: body.contentPdfFileId ?? null,
  });

  return created({ lessonId: lesson.id });
});
