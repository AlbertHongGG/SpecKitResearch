import { fetchJson } from '@/lib/http/fetchJson';

export const adminClient = {
  reviewQueue: () => fetchJson<{ courses: any[] }>('/api/admin/review-queue', { method: 'GET' }),

  getCourse: (courseId: string) => fetchJson<{ course: any }>(`/api/admin/courses/${courseId}`, { method: 'GET' }),

  reviewCourse: (courseId: string, body: { decision: 'published' | 'rejected'; reason?: string | null }) =>
    fetchJson<{ courseId: string; status: string }>(`/api/admin/courses/${courseId}/review`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listReviews: (courseId: string) =>
    fetchJson<{ reviews: any[] }>(`/api/admin/courses/${courseId}/reviews`, { method: 'GET' }),

  listUsers: () => fetchJson<{ users: any[] }>('/api/admin/users', { method: 'GET' }),

  updateUser: (userId: string, body: { role?: 'student' | 'instructor' | 'admin'; isActive?: boolean }) =>
    fetchJson<{ user: any }>(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  listCategories: () => fetchJson<{ categories: any[] }>('/api/admin/categories', { method: 'GET' }),

  createCategory: (body: { name: string }) =>
    fetchJson<{ category: any }>('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }),

  updateCategory: (categoryId: string, body: { name?: string; isActive?: boolean }) =>
    fetchJson<{ category: any }>(`/api/admin/categories/${categoryId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  listTags: () => fetchJson<{ tags: any[] }>('/api/admin/tags', { method: 'GET' }),

  createTag: (body: { name: string }) =>
    fetchJson<{ tag: any }>('/api/admin/tags', { method: 'POST', body: JSON.stringify(body) }),

  updateTag: (tagId: string, body: { name?: string; isActive?: boolean }) =>
    fetchJson<{ tag: any }>(`/api/admin/tags/${tagId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  stats: () => fetchJson<{ userCount: number; purchaseCount: number; courseCountsByStatus: Record<string, number> }>('/api/admin/stats', { method: 'GET' }),
};
