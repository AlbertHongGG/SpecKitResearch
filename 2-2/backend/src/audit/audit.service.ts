import { Injectable } from '@nestjs/common'

import type { AuditLog } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { AuditLogInput } from './audit.types'
import { PrismaService } from '../common/db/prisma.service'

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditLogInput, tx?: Prisma.TransactionClient): Promise<AuditLog> {
    const client = tx ?? this.prisma
    return client.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        beforeData: input.beforeData ?? undefined,
        afterData: input.afterData ?? undefined,
      },
    })
  }
}
