import type { DocumentStatus } from '@internal/contracts';
import { Badge } from '../ui/Badge';

export function DocumentStatusBadge(props: { status: DocumentStatus }) {
  const { status } = props;
  const tone: 'neutral' | 'success' | 'warning' | 'danger' =
    status === 'Approved'
      ? 'success'
      : status === 'Rejected'
        ? 'danger'
        : status === 'InReview' || status === 'Submitted'
          ? 'warning'
          : 'neutral';

  const label: Record<DocumentStatus, string> = {
    Draft: 'Draft',
    Submitted: 'Submitted',
    InReview: 'InReview',
    Rejected: 'Rejected',
    Approved: 'Approved',
    Archived: 'Archived',
  };

  return <Badge tone={tone}>{label[status]}</Badge>;
}
