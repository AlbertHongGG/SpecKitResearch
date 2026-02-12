import { fetchJson } from '@/lib/http/fetchJson';

export type CourseListItem = {
  courseId: string;
  title: string;
  description: string;
  price: number;
  category: { categoryId: string; name: string } | null;
  tags: Array<{ tagId: string; name: string }>;
  instructor: { instructorId: string; email: string };
};

export type CourseDetail = {
  course: {
    courseId: string;
    title: string;
    description: string;
    price: number;
    status: string;
    rejectedReason: string | null;
    category: { categoryId: string; name: string } | null;
    tags: Array<{ tagId: string; name: string }>;
    instructor: { instructorId: string; email: string };
  };
  outline: Array<{
    sectionId: string;
    title: string;
    order: number;
    lessons: Array<{ lessonId: string; title: string; order: number }>;
  }>;
};

export const coursesClient = {
  list: (params: { categoryId?: string; tagIds?: string[]; q?: string }) => {
    const url = new URL('/api/courses', window.location.origin);
    if (params.categoryId) url.searchParams.set('categoryId', params.categoryId);
    if (params.q) url.searchParams.set('q', params.q);
    if (params.tagIds?.length) url.searchParams.set('tagIds', params.tagIds.join(','));
    return fetchJson<{ courses: CourseListItem[] }>(url.toString(), { method: 'GET' });
  },
  detail: (courseId: string) => fetchJson<CourseDetail>(`/api/courses/${courseId}`, { method: 'GET' }),
  purchase: (courseId: string) =>
    fetchJson<{ purchaseId: string; courseId: string; userId: string }>(`/api/courses/${courseId}/purchase`, {
      method: 'POST',
    }),
};
