import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { created } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { createSectionBodySchema } from '@/lib/validators/curriculum';
import { createSection } from '@/services/instructorRepo';

export const POST = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true, status: true } });
  if (!course) throw AppError.notFound();
  if (user.role !== 'admin' && course.instructorId !== user.id) throw AppError.notFound();
  if (user.role !== 'admin' && !['draft', 'rejected'].includes(course.status)) throw AppError.badRequest('目前狀態不可編輯課綱');

  const body = await parseJson(req, createSectionBodySchema);

  const existing = await prisma.section.findFirst({ where: { courseId, order: body.order } });
  if (existing) throw AppError.badRequest('章節排序衝突');

  const section = await createSection(courseId, body);
  return created({ sectionId: section.id });
});
