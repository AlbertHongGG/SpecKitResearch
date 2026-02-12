import { currentUserOrThrow } from '@/lib/auth/currentUser';
import { canReadContent } from '@/lib/access/courseAccess';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson, parseParams } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { lessonProgressParamsSchema, setProgressBodySchema } from '@/lib/validators/content';
import { getLessonById } from '@/services/courseRepo';
import { setLessonCompletion } from '@/services/progressRepo';
import { isPurchased } from '@/services/purchaseRepo';

export const PUT = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await currentUserOrThrow();
  const { params } = ctx as { params: unknown };
  const { lessonId } = parseParams(params, lessonProgressParamsSchema);

  const lesson = await getLessonById(lessonId);
  if (!lesson) throw AppError.notFound('找不到單元');

  const courseId = lesson.section.courseId;
  const purchased = await isPurchased(user.id, courseId);
  const isAuthor = user.id === lesson.section.course.instructorId;
  const role = user.role;

  if (!canReadContent({ isAuthor, isPurchased: purchased, role })) {
    throw AppError.forbidden('尚未購買');
  }

  const body = await parseJson(req, setProgressBodySchema);
  const progress = await setLessonCompletion(user.id, lessonId, body.isCompleted);

  return ok({
    lessonId: progress.lessonId,
    isCompleted: progress.isCompleted,
    completedAt: progress.completedAt,
  });
});
