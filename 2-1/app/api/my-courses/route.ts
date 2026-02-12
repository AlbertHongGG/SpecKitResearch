import { requireUser } from '@/lib/auth/guards';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { getCourseProgress } from '@/services/progressRepo';
import { listMyCourses } from '@/services/myCoursesRepo';

export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const purchases = await listMyCourses(user.id);

  const courses = await Promise.all(
    purchases.map(async (p) => {
      const progress = await getCourseProgress(user.id, p.courseId);
      return {
        courseId: p.course.id,
        title: p.course.title,
        description: p.course.description,
        price: p.course.price,
        purchasedAt: p.createdAt,
        instructor: { instructorId: p.course.instructor.id, email: p.course.instructor.email },
        progress,
      };
    }),
  );

  return ok({ courses });
});
