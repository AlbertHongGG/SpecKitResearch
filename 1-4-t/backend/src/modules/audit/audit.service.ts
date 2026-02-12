import { Injectable } from '@nestjs/common'
import type { AuditAction, AuditEntityType, Prisma } from '@prisma/client'
import type { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class AuditService {
  async append(params: {
    tx: Prisma.TransactionClient | PrismaService
    entityType: AuditEntityType
    entityId: string
    action: AuditAction
    actorId: string
    metadata: unknown
  }) {
    const metadataJson = JSON.stringify(params.metadata ?? {})

    return params.tx.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId,
        metadataJson,
      },
    })
  }
}
