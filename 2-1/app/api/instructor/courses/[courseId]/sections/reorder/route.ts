import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { reorderSectionsBodySchema } from '@/lib/validators/curriculum';

export const PUT = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true, status: true } });
  if (!course) throw AppError.notFound();
  if (user.role !== 'admin' && course.instructorId !== user.id) throw AppError.notFound();
  if (user.role !== 'admin' && !['draft', 'rejected'].includes(course.status)) throw AppError.badRequest('目前狀態不可編輯課綱');

  const body = await parseJson(req, reorderSectionsBodySchema);

  const sectionIds = body.sections.map((s) => s.sectionId);
  const uniqueIds = new Set(sectionIds);
  if (uniqueIds.size !== sectionIds.length) throw AppError.badRequest('重複的 sectionId');

  const orders = body.sections.map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) throw AppError.badRequest('重複的 order');

  const existing = await prisma.section.findMany({ where: { courseId }, select: { id: true } });
  const existingIds = new Set(existing.map((s) => s.id));
  for (const id of sectionIds) {
    if (!existingIds.has(id)) throw AppError.badRequest('包含不屬於此課程的章節');
  }

  await prisma.$transaction(async (tx) => {
    // temp orders to avoid unique constraint collisions
    let i = 0;
    for (const s of body.sections) {
      await tx.section.update({ where: { id: s.sectionId }, data: { order: -1000 - i } });
      i++;
    }
    for (const s of body.sections) {
      await tx.section.update({ where: { id: s.sectionId }, data: { order: s.order } });
    }
  });

  return ok({ reordered: true });
});
