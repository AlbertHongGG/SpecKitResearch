import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

import {
  CategoryDeletionForbiddenError,
  CategoryNameInUseError,
  type CategoryRecord,
  type CategoryRepo,
} from '../../domain/categories/categoryRepo';
import { CategoryTypeValues, type CategoryType } from '../../domain/types';

function asCategoryType(value: string): CategoryType {
  if ((CategoryTypeValues as readonly string[]).includes(value)) return value as CategoryType;
  throw new Error(`Invalid category type in DB: ${value}`);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export const categoryRepoPrisma: CategoryRepo = {
  async listByUser(args): Promise<CategoryRecord[]> {
    const rows = await prisma.category.findMany({
      where: {
        userId: args.userId,
        ...(args.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return rows.map((r) => ({ ...r, type: asCategoryType(r.type) }));
  },

  async findByIdForUser(args): Promise<CategoryRecord | null> {
    const row = await prisma.category.findFirst({
      where: {
        id: args.categoryId,
        userId: args.userId,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return row ? { ...row, type: asCategoryType(row.type) } : null;
  },

  async create(args): Promise<CategoryRecord> {
    const existing = await prisma.category.findFirst({
      where: {
        userId: args.userId,
        name: args.name,
      },
      select: { id: true },
    });

    if (existing) throw new CategoryNameInUseError();

    try {
      const created = await prisma.category.create({
        data: {
          userId: args.userId,
          name: args.name,
          type: args.type,
          isActive: args.isActive,
          isDefault: args.isDefault,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          isActive: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { ...created, type: asCategoryType(created.type) };
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new CategoryNameInUseError();
      throw error;
    }
  },

  async updateForUser(args): Promise<CategoryRecord | null> {
    const exists = await prisma.category.findFirst({
      where: {
        id: args.categoryId,
        userId: args.userId,
      },
      select: { id: true },
    });

    if (!exists) return null;

    const conflict = await prisma.category.findFirst({
      where: {
        userId: args.userId,
        name: args.name,
        id: { not: args.categoryId },
      },
      select: { id: true },
    });

    if (conflict) throw new CategoryNameInUseError();

    try {
      const updated = await prisma.category.update({
        where: { id: args.categoryId },
        data: { name: args.name, type: args.type },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          isActive: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { ...updated, type: asCategoryType(updated.type) };
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new CategoryNameInUseError();
      throw error;
    }
  },

  async setActiveForUser(args): Promise<CategoryRecord | null> {
    const exists = await prisma.category.findFirst({
      where: {
        id: args.categoryId,
        userId: args.userId,
      },
      select: { id: true },
    });

    if (!exists) return null;

    const updated = await prisma.category.update({
      where: { id: args.categoryId },
      data: { isActive: args.isActive },
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ...updated, type: asCategoryType(updated.type) };
  },

  async deleteByIdForUser(): Promise<never> {
    throw new CategoryDeletionForbiddenError();
  },
};
