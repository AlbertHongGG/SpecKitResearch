import { ConflictException } from '@nestjs/common'
import type { BookingStatus } from '@prisma/client'

import { ErrorCodes } from '../common/errors/error-codes'

const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus) {
  const allowed = allowedTransitions[from] ?? []
  if (!allowed.includes(to)) {
    throw new ConflictException({
      code: ErrorCodes.INVALID_TRANSITION,
      message: `Invalid booking status transition: ${from} -> ${to}`,
    })
  }
}
