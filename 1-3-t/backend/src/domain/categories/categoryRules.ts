import type { CategoryType, TransactionType } from '../types';

export function isCategoryTypeCompatible(args: {
  categoryType: CategoryType;
  transactionType: TransactionType;
}): boolean {
  const { categoryType, transactionType } = args;
  if (categoryType === 'both') return true;
  return categoryType === transactionType;
}
