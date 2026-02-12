export const CategoryTypeValues = ['income', 'expense', 'both'] as const;
export type CategoryType = (typeof CategoryTypeValues)[number];

export const TransactionTypeValues = ['income', 'expense'] as const;
export type TransactionType = (typeof TransactionTypeValues)[number];
