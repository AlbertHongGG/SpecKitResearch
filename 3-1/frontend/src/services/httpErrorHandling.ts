import type { ApiError } from './apiClient';

export function isApiError(err: unknown): err is ApiError {
  return Boolean(err && typeof err === 'object' && 'status' in err);
}

export function getApiError(err: unknown): ApiError | null {
  return isApiError(err) ? err : null;
}

export function routeForAuthError(status: number) {
  if (status === 401) return '/login';
  if (status === 403) return '/403';
  return null;
}

export function getErrorMessage(err: unknown, fallback = '發生錯誤') {
  const apiErr = getApiError(err);
  if (!apiErr) return fallback;
  return apiErr.message || fallback;
}

type ZodFlattened = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
};

export function getValidationDetails(err: unknown): ZodFlattened | null {
  const apiErr = getApiError(err);
  if (!apiErr) return null;
  if (apiErr.status !== 422) return null;

  const details = apiErr.details as any;
  if (!details || typeof details !== 'object') return null;
  return {
    formErrors: Array.isArray(details.formErrors) ? details.formErrors : undefined,
    fieldErrors:
      details.fieldErrors && typeof details.fieldErrors === 'object'
        ? (details.fieldErrors as Record<string, string[]>)
        : undefined,
  };
}

export function applyApiErrorToForm(
  form: {
    setError: (name: any, error: { message: string }) => void;
  },
  err: unknown,
  options?: { rootFallback?: string },
) {
  const apiErr = getApiError(err);
  if (!apiErr) {
    form.setError('root', { message: options?.rootFallback ?? '發生錯誤' });
    return;
  }

  const validation = getValidationDetails(apiErr);
  if (validation?.fieldErrors) {
    for (const [field, messages] of Object.entries(validation.fieldErrors)) {
      const message = messages?.[0];
      if (!message) continue;
      form.setError(field, { message });
    }
  }

  const rootMessage =
    validation?.formErrors?.[0] ?? apiErr.message ?? options?.rootFallback ?? '提交失敗';
  form.setError('root', { message: rootMessage });
}
