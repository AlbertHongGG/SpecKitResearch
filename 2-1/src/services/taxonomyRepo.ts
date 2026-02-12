import { prisma } from '@/db/prisma';

import type { CourseCategory, Tag } from '@prisma/client';

export async function listActiveCategories() {
  const categories: CourseCategory[] = await prisma.courseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return categories;
}

export async function listActiveTags() {
  const tags: Tag[] = await prisma.tag.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  return tags;
}
