import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export function useReviewQueue() {
  return useQuery({
    queryKey: ['admin-review'],
    queryFn: () => apiFetch<{ items: any[] }>('/admin/review'),
  });
}

export function useAdminCourses() {
  return useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => apiFetch<{ items: any[] }>('/admin/courses'),
  });
}

export function useArchiveCourse(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/admin/courses/${courseId}/archive`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-courses'] }),
  });
}

export function usePublishCourse(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/admin/courses/${courseId}/publish`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-courses'] }),
  });
}

export function useReviewCourse(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch(`/admin/review/${courseId}`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-review'] }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<{ items: any[] }>('/admin/taxonomy/categories'),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['admin-tags'],
    queryFn: () => apiFetch<{ items: any[] }>('/admin/taxonomy/tags'),
  });
}

export function useCreateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch('/admin/taxonomy/categories', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}

export function useCreateTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch('/admin/taxonomy/tags', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-tags'] }),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch<{ items: any[] }>('/admin/users'),
  });
}

export function useUpdateUser(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch('/admin/stats'),
  });
}
