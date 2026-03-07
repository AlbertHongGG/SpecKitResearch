import { ConflictException, Injectable } from '@nestjs/common';

import { AuditActions } from '../../../common/audit/audit-actions';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminDisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.disputeCase.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async resolve(id: string, resolution: string, actorId?: string) {
    const found = await this.prisma.disputeCase.findUnique({ where: { id } });
    if (!found) return null;
    if (found.status === 'RESOLVED') {
      throw new ConflictException('Dispute is immutable after resolved');
    }

    const updated = await this.prisma.disputeCase.update({
      where: { id },
      data: { status: 'RESOLVED', resolutionNote: resolution },
    });

    await this.audit.write({
      actorId,
      actorRole: 'ADMIN',
      action: AuditActions.ORDER_CANCEL,
      targetType: 'DisputeCase',
      targetId: id,
      metadata: { resolution },
    });

    return updated;
  }
}
