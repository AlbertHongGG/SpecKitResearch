import { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/shared/apiError';
import * as repo from '@/lib/server/repositories/categoryRepo';

export async function listCategories(userId: string) {
  return repo.listCategories(userId);
}

export async function createCategory(userId: string, input: { name: string; type: repo.CategoryType }) {
  try {
    return await repo.createCategory(userId, input);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError({ status: 409, code: 'CATEGORY_NAME_TAKEN', message: '類別名稱已存在' });
    }
    throw err;
  }
}

export async function updateCategory(userId: string, categoryId: string, data: { name?: string; type?: repo.CategoryType; isActive?: boolean }) {
  const existing = await repo.getCategoryById(categoryId);
  if (!existing) throw new ApiError({ status: 404, code: 'CATEGORY_NOT_FOUND', message: '類別不存在' });
  if (existing.userId !== userId) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: '無權限' });

  try {
    return await repo.updateCategory(categoryId, data);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError({ status: 409, code: 'CATEGORY_NAME_TAKEN', message: '類別名稱已存在' });
    }
    throw err;
  }
}
