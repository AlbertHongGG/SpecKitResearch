import { fetchJson } from '@/lib/http/fetchJson';

export type InstructorCourse = {
  id: string;
  title: string;
  description: string;
  price: number;
  categoryId: string;
  coverFileId: string | null;
  status: string;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstructorCourseDetail = {
  course: any;
};

export const instructorClient = {
  listCourses: () => fetchJson<{ courses: InstructorCourse[] }>('/api/instructor/courses', { method: 'GET' }),

  createCourse: (body: {
    categoryId: string;
    title: string;
    description: string;
    price: number;
    coverFileId?: string | null;
    tagIds?: string[];
  }) => fetchJson<{ courseId: string }>('/api/instructor/courses', { method: 'POST', body: JSON.stringify(body) }),

  getCourse: (courseId: string) =>
    fetchJson<InstructorCourseDetail>(`/api/instructor/courses/${courseId}`, { method: 'GET' }),

  updateCourse: (courseId: string, body: any) =>
    fetchJson<{ course: any }>(`/api/instructor/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  submitCourse: (courseId: string) =>
    fetchJson<{ courseId: string; status: string }>(`/api/instructor/courses/${courseId}/submit`, { method: 'POST' }),

  backToDraft: (courseId: string) =>
    fetchJson<{ courseId: string; status: string }>(`/api/instructor/courses/${courseId}/back-to-draft`, {
      method: 'POST',
    }),

  setPublishStatus: (courseId: string, toStatus: 'published' | 'archived') =>
    fetchJson<{ courseId: string; status: string }>(`/api/instructor/courses/${courseId}/status`, {
      method: 'POST',
      body: JSON.stringify({ toStatus }),
    }),

  createSection: (courseId: string, body: { title: string; order: number }) =>
    fetchJson<{ sectionId: string }>(`/api/instructor/courses/${courseId}/sections`, { method: 'POST', body: JSON.stringify(body) }),

  updateSection: (sectionId: string, body: { title?: string; order?: number }) =>
    fetchJson<{ section: any }>(`/api/instructor/sections/${sectionId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteSection: (sectionId: string) =>
    fetchJson<{ deleted: boolean }>(`/api/instructor/sections/${sectionId}`, { method: 'DELETE' }),

  reorderSections: (courseId: string, body: { sections: Array<{ sectionId: string; order: number }> }) =>
    fetchJson<{ reordered: boolean }>(`/api/instructor/courses/${courseId}/sections/reorder`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  createLesson: (sectionId: string, body: any) =>
    fetchJson<{ lessonId: string }>(`/api/instructor/sections/${sectionId}/lessons`, { method: 'POST', body: JSON.stringify(body) }),

  updateLesson: (lessonId: string, body: any) =>
    fetchJson<{ lesson: any }>(`/api/instructor/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteLesson: (lessonId: string) => fetchJson<{ deleted: boolean }>(`/api/instructor/lessons/${lessonId}`, { method: 'DELETE' }),

  reorderLessons: (sectionId: string, body: { lessons: Array<{ lessonId: string; order: number }> }) =>
    fetchJson<{ reordered: boolean }>(`/api/instructor/sections/${sectionId}/lessons/reorder`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  upload: async (file: File, meta?: { courseId?: string }) => {
    const form = new FormData();
    form.set('file', file);
    form.set('meta', JSON.stringify(meta ?? {}));

    const res = await fetch('/api/instructor/uploads', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'fetch',
      },
      body: form,
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.message ?? '上傳失敗';
      throw new Error(msg);
    }

    return json as { fileId: string; url: string; originalName: string | null; mimeType: string };
  },
};
