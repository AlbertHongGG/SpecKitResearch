import { Injectable } from '@nestjs/common';
import { AuditResult } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export type AuditWriteInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  result: AuditResult;
  metadata?: Prisma.InputJsonValue;
};

export type RegistrationExportAuditInput = {
  actorUserId: string;
  activityId: string;
  rowCount: number;
  result: AuditResult;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditWriteInput) {
    await this.prisma.auditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        result: input.result,
        metadata: input.metadata,
      },
    });
  }

  async writeRegistrationExportCsv(input: RegistrationExportAuditInput) {
    await this.write({
      actorUserId: input.actorUserId,
      action: 'registration.export_csv',
      targetType: 'activity',
      targetId: input.activityId,
      result: input.result,
      metadata: { rowCount: input.rowCount },
    });
  }
}
