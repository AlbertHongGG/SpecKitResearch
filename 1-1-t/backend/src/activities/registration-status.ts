import type { Activity, Registration } from '@prisma/client';

export type RegistrationStatus =
  | 'can_register'
  | 'registered'
  | 'full'
  | 'closed'
  | 'ended'
  | 'auth_required';

export function deriveRegistrationStatus(input: {
  activity: Activity;
  now: Date;
  isAuthenticated: boolean;
  registration?: Registration | null;
}): RegistrationStatus {
  const { activity, now, isAuthenticated, registration } = input;

  if (!isAuthenticated) return 'auth_required';

  if (registration && !registration.canceledAt) return 'registered';

  if (now.getTime() >= activity.date.getTime()) return 'ended';

  if (now.getTime() >= activity.deadline.getTime()) return 'closed';

  if (activity.status === 'closed' || activity.status === 'archived' || activity.status === 'draft') {
    return 'closed';
  }

  if (activity.registeredCount >= activity.capacity || activity.status === 'full') {
    return 'full';
  }

  return 'can_register';
}
