import { createContext, useContext } from 'react';
import type { ToastItem, ToastVariant } from './toastTypes';

export type ToastApi = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id' | 'createdAt'> & { id?: string }) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
};

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

export function variantDefaults(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return { border: 'border-emerald-200', bg: 'bg-emerald-50', title: 'text-emerald-900', body: 'text-emerald-800' };
    case 'error':
      return { border: 'border-rose-200', bg: 'bg-rose-50', title: 'text-rose-900', body: 'text-rose-800' };
    default:
      return { border: 'border-slate-200', bg: 'bg-white', title: 'text-slate-900', body: 'text-slate-700' };
  }
}
