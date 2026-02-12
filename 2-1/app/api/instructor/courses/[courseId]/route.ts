import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { instructorUpdateCourseBodySchema } from '@/lib/validators/instructor';
import { updateCourseBasics } from '@/services/instructorRepo';

async function requireManagedCourse(courseId: string, user: { id: string; role: string }) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, status: true },
  });
  if (!course) throw AppError.notFound();
  if (user.role !== 'admin' && course.instructorId !== user.id) throw AppError.notFound();
  return course;
}

export const GET = withErrorHandling(async (_req, ctx) => {
  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  await requireManagedCourse(courseId, user);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      category: true,
      tags: { include: { tag: true } },
      sections: { include: { lessons: true }, orderBy: { order: 'asc' } },
    },
  });

  if (!course) throw AppError.notFound();
  return ok({ course });
});

export const PATCH = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  const course = await requireManagedCourse(courseId, user);
  if (user.role !== 'admin' && !['draft', 'rejected'].includes(course.status)) {
    throw AppError.badRequest('目前狀態不可編輯');
  }

  const body = await parseJson(req, instructorUpdateCourseBodySchema);

  if (body.categoryId) {
    const category = await prisma.courseCategory.findUnique({ where: { id: body.categoryId } });
    if (!category || !category.isActive) throw AppError.badRequest('分類不存在或已停用');
  }

  const updated = await updateCourseBasics(courseId, {
    categoryId: body.categoryId,
    title: body.title,
    description: body.description,
    price: body.price,
    coverFileId: body.coverFileId,
    tagIds: body.tagIds,
  });

  return ok({ course: updated });
});
