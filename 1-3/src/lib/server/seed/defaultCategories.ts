export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: 'income' | 'expense' | 'both';
  isDefault: boolean;
}> = [
  { name: '食物', type: 'expense', isDefault: true },
  { name: '生活', type: 'expense', isDefault: true },
  { name: '交通', type: 'expense', isDefault: true },
  { name: '薪水', type: 'income', isDefault: true },
  { name: '提款', type: 'income', isDefault: true },
];
