import type { ActivityStatus, RegistrationStatus } from '../../api/types';

const statusLabel: Record<ActivityStatus, string> = {
  draft: '草稿',
  published: '可報名',
  full: '已額滿',
  closed: '已截止',
  archived: '已下架',
};

const regLabel: Record<RegistrationStatus, string> = {
  auth_required: '需登入',
  can_register: '可報名',
  registered: '已報名',
  full: '已額滿',
  closed: '已截止',
  ended: '已結束',
};

function colorForActivityStatus(status: ActivityStatus): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'full':
      return 'bg-amber-100 text-amber-900';
    case 'closed':
      return 'bg-gray-200 text-gray-800';
    case 'archived':
      return 'bg-gray-100 text-gray-500';
    case 'draft':
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function colorForRegistrationStatus(status: RegistrationStatus): string {
  switch (status) {
    case 'registered':
      return 'bg-blue-100 text-blue-800';
    case 'can_register':
      return 'bg-green-100 text-green-800';
    case 'auth_required':
      return 'bg-purple-100 text-purple-800';
    case 'full':
      return 'bg-amber-100 text-amber-900';
    case 'closed':
      return 'bg-gray-200 text-gray-800';
    case 'ended':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function StatusBadge(props: {
  kind: 'activity' | 'registration';
  status: ActivityStatus | RegistrationStatus;
}) {
  const label =
    props.kind === 'activity'
      ? statusLabel[props.status as ActivityStatus]
      : regLabel[props.status as RegistrationStatus];

  const cls =
    props.kind === 'activity'
      ? colorForActivityStatus(props.status as ActivityStatus)
      : colorForRegistrationStatus(props.status as RegistrationStatus);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
