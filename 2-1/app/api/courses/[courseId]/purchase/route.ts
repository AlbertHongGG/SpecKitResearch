import { currentUserOrThrow } from '@/lib/auth/currentUser';
import { canViewMarketing, shouldHideMarketingAs404 } from '@/lib/access/courseAccess';
import { AppError } from '@/lib/errors/AppError';
import { created } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseParams } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { purchaseParamsSchema } from '@/lib/validators/purchases';
import { getCourseById } from '@/services/courseRepo';
import { purchaseCourse } from '@/services/purchaseRepo';

export const POST = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await currentUserOrThrow();
  const { params } = ctx as { params: unknown };
  const { courseId } = parseParams(params, purchaseParamsSchema);

  const course = await getCourseById(courseId);
  if (!course) throw AppError.notFound('找不到課程');

  const isAuthor = user.id === course.instructorId;
  const role = user.role;

  if (shouldHideMarketingAs404({ courseStatus: course.status as any, isAuthor, role })) {
    throw AppError.notFound('找不到課程');
  }

  if (!canViewMarketing({ courseStatus: course.status as any, isAuthor, role })) {
    throw AppError.notFound('找不到課程');
  }

  if (course.status !== 'published') {
    throw AppError.badRequest('只有已上架課程可以購買');
  }

  const purchase = await purchaseCourse(user.id, courseId);
  return created({
    purchaseId: purchase.id,
    courseId: purchase.courseId,
    userId: purchase.userId,
  });
});
