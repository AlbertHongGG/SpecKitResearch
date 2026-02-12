import { prisma } from '@/lib/server/db';

export type CategoryType = 'income' | 'expense' | 'both';

export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ isActive: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function createCategory(userId: string, input: { name: string; type: CategoryType }) {
  return prisma.category.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      isActive: true,
      isDefault: false,
    },
  });
}

export async function getCategoryById(categoryId: string) {
  return prisma.category.findUnique({ where: { id: categoryId } });
}

export async function updateCategory(categoryId: string, data: { name?: string; type?: CategoryType; isActive?: boolean }) {
  return prisma.category.update({ where: { id: categoryId }, data });
}
