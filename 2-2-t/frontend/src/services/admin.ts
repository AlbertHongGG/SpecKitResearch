import { apiFetch } from './api-client';

export type ReviewQueueItem = {
  id: string;
  title: string;
  instructor: {
    email: string;
  };
};

export type ReviewHistoryItem = {
  id: string;
  decision: string;
  reason?: string | null;
  note?: string | null;
  createdAt: string;
  reviewer: {
    email: string;
  };
};

export type AdminUserItem = {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  isActive: boolean;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export type AdminStats = Record<string, unknown>;

export async function listReviewQueue(params?: { cookie?: string }) {
  return apiFetch<{ items: ReviewQueueItem[] }>('/admin/reviews/queue', {}, { cookie: params?.cookie });
}

export async function getReviewHistory(courseId: string, params?: { cookie?: string }) {
  return apiFetch<{ items: ReviewHistoryItem[] }>(
    `/admin/reviews/${encodeURIComponent(courseId)}/history`,
    {},
    { cookie: params?.cookie },
  );
}

export async function decideReview(courseId: string, body: { decision: 'published' | 'rejected'; reason?: string | null; note?: string | null }) {
  return apiFetch<{ courseId: string; status: string }>(`/admin/reviews/${encodeURIComponent(courseId)}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function listUsers(params?: { cookie?: string }) {
  return apiFetch<{ items: AdminUserItem[] }>('/admin/users', {}, { cookie: params?.cookie });
}

export async function setUserActive(userId: string, isActive: boolean) {
  return apiFetch<{ id: string; isActive: boolean }>(`/admin/users/${encodeURIComponent(userId)}/active`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
}

export async function setUserRole(userId: string, role: 'student' | 'instructor' | 'admin') {
  return apiFetch<{ id: string; role: string }>(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

export async function getTaxonomyAdmin(params?: { cookie?: string }) {
  return apiFetch<{ categories: TaxonomyItem[]; tags: TaxonomyItem[] }>('/taxonomy/admin', {}, { cookie: params?.cookie });
}

export async function upsertCategory(body: { id?: string; name: string; isActive?: boolean }) {
  return apiFetch<TaxonomyItem>('/taxonomy/category', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function upsertTag(body: { id?: string; name: string; isActive?: boolean }) {
  return apiFetch<TaxonomyItem>('/taxonomy/tag', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getAdminStats(params?: { cookie?: string }) {
  return apiFetch<AdminStats>('/stats/admin', {}, { cookie: params?.cookie });
}
