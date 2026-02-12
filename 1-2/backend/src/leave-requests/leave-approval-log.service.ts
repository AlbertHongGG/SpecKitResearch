import { Injectable } from '@nestjs/common';
import { ApprovalAction, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class LeaveApprovalLogService {
    constructor(private readonly prisma: PrismaService) { }

    create(
        client: Prisma.TransactionClient | PrismaService,
        leaveRequestId: string,
        actorId: string,
        action: ApprovalAction,
        note?: string,
    ) {
        return client.leaveApprovalLog.create({
            data: {
                leaveRequestId,
                actorId,
                action,
                note,
            },
        });
    }
}
