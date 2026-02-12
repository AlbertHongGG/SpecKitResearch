import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(params: {
    actorUserId: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as any,
      },
    });
  }
}
