import { currentUserOrThrow } from '@/lib/auth/currentUser';
import { canReadContent } from '@/lib/access/courseAccess';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseParams } from '@/lib/http/validate';
import { myCourseParamsSchema } from '@/lib/validators/content';
import { getCourseById, getFirstLessonId, getLessonById } from '@/services/courseRepo';
import { isPurchased } from '@/services/purchaseRepo';
import { listCompletedLessonIdsForCourse } from '@/services/progressRepo';

export const GET = withErrorHandling(async (req, ctx) => {
  const user = await currentUserOrThrow();
  const { params } = ctx as { params: unknown };
  const { courseId } = parseParams(params, myCourseParamsSchema);

  const course = await getCourseById(courseId);
  if (!course) throw AppError.notFound('找不到課程');

  const purchased = await isPurchased(user.id, courseId);
  const isAuthor = user.id === course.instructorId;
  const role = user.role;

  if (!canReadContent({ isAuthor, isPurchased: purchased, role })) {
    throw AppError.forbidden('尚未購買');
  }

  const url = new URL(req.url);
  const requestedLessonId = url.searchParams.get('lessonId') ?? undefined;
  const lessonId = requestedLessonId ?? (await getFirstLessonId(courseId)) ?? undefined;

  const lesson = lessonId ? await getLessonById(lessonId) : null;
  if (lesson && lesson.section.courseId !== courseId) {
    throw AppError.badRequest('lessonId 不屬於此課程');
  }

  const completedLessonIds = await listCompletedLessonIdsForCourse(user.id, courseId);

  const outline = course.sections.map((s: any) => ({
    sectionId: s.id,
    title: s.title,
    order: s.order,
    lessons: s.lessons
      .slice()
      .sort((a: any, b: any) => a.order - b.order)
      .map((l: any) => ({
        lessonId: l.id,
        title: l.title,
        order: l.order,
      })),
  }));

  const lessonContent =
    lesson === null
      ? null
      : {
          lessonId: lesson.id,
          title: lesson.title,
          contentType: lesson.contentType,
          contentText: lesson.contentText,
          contentImageUrl: lesson.contentImageFileId ? `/api/files/${lesson.contentImageFileId}` : null,
          contentFileUrl: lesson.contentPdfFileId ? `/api/files/${lesson.contentPdfFileId}` : null,
          isCompleted: completedLessonIds.includes(lesson.id),
        };

  return ok({
    course: {
      courseId: course.id,
      title: course.title,
      instructor: { instructorId: course.instructor.id, email: course.instructor.email },
    },
    outline,
    completedLessonIds,
    lessonContent,
  });
});
