import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { reorderLessonsBodySchema } from '@/lib/validators/curriculum';

export const PUT = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const sectionId = ctx.params.sectionId;

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { instructorId: true, status: true } }, lessons: { select: { id: true } } },
  });
  if (!section) throw AppError.notFound();
  if (user.role !== 'admin' && section.course.instructorId !== user.id) throw AppError.notFound();
  if (user.role !== 'admin' && !['draft', 'rejected'].includes(section.course.status)) throw AppError.badRequest('目前狀態不可編輯課綱');

  const body = await parseJson(req, reorderLessonsBodySchema);

  const lessonIds = body.lessons.map((l) => l.lessonId);
  const uniqueIds = new Set(lessonIds);
  if (uniqueIds.size !== lessonIds.length) throw AppError.badRequest('重複的 lessonId');

  const orders = body.lessons.map((l) => l.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) throw AppError.badRequest('重複的 order');

  const existingIds = new Set(section.lessons.map((l) => l.id));
  for (const id of lessonIds) {
    if (!existingIds.has(id)) throw AppError.badRequest('包含不屬於此章節的單元');
  }

  await prisma.$transaction(async (tx) => {
    let i = 0;
    for (const l of body.lessons) {
      await tx.lesson.update({ where: { id: l.lessonId }, data: { order: -1000 - i } });
      i++;
    }
    for (const l of body.lessons) {
      await tx.lesson.update({ where: { id: l.lessonId }, data: { order: l.order } });
    }
  });

  return ok({ reordered: true });
});
