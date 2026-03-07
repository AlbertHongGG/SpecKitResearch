import { apiRequest } from '@/services/api/client';

export function fetchProducts(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/products${suffix}`, { method: 'GET' });
}

export function fetchProductDetail(productId: string) {
  return apiRequest(`/products/${productId}`, { method: 'GET' });
}
