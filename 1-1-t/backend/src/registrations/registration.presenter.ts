import type { Registration } from '@prisma/client';

export type RegistrationResponse = {
  id: string;
  userId: string;
  activityId: string;
  createdAt: string;
  canceledAt: string | null;
};

export function presentRegistration(reg: Registration): RegistrationResponse {
  return {
    id: reg.id,
    userId: reg.userId,
    activityId: reg.activityId,
    createdAt: reg.createdAt.toISOString(),
    canceledAt: reg.canceledAt ? reg.canceledAt.toISOString() : null,
  };
}
