import { fetchJson } from '@/lib/http/fetchJson';

export type MyCourseListItem = {
  courseId: string;
  title: string;
  description: string;
  price: number;
  purchasedAt: string;
  instructor: { instructorId: string; email: string };
  progress: { completedLessons: number; totalLessons: number };
};

export type ReaderData = {
  course: {
    courseId: string;
    title: string;
    instructor: { instructorId: string; email: string };
  };
  outline: Array<{
    sectionId: string;
    title: string;
    order: number;
    lessons: Array<{ lessonId: string; title: string; order: number }>;
  }>;
  completedLessonIds: string[];
  lessonContent:
    | null
    | {
        lessonId: string;
        title: string;
        contentType: string;
        contentText: string | null;
        contentImageUrl: string | null;
        contentFileUrl: string | null;
        isCompleted: boolean;
      };
};

export const myCoursesClient = {
  listMyCourses: () => fetchJson<{ courses: MyCourseListItem[] }>('/api/my-courses', { method: 'GET' }),
  getReaderData: (courseId: string, lessonId?: string) => {
    const url = new URL(`/api/my-courses/${courseId}`, window.location.origin);
    if (lessonId) url.searchParams.set('lessonId', lessonId);
    return fetchJson<ReaderData>(url.toString(), { method: 'GET' });
  },
};
