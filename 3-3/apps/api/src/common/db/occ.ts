import { AppError } from '../app-error';

export function assertOccUpdated(result: { count: number }, opts?: { message?: string }) {
  if (result.count !== 1) {
    throw new AppError({
      errorCode: 'CONFLICT',
      status: 409,
      message: opts?.message ?? 'Concurrent update detected',
    });
  }
}
