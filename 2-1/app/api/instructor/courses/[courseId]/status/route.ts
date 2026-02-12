import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { assertCourseTransition } from '@/lib/courses/stateMachine';
import { instructorSetPublishStatusBodySchema } from '@/lib/validators/instructor';
import { setCourseStatus } from '@/services/instructorRepo';

export const POST = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true, status: true } });
  if (!course) throw AppError.notFound();
  if (user.role !== 'admin' && course.instructorId !== user.id) throw AppError.notFound();

  const body = await parseJson(req, instructorSetPublishStatusBodySchema);

  if (!assertCourseTransition(course.status as any, body.toStatus as any)) {
    throw AppError.badRequest('非法狀態轉換');
  }

  const updated = await setCourseStatus(courseId, body.toStatus);
  return ok({ courseId: updated.id, status: updated.status });
});
