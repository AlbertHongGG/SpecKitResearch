import { requireRole } from '@/lib/auth/guards';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { listCourseReviews } from '@/services/adminRepo';

export const GET = withErrorHandling(async (_req, ctx: any) => {
  await requireRole(['admin']);
  const courseId = ctx.params.courseId as string;

  const reviews = await listCourseReviews(courseId);
  return ok({ reviews });
});
