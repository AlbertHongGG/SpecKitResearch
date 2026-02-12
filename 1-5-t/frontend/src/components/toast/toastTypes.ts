export type ToastVariant = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  createdAt: number;
};
