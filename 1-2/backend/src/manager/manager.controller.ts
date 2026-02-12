import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { CurrentUser } from '../common/http/current-user.decorator';
import { CsrfGuard } from '../auth/csrf/csrf.guard';
import { ManagerService } from './manager.service';
import { RejectRequestDto } from './dto/reject.dto';
import { toLeaveRequestDetail } from '../leave-requests/leave-requests.mapper';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('manager')
@UseGuards(AuthGuard, RolesGuard)
@Roles('manager')
export class ManagerController {
    constructor(
        private readonly manager: ManagerService,
        private readonly prisma: PrismaService,
    ) { }

    @Get('pending-leave-requests')
    async pending(
        @CurrentUser() user: { id: string },
        @Query('start') start?: string,
        @Query('end') end?: string,
        @Query('leaveTypeId') leaveTypeId?: string,
        @Query('employeeId') employeeId?: string,
    ) {
        const items = await this.manager.listPending(user.id, { start, end, leaveTypeId, employeeId });

        return {
            items: items.map((r) => ({
                id: r.id,
                employee: {
                    id: r.user.id,
                    name: r.user.name,
                    department: { id: r.user.department.id, name: r.user.department.name },
                },
                leaveType: {
                    id: r.leaveType.id,
                    name: r.leaveType.name,
                    annualQuota: r.leaveType.annualQuota,
                    carryOver: r.leaveType.carryOver,
                    requireAttachment: r.leaveType.requireAttachment,
                    isActive: r.leaveType.isActive,
                },
                startDate: r.startDate.toISOString().slice(0, 10),
                endDate: r.endDate.toISOString().slice(0, 10),
                days: r.days,
                submittedAt: r.submittedAt?.toISOString() ?? null,
            })),
        };
    }

    @UseGuards(CsrfGuard)
    @Post('leave-requests/:id/approve')
    @HttpCode(200)
    async approve(@CurrentUser() user: { id: string }, @Param('id') id: string) {
        const updated = await this.manager.approve(user.id, id);
        const full = await this.prisma.leaveRequest.findUnique({
            where: { id: updated.id },
            include: {
                user: { include: { department: true } },
                leaveType: true,
                approver: { include: { department: true } },
                attachments: { take: 1, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!full) return updated;
        const attachment = full.attachments?.[0] ?? null;
        return toLeaveRequestDetail({
            request: full,
            employee: full.user,
            leaveType: full.leaveType,
            approver: full.approver,
            attachment,
        });
    }

    @UseGuards(CsrfGuard)
    @Post('leave-requests/:id/reject')
    @HttpCode(200)
    async reject(
        @CurrentUser() user: { id: string },
        @Param('id') id: string,
        @Body() body: RejectRequestDto,
    ) {
        const updated = await this.manager.reject(user.id, id, body.rejectionReason);
        const full = await this.prisma.leaveRequest.findUnique({
            where: { id: updated.id },
            include: {
                user: { include: { department: true } },
                leaveType: true,
                approver: { include: { department: true } },
                attachments: { take: 1, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!full) return updated;
        const attachment = full.attachments?.[0] ?? null;
        return toLeaveRequestDetail({
            request: full,
            employee: full.user,
            leaveType: full.leaveType,
            approver: full.approver,
            attachment,
        });
    }
}
