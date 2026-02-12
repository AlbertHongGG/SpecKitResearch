import type { CategoryType } from '../types';

export class CategoryNameInUseError extends Error {
  constructor() {
    super('Category name already exists');
    this.name = 'CategoryNameInUseError';
  }
}

export class CategoryDeletionForbiddenError extends Error {
  constructor() {
    super('Categories cannot be deleted');
    this.name = 'CategoryDeletionForbiddenError';
  }
}

export type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCategoryInput = {
  userId: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
  isDefault: boolean;
};

export type UpdateCategoryInput = {
  userId: string;
  categoryId: string;
  name: string;
  type: CategoryType;
};

export type SetCategoryActiveInput = {
  userId: string;
  categoryId: string;
  isActive: boolean;
};

export interface CategoryRepo {
  listByUser(args: {
    userId: string;
    includeInactive: boolean;
  }): Promise<CategoryRecord[]>;

  findByIdForUser(args: { userId: string; categoryId: string }): Promise<CategoryRecord | null>;

  create(args: CreateCategoryInput): Promise<CategoryRecord>;

  updateForUser(args: UpdateCategoryInput): Promise<CategoryRecord | null>;

  setActiveForUser(args: SetCategoryActiveInput): Promise<CategoryRecord | null>;

  deleteByIdForUser(args: { userId: string; categoryId: string }): Promise<never>;
}
