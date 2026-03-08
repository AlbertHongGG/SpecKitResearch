import { AppError } from '../app-error';

export function orgScopedWhere<T extends { organizationId: string; id: string }>(
  organizationId: string,
  id: string,
): Pick<T, 'organizationId' | 'id'> {
  return { organizationId, id } as Pick<T, 'organizationId' | 'id'>;
}

export function assertOrgScope(resourceOrgId: string, expectedOrgId: string) {
  if (resourceOrgId !== expectedOrgId) {
    // Treat as NOT_FOUND to reduce IDOR signal.
    throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Not found' });
  }
}
