import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../src/server/errors/errors';
import { adminReviewDecisionSchema } from '../../../../../../src/shared/schema/admin';
import { transitionCourseStatus } from '../../../../../../src/domain/courseStatus';

function getCourseId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const courseId = parts[parts.indexOf('courses') + 1];
  if (!courseId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'courseId required' });
  return courseId;
}

export const POST = withRouteHandler(async (req: NextRequest) => {
  const admin = await requireRole(req, ['admin']);
  const courseId = getCourseId(req);

  const json = await req.json().catch(() => null);
  const parsed = adminReviewDecisionSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true, publishedAt: true, archivedAt: true, rejectedReason: true },
  });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const decision = parsed.data.decision;
  const reason = (parsed.data.reason ?? '').toString();

  const update =
    decision === 'published'
      ? transitionCourseStatus({
          current: {
            status: course.status,
            publishedAt: course.publishedAt,
            archivedAt: course.archivedAt,
            rejectedReason: course.rejectedReason,
          },
          action: { type: 'APPROVE' },
        })
      : transitionCourseStatus({
          current: {
            status: course.status,
            publishedAt: course.publishedAt,
            archivedAt: course.archivedAt,
            rejectedReason: course.rejectedReason,
          },
          action: { type: 'REJECT', reason },
        });

  await prisma.$transaction(async (tx) => {
    await tx.course.update({ where: { id: courseId }, data: update });
    await tx.courseReview.create({
      data: {
        courseId,
        adminId: admin.id,
        decision,
        reason: decision === 'rejected' ? reason : null,
      },
      select: { id: true },
    });
  });

  return NextResponse.json({ ok: true });
});
