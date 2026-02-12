import { apiFetch } from './api-client';
import type { MyCourseReader, MyCoursesList } from '@app/contracts';

export async function listMyCourses(params?: { cookie?: string }) {
  return apiFetch<MyCoursesList>('/my-courses', {}, { cookie: params?.cookie });
}

export async function getMyCourseReader(params: { courseId: string; lessonId?: string; cookie?: string }) {
  const qs = params.lessonId ? `?lessonId=${encodeURIComponent(params.lessonId)}` : '';
  return apiFetch<MyCourseReader>(`/my-courses/${params.courseId}${qs}`, {}, { cookie: params.cookie });
}
