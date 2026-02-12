import { apiFetch } from './api-client';

export type InstructorCourseItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'draft' | 'submitted' | 'published' | 'rejected';
};

export type UpdateInstructorCourseInput = Partial<Pick<InstructorCourseItem, 'title' | 'description' | 'price'>>;

export type CurriculumLesson = {
  id: string;
  title: string;
  position: number;
};

export type CurriculumSection = {
  id: string;
  title: string;
  position: number;
  lessons: CurriculumLesson[];
};

export type Curriculum = {
  courseId: string;
  sections: CurriculumSection[];
};

export type CreateLessonInput = {
  title: string;
  contentType: 'text' | 'markdown';
  contentText: string;
};

export async function listInstructorCourses(params?: { cookie?: string }) {
  return apiFetch<{ items: InstructorCourseItem[] }>('/instructor/courses', {}, { cookie: params?.cookie });
}

export async function createInstructorCourse(body: { title: string; description: string; price: number }) {
  return apiFetch<{ id: string }>('/instructor/courses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateInstructorCourse(courseId: string, body: UpdateInstructorCourseInput) {
  return apiFetch<{ id: string; status: string }>(`/instructor/courses/${encodeURIComponent(courseId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function submitInstructorCourse(courseId: string) {
  return apiFetch<{ id: string; status: string }>(`/instructor/courses/${encodeURIComponent(courseId)}/submit`, {
    method: 'POST',
  });
}

export async function getCurriculum(courseId: string, params?: { cookie?: string }) {
  return apiFetch<Curriculum>(`/instructor/courses/${encodeURIComponent(courseId)}/curriculum`, {}, { cookie: params?.cookie });
}

export async function createSection(courseId: string, body: { title: string }) {
  return apiFetch<{ id: string }>(`/instructor/courses/${encodeURIComponent(courseId)}/sections`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function reorderSections(courseId: string, ids: string[]) {
  return apiFetch<{ ok: true }>(`/instructor/courses/${encodeURIComponent(courseId)}/sections/reorder`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

export async function createLesson(sectionId: string, body: CreateLessonInput) {
  return apiFetch<{ id: string }>(`/instructor/sections/${encodeURIComponent(sectionId)}/lessons`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function reorderLessons(sectionId: string, ids: string[]) {
  return apiFetch<{ ok: true }>(`/instructor/sections/${encodeURIComponent(sectionId)}/lessons/reorder`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}
