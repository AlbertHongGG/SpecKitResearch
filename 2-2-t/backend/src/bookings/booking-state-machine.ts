import { BookingStatus } from '../generated/prisma/client';

export function isBookingStatusTransitionAllowed(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;

  if (from === BookingStatus.PENDING) {
    return to === BookingStatus.CONFIRMED || to === BookingStatus.CANCELLED;
  }

  if (from === BookingStatus.CONFIRMED) {
    return to === BookingStatus.COMPLETED || to === BookingStatus.CANCELLED;
  }

  return false;
}
