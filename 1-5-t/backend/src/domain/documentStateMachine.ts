import { ApiError } from '../observability/errors.js';

export type DocumentStatus =
  | 'Draft'
  | 'Submitted'
  | 'InReview'
  | 'Rejected'
  | 'Approved'
  | 'Archived';

const allowedTransitions: Record<DocumentStatus, Set<DocumentStatus>> = {
  Draft: new Set(['Submitted']),
  Submitted: new Set(['InReview']),
  InReview: new Set(['Rejected', 'Approved']),
  Rejected: new Set(['Draft']),
  Approved: new Set(['Archived']),
  Archived: new Set(),
};

export function assertDocumentTransition(from: DocumentStatus, to: DocumentStatus) {
  const allowed = allowedTransitions[from];
  if (!allowed || !allowed.has(to)) {
    throw new ApiError({
      statusCode: 409,
      code: 'Conflict',
      message: `Illegal state transition: ${from} -> ${to}`,
    });
  }
}
