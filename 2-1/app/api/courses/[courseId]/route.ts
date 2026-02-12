import { currentUser } from '@/lib/auth/currentUser';
import { shouldHideMarketingAs404 } from '@/lib/access/courseAccess';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseParams } from '@/lib/http/validate';
import { courseIdParamsSchema } from '@/lib/validators/courses';
import { getCourseById } from '@/services/courseRepo';

export const GET = withErrorHandling(async (req, ctx) => {
  const { params } = ctx as { params: unknown };
  const { courseId } = parseParams(params, courseIdParamsSchema);

  const course = await getCourseById(courseId);
  if (!course) throw AppError.notFound('找不到課程');

  const user = await currentUser();
  const isAuthor = !!user && user.id === course.instructorId;
  const role = user?.role ?? null;

  if (
    shouldHideMarketingAs404({
      courseStatus: course.status as any,
      isAuthor,
      role,
    })
  ) {
    throw AppError.notFound('找不到課程');
  }

  return ok({
    course: {
      courseId: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      status: course.status,
      rejectedReason: course.rejectedReason,
      category: course.category ? { categoryId: course.category.id, name: course.category.name } : null,
      tags: course.tags.map((ct: any) => ({ tagId: ct.tag.id, name: ct.tag.name })),
      instructor: { instructorId: course.instructor.id, email: course.instructor.email },
    },
    outline: course.sections.map((s: any) => ({
      sectionId: s.id,
      title: s.title,
      order: s.order,
      lessons: s.lessons
        .slice()
        .sort((a: any, b: any) => a.order - b.order)
        .map((l: any) => ({ lessonId: l.id, title: l.title, order: l.order })),
    })),
  });
});
