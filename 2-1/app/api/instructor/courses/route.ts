import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { created, ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { instructorCreateCourseBodySchema } from '@/lib/validators/instructor';
import { createDraftCourse, listInstructorCourses } from '@/services/instructorRepo';

export const GET = withErrorHandling(async () => {
  const user = await requireRole(['instructor', 'admin']);

  const courses = await listInstructorCourses(user.id);
  return ok({ courses });
});

export const POST = withErrorHandling(async (req) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  if (user.role !== 'instructor' && user.role !== 'admin') {
    throw AppError.forbidden();
  }

  const body = await parseJson(req, instructorCreateCourseBodySchema);

  const category = await prisma.courseCategory.findUnique({ where: { id: body.categoryId } });
  if (!category || !category.isActive) throw AppError.badRequest('分類不存在或已停用');

  const course = await createDraftCourse({
    instructorId: user.id,
    categoryId: body.categoryId,
    title: body.title,
    description: body.description,
    price: body.price,
    coverFileId: body.coverFileId ?? null,
    tagIds: body.tagIds,
  });

  return created({ courseId: course.id });
});
