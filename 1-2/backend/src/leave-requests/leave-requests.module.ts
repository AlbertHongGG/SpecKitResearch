import { Module } from '@nestjs/common';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveApprovalLogService } from './leave-approval-log.service';

@Module({
    controllers: [LeaveRequestsController],
    providers: [LeaveRequestsService, LeaveApprovalLogService],
    exports: [LeaveRequestsService],
})
export class LeaveRequestsModule { }
