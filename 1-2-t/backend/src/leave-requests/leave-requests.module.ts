import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { LeaveBalanceModule } from '../leave-balance/leave-balance.module';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsRepository } from './leave-requests.repo';
import { LeaveRequestsService } from './leave-requests.service';
import { ListMyLeaveRequestsService } from './list-my-leave-requests.service';
import { PendingApprovalsController } from './pending-approvals.controller';
import { PendingApprovalsService } from './pending-approvals.service';

@Module({
  imports: [UsersModule, LeaveBalanceModule],
  controllers: [LeaveRequestsController, PendingApprovalsController],
  providers: [
    PrismaService,
    LeaveRequestsRepository,
    LeaveRequestsService,
    ListMyLeaveRequestsService,
    PendingApprovalsService,
  ],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
