import { httpJson } from './http';

export type CategoryType = 'income' | 'expense' | 'both';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
  isDefault: boolean;
};

export async function listCategories(args?: { includeInactive?: boolean }): Promise<{ items: Category[] }> {
  return httpJson<{ items: Category[] }>({
    path: '/categories',
    query: {
      includeInactive: args?.includeInactive,
    },
  });
}

export async function createCategory(input: { name: string; type: CategoryType }): Promise<Category> {
  return httpJson<Category>({
    path: '/categories',
    method: 'POST',
    body: input,
  });
}

export async function updateCategory(input: {
  categoryId: string;
  name: string;
  type: CategoryType;
}): Promise<Category> {
  return httpJson<Category>({
    path: `/categories/${input.categoryId}`,
    method: 'PUT',
    body: {
      name: input.name,
      type: input.type,
    },
  });
}

export async function setCategoryActive(input: {
  categoryId: string;
  isActive: boolean;
}): Promise<Category> {
  return httpJson<Category>({
    path: `/categories/${input.categoryId}/active`,
    method: 'PATCH',
    body: {
      isActive: input.isActive,
    },
  });
}
