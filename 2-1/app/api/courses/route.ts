import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { listPublishedCourses } from '@/services/courseRepo';

function parseListQuery(url: URL) {
  const categoryId = url.searchParams.get('categoryId') ?? undefined;
  const q = url.searchParams.get('q') ?? undefined;
  const tagIdsRaw = url.searchParams.getAll('tagId');
  const tagIdsCsv = url.searchParams.get('tagIds');
  const tagIds = tagIdsRaw.length
    ? tagIdsRaw
    : tagIdsCsv
      ? tagIdsCsv
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

  return { categoryId, q, tagIds };
}

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { categoryId, q, tagIds } = parseListQuery(url);

  const courses = await listPublishedCourses({ categoryId, query: q, tagIds });

  return ok({
    courses: courses.map((c: any) => ({
      courseId: c.id,
      title: c.title,
      description: c.description,
      price: c.price,
      category: c.category ? { categoryId: c.category.id, name: c.category.name } : null,
      tags: c.tags.map((ct: any) => ({ tagId: ct.tag.id, name: ct.tag.name })),
      instructor: { instructorId: c.instructor.id, email: c.instructor.email },
    })),
  });
});
