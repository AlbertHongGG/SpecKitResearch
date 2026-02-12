import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { assertCourseTransition } from '@/lib/courses/stateMachine';
import { setCourseStatus } from '@/services/instructorRepo';

export const POST = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true, status: true } });
  if (!course) throw AppError.notFound();
  if (user.role !== 'admin' && course.instructorId !== user.id) throw AppError.notFound();

  if (!assertCourseTransition(course.status as any, 'draft')) {
    throw AppError.badRequest('非法狀態轉換');
  }

  const updated = await setCourseStatus(courseId, 'draft', { rejectedReason: null });
  return ok({ courseId: updated.id, status: updated.status });
});
