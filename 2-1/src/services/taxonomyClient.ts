import { fetchJson } from '@/lib/http/fetchJson';

export type CategoryItem = { categoryId: string; name: string };
export type TagItem = { tagId: string; name: string };

export const taxonomyClient = {
  categories: () => fetchJson<{ categories: CategoryItem[] }>('/api/taxonomy/categories', { method: 'GET' }),
  tags: () => fetchJson<{ tags: TagItem[] }>('/api/taxonomy/tags', { method: 'GET' }),
};
