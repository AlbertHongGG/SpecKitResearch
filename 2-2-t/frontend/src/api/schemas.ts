import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['USER', 'PROVIDER', 'ADMIN']),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: MeResponseSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const ForgotPasswordResponseSchema = z.object({
  ok: z.boolean(),
});

export const ServiceSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  durationMinutes: z.number().int(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  createdAt: z.string().datetime(),
});

export type Service = z.infer<typeof ServiceSchema>;

export const ServicesListResponseSchema = z.object({
  items: z.array(ServiceSchema),
});

export const TimeSlotSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  capacity: z.number().int(),
  bookedCount: z.number().int(),
  remaining: z.number().int(),
  cancelDeadlineAt: z.string().datetime(),
  status: z.enum(['OPEN', 'CLOSED']),
});

export type TimeSlot = z.infer<typeof TimeSlotSchema>;

export const ServiceDetailResponseSchema = z.object({
  service: ServiceSchema,
  timeSlots: z.array(TimeSlotSchema),
});

export const TimeSlotsListResponseSchema = z.object({
  items: z.array(TimeSlotSchema),
});

export const BookingStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  status: BookingStatusSchema,
  createdAt: z.string().datetime(),
  cancelledAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type Booking = z.infer<typeof BookingSchema>;

export const MyBookingsResponseSchema = z.object({
  items: z.array(BookingSchema),
});

export const ProviderBookingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  timeSlotId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  cancelDeadlineAt: z.string().datetime(),
  status: BookingStatusSchema,
  createdAt: z.string().datetime(),
});

export type ProviderBooking = z.infer<typeof ProviderBookingSchema>;

export const ProviderBookingsResponseSchema = z.object({
  items: z.array(ProviderBookingSchema),
});

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['USER', 'PROVIDER', 'ADMIN']),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  createdAt: z.string().datetime(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

export const AdminUsersListResponseSchema = z.object({
  items: z.array(AdminUserSchema),
});

export const ReportSummarySchema = z.object({
  totals: z.object({
    bookings: z.number().int(),
    cancelled: z.number().int(),
  }),
  cancellationRate: z.number(),
  activeServices: z.number().int(),
  generatedAt: z.string().datetime(),
});

export type ReportSummary = z.infer<typeof ReportSummarySchema>;
