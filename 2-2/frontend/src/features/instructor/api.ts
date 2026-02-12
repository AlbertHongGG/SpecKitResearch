import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export function useInstructorCourses() {
  return useQuery({
    queryKey: ['instructor-courses'],
    queryFn: () => apiFetch<{ items: any[] }>('/instructor/courses'),
  });
}

export function useInstructorCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ['instructor-course', courseId],
    queryFn: () => apiFetch(`/instructor/courses/${courseId}`),
  });
}

export function useCreateCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch('/instructor/courses', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['instructor-courses'] }),
  });
}

export function useUpdateCourse(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch(`/instructor/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['instructor-courses'] }),
  });
}

export function useSubmitCourse(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/instructor/courses/${courseId}/submit`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['instructor-courses'] }),
  });
}

export function useCreateSection(courseId: string) {
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch(`/instructor/courses/${courseId}/curriculum/sections`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useCreateLesson(courseId: string, sectionId: string) {
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch(`/instructor/courses/${courseId}/curriculum/sections/${sectionId}/lessons`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}
