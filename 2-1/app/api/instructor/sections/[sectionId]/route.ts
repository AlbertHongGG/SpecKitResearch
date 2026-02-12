import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { updateSectionBodySchema } from '@/lib/validators/curriculum';
import { deleteSection, updateSection } from '@/services/instructorRepo';

async function requireManagedSection(sectionId: string, user: { id: string; role: string }) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { id: true, instructorId: true, status: true } } },
  });
  if (!section) throw AppError.notFound();
  if (user.role !== 'admin' && section.course.instructorId !== user.id) throw AppError.notFound();
  if (user.role !== 'admin' && !['draft', 'rejected'].includes(section.course.status)) {
    throw AppError.badRequest('目前狀態不可編輯課綱');
  }
  return section;
}

export const PATCH = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const sectionId = ctx.params.sectionId;

  const section = await requireManagedSection(sectionId, user);
  const body = await parseJson(req, updateSectionBodySchema);

  if (body.order !== undefined) {
    const conflict = await prisma.section.findFirst({
      where: { courseId: section.courseId, order: body.order, NOT: { id: sectionId } },
      select: { id: true },
    });
    if (conflict) throw AppError.badRequest('章節排序衝突');
  }

  const updated = await updateSection(sectionId, body);
  return ok({ section: updated });
});

export const DELETE = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const sectionId = ctx.params.sectionId;

  await requireManagedSection(sectionId, user);
  await deleteSection(sectionId);

  return ok({ deleted: true });
});
