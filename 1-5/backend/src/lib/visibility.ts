import type { CurrentUser } from './authMiddleware.js';

export type VisibilityScope =
  | { kind: 'admin' }
  | { kind: 'owner'; ownerId: string }
  | { kind: 'reviewer'; reviewerId: string };

export function getVisibilityScope(user: CurrentUser): VisibilityScope {
  if (user.role === 'Admin') return { kind: 'admin' };
  if (user.role === 'Reviewer') return { kind: 'reviewer', reviewerId: user.id };
  return { kind: 'owner', ownerId: user.id };
}

export function documentWhereForDetail(options: { documentId: string; user: CurrentUser }) {
  const scope = getVisibilityScope(options.user);
  switch (scope.kind) {
    case 'admin':
      return { id: options.documentId } as const;
    case 'owner':
      return { id: options.documentId, ownerId: scope.ownerId } as const;
    case 'reviewer':
      // Anti-enumeration: reviewer only sees documents that have at least one task assigned to them.
      return {
        id: options.documentId,
        reviewTasks: { some: { assigneeId: scope.reviewerId } },
      } as const;
  }
}

