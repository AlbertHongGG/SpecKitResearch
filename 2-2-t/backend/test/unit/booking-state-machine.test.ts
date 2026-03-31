import { describe, expect, it } from 'vitest';

import { BookingStatus } from '../../src/generated/prisma/client';
import { isBookingStatusTransitionAllowed } from '../../src/bookings/booking-state-machine';

describe('US3 booking status state machine', () => {
  it('allows PENDING -> CONFIRMED/CANCELLED', () => {
    expect(isBookingStatusTransitionAllowed(BookingStatus.PENDING, BookingStatus.CONFIRMED)).toBe(true);
    expect(isBookingStatusTransitionAllowed(BookingStatus.PENDING, BookingStatus.CANCELLED)).toBe(true);
    expect(isBookingStatusTransitionAllowed(BookingStatus.PENDING, BookingStatus.COMPLETED)).toBe(false);
  });

  it('allows CONFIRMED -> COMPLETED/CANCELLED', () => {
    expect(isBookingStatusTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.COMPLETED)).toBe(true);
    expect(isBookingStatusTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).toBe(true);
    expect(isBookingStatusTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.PENDING)).toBe(false);
  });

  it('disallows transitions from CANCELLED/COMPLETED', () => {
    expect(isBookingStatusTransitionAllowed(BookingStatus.CANCELLED, BookingStatus.PENDING)).toBe(false);
    expect(isBookingStatusTransitionAllowed(BookingStatus.CANCELLED, BookingStatus.CONFIRMED)).toBe(false);
    expect(isBookingStatusTransitionAllowed(BookingStatus.CANCELLED, BookingStatus.COMPLETED)).toBe(false);

    expect(isBookingStatusTransitionAllowed(BookingStatus.COMPLETED, BookingStatus.PENDING)).toBe(false);
    expect(isBookingStatusTransitionAllowed(BookingStatus.COMPLETED, BookingStatus.CONFIRMED)).toBe(false);
    expect(isBookingStatusTransitionAllowed(BookingStatus.COMPLETED, BookingStatus.CANCELLED)).toBe(false);
  });

  it('treats same-status as allowed (idempotent)', () => {
    expect(isBookingStatusTransitionAllowed(BookingStatus.PENDING, BookingStatus.PENDING)).toBe(true);
    expect(isBookingStatusTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.CONFIRMED)).toBe(true);
    expect(isBookingStatusTransitionAllowed(BookingStatus.CANCELLED, BookingStatus.CANCELLED)).toBe(true);
    expect(isBookingStatusTransitionAllowed(BookingStatus.COMPLETED, BookingStatus.COMPLETED)).toBe(true);
  });
});
