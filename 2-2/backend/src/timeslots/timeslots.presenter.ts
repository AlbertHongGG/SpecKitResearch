import type { TimeSlot } from '@prisma/client'

export type TimeSlotWithRemainingCapacity = TimeSlot & {
  remainingCapacity: number
}

export function presentTimeSlot(timeSlot: TimeSlot): TimeSlotWithRemainingCapacity {
  return {
    ...timeSlot,
    remainingCapacity: timeSlot.capacity - timeSlot.bookedCount,
  }
}
