import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string
    actorUserId?: string
    entityType?: string
    entityId?: string
    metadata?: Record<string, unknown>
    requestId?: string
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          actorUserId: params.actorUserId,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: params.metadata as any,
          requestId: params.requestId,
        },
      })
    } catch (e) {
      this.logger.warn('audit_log_write_failed')
    }
  }
}
