import { apiFetch } from './api-client';
import type { CourseMarketingDetail, CourseMarketingList } from '@app/contracts';

export async function listMarketingCourses(params?: { cookie?: string }) {
  return apiFetch<CourseMarketingList>('/courses', {}, { cookie: params?.cookie });
}

export async function getMarketingCourseDetail(courseId: string, params?: { cookie?: string }) {
  return apiFetch<CourseMarketingDetail>(`/courses/${courseId}`, {}, { cookie: params?.cookie });
}
