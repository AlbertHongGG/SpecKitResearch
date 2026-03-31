import type { User } from '@prisma/client'

export type PublicUser = {
  id: string
  email: string
  role: User['role']
  status: User['status']
  createdAt: Date
}

export function sanitizeUser(user: User | PublicUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  }
}
