import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export type Course = {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImageUrl?: string | null;
  status: string;
};

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => apiFetch<{ items: Course[] }>('/courses'),
  });
}

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => apiFetch<Course>(`/courses/${courseId}`),
  });
}

export function usePurchaseCourse(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/courses/${courseId}/purchase`, { method: 'POST' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });
}

export function useMyCourses(enabled = true) {
  return useQuery({
    queryKey: ['my-courses'],
    queryFn: () => apiFetch<{ items: any[] }>('/my-courses'),
    enabled,
  });
}

export function useCourseReader(courseId: string) {
  return useQuery({
    queryKey: ['reader', courseId],
    queryFn: () => apiFetch(`/my-courses/${courseId}`),
  });
}
