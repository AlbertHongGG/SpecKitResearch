import type { Prisma } from '@prisma/client'

export function buildTimeSlotOverlapWhere(input: {
  serviceId: string
  startTime: Date
  endTime: Date
  excludeTimeSlotId?: string
}): Prisma.TimeSlotWhereInput {
  const { serviceId, startTime, endTime, excludeTimeSlotId } = input
  return {
    serviceId,
    ...(excludeTimeSlotId ? { id: { not: excludeTimeSlotId } } : {}),
    startTime: { lt: endTime },
    endTime: { gt: startTime },
  }
}
