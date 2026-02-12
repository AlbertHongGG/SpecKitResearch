import type { DocumentStatus } from '../services/documents';

export type UserRole = 'User' | 'Reviewer' | 'Admin';

export function documentStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case 'Draft':
      return '草稿';
    case 'Submitted':
      return '已送出';
    case 'In Review':
      return '審核中';
    case 'Rejected':
      return '已退回';
    case 'Approved':
      return '已核准';
    case 'Archived':
      return '已封存';
  }
}

export function canEditDraftForRole(status: DocumentStatus, role: UserRole | undefined): boolean {
  return status === 'Draft' && (role === 'User' || role === 'Admin');
}

export function StatusBadge(props: { status: DocumentStatus }) {
  const { label, className } = (() => {
    switch (props.status) {
      case 'Draft':
        return { label: documentStatusLabel(props.status), className: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'Submitted':
        return { label: documentStatusLabel(props.status), className: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'In Review':
        return { label: documentStatusLabel(props.status), className: 'bg-amber-50 text-amber-900 border-amber-200' };
      case 'Rejected':
        return { label: documentStatusLabel(props.status), className: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'Approved':
        return { label: documentStatusLabel(props.status), className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'Archived':
        return { label: documentStatusLabel(props.status), className: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
  })();

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
