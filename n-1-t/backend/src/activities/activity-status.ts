import { ActivityStatus } from '@prisma/client';

export function canAdminTransition(from: ActivityStatus, to: ActivityStatus): boolean {
  if (from === ActivityStatus.PUBLISHED || from === ActivityStatus.FULL) {
    return to === ActivityStatus.CLOSED;
  }
  if (from === ActivityStatus.CLOSED || from === ActivityStatus.DRAFT) {
    return to === ActivityStatus.ARCHIVED;
  }
  return false;
}

export function deriveAutoStatus(params: {
  current: ActivityStatus;
  registeredCount: number;
  capacity: number;
  now: Date;
  deadline: Date;
  date: Date;
}): ActivityStatus {
  // Auto transitions only apply between PUBLISHED <-> FULL per spec
  if (params.current === ActivityStatus.PUBLISHED && params.registeredCount >= params.capacity) {
    return ActivityStatus.FULL;
  }

  const registerableNow =
    params.now.getTime() < params.deadline.getTime() &&
    params.now.getTime() < params.date.getTime() &&
    params.registeredCount < params.capacity;

  if (params.current === ActivityStatus.FULL && registerableNow) {
    return ActivityStatus.PUBLISHED;
  }

  return params.current;
}
