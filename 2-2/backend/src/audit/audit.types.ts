import type { Prisma } from '@prisma/client'

export type AuditLogInput = {
  actorUserId: string
  action: string
  targetType: string
  targetId: string
  beforeData?: Prisma.InputJsonValue | null
  afterData?: Prisma.InputJsonValue | null
}
