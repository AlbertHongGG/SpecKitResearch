export type UserRole = 'USER' | 'PROVIDER' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'SUSPENDED'

export type ErrorResponse = {
  code: string
  message: string
  requestId: string
  details?: Record<string, unknown> | null
}

export type User = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

export type ServiceStatus = 'ACTIVE' | 'INACTIVE'

export type Service = {
  id: string
  providerId: string
  name: string
  description: string
  durationMinutes: number
  status: ServiceStatus
  createdAt: string
}

export type TimeSlotStatus = 'OPEN' | 'CLOSED'

export type TimeSlot = {
  id: string
  serviceId: string
  startTime: string
  endTime: string
  capacity: number
  bookedCount: number
  remainingCapacity: number
  status: TimeSlotStatus
  cancelDeadlineAt: string
  createdAt: string
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export type Booking = {
  id: string
  userId: string
  timeSlotId: string
  status: BookingStatus
  createdAt: string
  cancelledAt?: string | null
  completedAt?: string | null
}
