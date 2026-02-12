import { ApiError } from './http';
import { formatApiError, formatError } from '../shared/errors/errorMessages';

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function getApiErrorMessage(err: unknown): string {
  if (isApiError(err)) return formatApiError(err);
  return formatError(err);
}

export function isUnauthorized(err: unknown): boolean {
  return isApiError(err) && err.status === 401;
}
