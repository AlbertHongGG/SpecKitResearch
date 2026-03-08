import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  append(input: {
    actorUserId: string;
    actorRoleContext: string;
    organizationId?: string;
    action: string;
    targetType: string;
    targetId?: string;
    payload?: Record<string, unknown>;
    traceId?: string;
    correlationId?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorRoleContext: input.actorRoleContext,
        organizationId: input.organizationId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        payload: JSON.stringify(input.payload ?? {}),
        traceId: input.traceId,
        correlationId: input.correlationId,
      },
    });
  }
}
