import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ApprovalAction, LeaveRequestStatus, LedgerType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ManagerScopeService } from '../users/permissions/manager-scope.service';
import { auditLog } from '../common/logging/audit-logger';

@Injectable()
export class ManagerService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly scope: ManagerScopeService,
    ) { }

    async listPending(managerId: string, filters: { start?: string; end?: string; leaveTypeId?: string; employeeId?: string }) {
        const managedEmployees = await this.prisma.user.findMany({
            where: {
                managerId,
            },
            select: { id: true },
        });

        const ids = managedEmployees.map((u) => u.id);

        const where: Prisma.LeaveRequestWhereInput = {
            status: LeaveRequestStatus.submitted,
            userId: { in: ids },
        };

        if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;
        if (filters.employeeId) where.userId = filters.employeeId;

        if (filters.start || filters.end) {
            where.AND = [];
            if (filters.start) where.AND.push({ endDate: { gte: new Date(`${filters.start}T00:00:00.000Z`) } });
            if (filters.end) where.AND.push({ startDate: { lte: new Date(`${filters.end}T00:00:00.000Z`) } });
        }

        const items = await this.prisma.leaveRequest.findMany({
            where,
            orderBy: { submittedAt: 'asc' },
            include: {
                user: { include: { department: true } },
                leaveType: true,
            },
        });

        return items;
    }

    async approve(managerId: string, leaveRequestId: string) {
        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                const request = await tx.leaveRequest.findUnique({ where: { id: leaveRequestId } });
                if (!request) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });

                await this.scope.assertCanManage(managerId, request.userId);

                if (request.status !== LeaveRequestStatus.submitted) {
                    throw new ConflictException({ code: 'INVALID_STATE_TRANSITION', message: 'Only submitted can be approved' });
                }

                const year = new Date().getUTCFullYear();
                const balance = await tx.leaveBalance.findUnique({
                    where: { userId_leaveTypeId_year: { userId: request.userId, leaveTypeId: request.leaveTypeId, year } },
                });
                if (!balance) throw new ConflictException({ code: 'BALANCE_NOT_FOUND', message: 'Leave balance not initialized' });

                const updated = await tx.leaveRequest.update({
                    where: { id: leaveRequestId },
                    data: {
                        status: LeaveRequestStatus.approved,
                        approverId: managerId,
                        decidedAt: new Date(),
                    },
                });

                try {
                    await tx.leaveBalanceLedger.create({
                        data: {
                            leaveBalanceId: balance.id,
                            leaveRequestId,
                            type: LedgerType.deduct,
                            days: request.days,
                        },
                    });
                    await tx.leaveBalance.update({
                        where: { id: balance.id },
                        data: {
                            reservedDays: { decrement: request.days },
                            usedDays: { increment: request.days },
                        },
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                        // idempotent
                    } else {
                        throw e;
                    }
                }

                await tx.leaveApprovalLog.create({
                    data: {
                        leaveRequestId,
                        actorId: managerId,
                        action: ApprovalAction.approve,
                    },
                });

                return updated;
            });

            auditLog({ actorId: managerId, leaveRequestId, action: 'manager.approve', result: 'success' });
            return updated;
        } catch (e: any) {
            auditLog({
                actorId: managerId,
                leaveRequestId,
                action: 'manager.approve',
                result: 'failure',
                error: { name: e?.name, message: e?.message },
            });
            throw e;
        }
    }

    async reject(managerId: string, leaveRequestId: string, rejectionReason: string) {
        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                const request = await tx.leaveRequest.findUnique({ where: { id: leaveRequestId } });
                if (!request) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });

                await this.scope.assertCanManage(managerId, request.userId);

                if (request.status !== LeaveRequestStatus.submitted) {
                    throw new ConflictException({ code: 'INVALID_STATE_TRANSITION', message: 'Only submitted can be rejected' });
                }

                const year = new Date().getUTCFullYear();
                const balance = await tx.leaveBalance.findUnique({
                    where: { userId_leaveTypeId_year: { userId: request.userId, leaveTypeId: request.leaveTypeId, year } },
                });
                if (!balance) throw new ConflictException({ code: 'BALANCE_NOT_FOUND', message: 'Leave balance not initialized' });

                const updated = await tx.leaveRequest.update({
                    where: { id: leaveRequestId },
                    data: {
                        status: LeaveRequestStatus.rejected,
                        approverId: managerId,
                        decidedAt: new Date(),
                        rejectionReason,
                    },
                });

                try {
                    await tx.leaveBalanceLedger.create({
                        data: {
                            leaveBalanceId: balance.id,
                            leaveRequestId,
                            type: LedgerType.release_reserve,
                            days: request.days,
                        },
                    });
                    await tx.leaveBalance.update({
                        where: { id: balance.id },
                        data: {
                            reservedDays: { decrement: request.days },
                        },
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                        // idempotent
                    } else {
                        throw e;
                    }
                }

                await tx.leaveRequestDayBlock.deleteMany({ where: { leaveRequestId } });

                await tx.leaveApprovalLog.create({
                    data: {
                        leaveRequestId,
                        actorId: managerId,
                        action: ApprovalAction.reject,
                        note: rejectionReason,
                    },
                });

                return updated;
            });

            auditLog({ actorId: managerId, leaveRequestId, action: 'manager.reject', result: 'success' });
            return updated;
        } catch (e: any) {
            auditLog({
                actorId: managerId,
                leaveRequestId,
                action: 'manager.reject',
                result: 'failure',
                error: { name: e?.name, message: e?.message },
            });
            throw e;
        }
    }

}
