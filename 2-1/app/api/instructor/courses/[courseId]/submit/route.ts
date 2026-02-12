import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { assertCourseTransition } from '@/lib/courses/stateMachine';
import { assertLessonContentConsistency } from '@/lib/courses/lessonContentValidation';
import { setCourseStatus } from '@/services/instructorRepo';

export const POST = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { sections: { include: { lessons: true } } },
  });
  if (!course) throw AppError.notFound();
  if (user.role !== 'admin' && course.instructorId !== user.id) throw AppError.notFound();

  if (!assertCourseTransition(course.status as any, 'submitted')) {
    throw AppError.badRequest('非法狀態轉換');
  }

  if (!course.title?.trim() || !course.description?.trim()) {
    throw AppError.badRequest('標題/描述必填');
  }

  if (!course.sections.length) throw AppError.badRequest('至少需要一個章節');
  const allLessons = course.sections.flatMap((s) => s.lessons);
  if (!allLessons.length) throw AppError.badRequest('至少需要一個單元');

  for (const lesson of allLessons) {
    assertLessonContentConsistency({
      contentType: lesson.contentType as any,
      contentText: lesson.contentText,
      contentImageFileId: lesson.contentImageFileId,
      contentPdfFileId: lesson.contentPdfFileId,
    });
  }

  const updated = await setCourseStatus(courseId, 'submitted');
  return ok({ courseId: updated.id, status: updated.status });
});
