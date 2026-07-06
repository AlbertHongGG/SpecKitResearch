import type { PrismaClient } from '@prisma/client';

export type PerfVerificationReport = {
  passed: boolean;
  activityRegisteredCount: number;
  effectiveRegistrations: number;
  capacity: number;
  errors: string[];
};

export async function verifyPerfResults(params: {
  prisma: PrismaClient;
  activityId: string;
  capacity: number;
}): Promise<PerfVerificationReport> {
  const errors: string[] = [];

  const activity = await params.prisma.activity.findUnique({ where: { id: params.activityId } });
  if (!activity) {
    return {
      passed: false,
      activityRegisteredCount: 0,
      effectiveRegistrations: 0,
      capacity: params.capacity,
      errors: [`Activity not found: ${params.activityId}`],
    };
  }

  const effectiveRegistrations = await params.prisma.registration.count({
    where: { activityId: params.activityId, canceledAt: null },
  });

  if (activity.registeredCount > params.capacity) {
    errors.push(`registeredCount(${activity.registeredCount}) exceeds capacity(${params.capacity})`);
  }

  if (effectiveRegistrations > params.capacity) {
    errors.push(`effectiveRegistrations(${effectiveRegistrations}) exceeds capacity(${params.capacity})`);
  }

  if (activity.registeredCount !== effectiveRegistrations) {
    errors.push(
      `registeredCount(${activity.registeredCount}) != effectiveRegistrations(${effectiveRegistrations})`,
    );
  }

  return {
    passed: errors.length === 0,
    activityRegisteredCount: activity.registeredCount,
    effectiveRegistrations,
    capacity: params.capacity,
    errors,
  };
}
