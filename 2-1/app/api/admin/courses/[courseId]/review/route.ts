import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { assertCourseTransition } from '@/lib/courses/stateMachine';
import { adminReviewDecisionBodySchema } from '@/lib/validators/adminReview';

export const POST = withErrorHandling(async (req, ctx: any) => {
  assertSameOrigin(req);

  const admin = await requireRole(['admin']);
  const courseId = ctx.params.courseId as string;

  const body = await parseJson(req, adminReviewDecisionBodySchema);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw AppError.notFound();

  const toStatus = body.decision;
  if (!assertCourseTransition(course.status as any, toStatus as any)) {
    throw AppError.badRequest('非法狀態轉換');
  }

  if (toStatus === 'rejected' && !body.reason) {
    throw AppError.badRequest('駁回理由必填');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const courseUpdated = await tx.course.update({
      where: { id: courseId },
      data: {
        status: toStatus,
        rejectedReason: toStatus === 'rejected' ? body.reason ?? null : null,
        publishedAt: toStatus === 'published' ? new Date() : null,
      },
    });

    await tx.courseReview.create({
      data: {
        courseId,
        adminId: admin.id,
        decision: toStatus,
        reason: body.reason ?? null,
      },
    });

    return courseUpdated;
  });

  return ok({ courseId: updated.id, status: updated.status });
});
