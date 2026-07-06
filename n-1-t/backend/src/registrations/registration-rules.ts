import { ActivityStatus } from '@prisma/client';

export function ensureRegisterable(params: {
  status: ActivityStatus;
  now: Date;
  deadline: Date;
  date: Date;
  registeredCount: number;
  capacity: number;
}): { ok: true } | { ok: false; reason: string } {
  if (params.status !== ActivityStatus.PUBLISHED) return { ok: false, reason: 'Not registerable' };
  if (params.now.getTime() >= params.deadline.getTime()) return { ok: false, reason: 'Deadline passed' };
  if (params.now.getTime() >= params.date.getTime()) return { ok: false, reason: 'Activity already started' };
  if (params.registeredCount >= params.capacity) return { ok: false, reason: 'Full' };
  return { ok: true };
}

export function ensureCancelable(params: {
  now: Date;
  deadline: Date;
  date: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (params.now.getTime() >= params.deadline.getTime()) return { ok: false, reason: 'Deadline passed' };
  if (params.now.getTime() >= params.date.getTime()) return { ok: false, reason: 'Activity already started' };
  return { ok: true };
}
