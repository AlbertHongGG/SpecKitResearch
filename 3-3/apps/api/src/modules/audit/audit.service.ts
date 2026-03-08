import { Injectable } from '@nestjs/common';
import type { ActorRoleContext } from '@sb/db';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async writeAuditLog(input: {
    actorUserId?: string | null;
    actorRoleContext: ActorRoleContext;
    organizationId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    payload: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorRoleContext: input.actorRoleContext,
        organizationId: input.organizationId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        payload: input.payload as any,
      },
    });
  }
}
