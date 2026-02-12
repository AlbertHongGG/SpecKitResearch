import {
  ApprovalAction,
  DocumentStatus,
  DocumentVersionKind,
  ReviewTaskStatus,
  Role,
  StepMode,
} from '@prisma/client';

export {
  ApprovalAction,
  DocumentStatus,
  DocumentVersionKind,
  ReviewTaskStatus,
  Role,
  StepMode,
};

export type DocumentStatusContract =
  | 'Draft'
  | 'Submitted'
  | 'In Review'
  | 'Rejected'
  | 'Approved'
  | 'Archived';

export function toContractDocumentStatus(status: DocumentStatus): DocumentStatusContract {
  switch (status) {
    case DocumentStatus.Draft:
      return 'Draft';
    case DocumentStatus.Submitted:
      return 'Submitted';
    case DocumentStatus.InReview:
      return 'In Review';
    case DocumentStatus.Rejected:
      return 'Rejected';
    case DocumentStatus.Approved:
      return 'Approved';
    case DocumentStatus.Archived:
      return 'Archived';
  }
}

export function fromContractDocumentStatus(status: DocumentStatusContract): DocumentStatus {
  switch (status) {
    case 'Draft':
      return DocumentStatus.Draft;
    case 'Submitted':
      return DocumentStatus.Submitted;
    case 'In Review':
      return DocumentStatus.InReview;
    case 'Rejected':
      return DocumentStatus.Rejected;
    case 'Approved':
      return DocumentStatus.Approved;
    case 'Archived':
      return DocumentStatus.Archived;
  }
}
