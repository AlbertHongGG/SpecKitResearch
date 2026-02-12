import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, LeaveRequestStatus, LedgerType, ApprovalAction, AttachmentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { parseDateOnly } from '../common/date/date-only';
import { countBusinessDaysInclusiveUtc } from '../common/date/business-days';
import { expandDateRangeInclusiveUtc } from './domain/date-range';
import { assertStatus } from './domain/leave-request.state';
import { LeaveApprovalLogService } from './leave-approval-log.service';
import { auditLog } from '../common/logging/audit-logger';

@Injectable()
export class LeaveRequestsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logs: LeaveApprovalLogService,
    ) { }

    async listMy(userId: string, filters: { status?: string; leaveTypeId?: string; start?: string; end?: string; sort?: string }) {
        const where: Prisma.LeaveRequestWhereInput = { userId };

        if (filters.status) where.status = filters.status as any;
        if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;

        if (filters.start || filters.end) {
            where.AND = [];
            if (filters.start) {
                where.AND.push({ endDate: { gte: parseDateOnly(filters.start) } });
            }
            if (filters.end) {
                where.AND.push({ startDate: { lte: parseDateOnly(filters.end) } });
            }
        }

        const orderBy =
            filters.sort === 'createdAtDesc'
                ? ({ createdAt: 'desc' } as const)
                : ({ startDate: 'desc' } as const);

        const items = await this.prisma.leaveRequest.findMany({ where, orderBy });
        return items;
    }

    async getMyDetail(userId: string, id: string) {
        const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
        if (!request) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
        if (request.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });

        const full = await this.prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                user: { include: { department: true } },
                leaveType: true,
                approver: { include: { department: true } },
                attachments: { where: { status: { in: [AttachmentStatus.TEMP, AttachmentStatus.ACTIVE] } }, take: 1, orderBy: { createdAt: 'desc' } },
            },
        });

        if (!full) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
        return full;
    }

    async createDraft(userId: string, input: { leaveTypeId: string; startDate: string; endDate: string; reason?: string; attachmentId?: string }) {
        const start = parseDateOnly(input.startDate);
        const end = parseDateOnly(input.endDate);
        if (end.getTime() < start.getTime()) {
            throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'endDate must be >= startDate' });
        }

        const days = countBusinessDaysInclusiveUtc(start, end);

        return this.prisma.$transaction(async (tx) => {
            const leaveType = await tx.leaveType.findUnique({ where: { id: input.leaveTypeId } });
            if (!leaveType || !leaveType.isActive) {
                throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Invalid leaveTypeId' });
            }

            const request = await tx.leaveRequest.create({
                data: {
                    userId,
                    leaveTypeId: input.leaveTypeId,
                    startDate: start,
                    endDate: end,
                    days,
                    reason: input.reason ?? null,
                    status: LeaveRequestStatus.draft,
                },
                include: {
                    user: { include: { department: true } },
                    leaveType: true,
                    approver: { include: { department: true } },
                },
            });

            const dates = expandDateRangeInclusiveUtc(start, end);
            try {
                await tx.leaveRequestDayBlock.createMany({
                    data: dates.map((d) => ({ userId, date: d, leaveRequestId: request.id })),
                });
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    throw new ConflictException({ code: 'DATE_OVERLAP', message: 'Date range overlaps with an existing leave request' });
                }
                throw e;
            }

            if (input.attachmentId) {
                await tx.attachment.updateMany({
                    where: { id: input.attachmentId, ownerUserId: userId, status: AttachmentStatus.TEMP },
                    data: { leaveRequestId: request.id },
                });
            }

            const attachment = await tx.attachment.findFirst({
                where: { leaveRequestId: request.id, ownerUserId: userId, status: { in: [AttachmentStatus.TEMP, AttachmentStatus.ACTIVE] } },
                orderBy: { createdAt: 'desc' },
            });

            return {
                request,
                attachment,
            };
        });
    }

    async updateDraft(userId: string, id: string, input: { leaveTypeId: string; startDate: string; endDate: string; reason?: string; attachmentId?: string }) {
        const start = parseDateOnly(input.startDate);
        const end = parseDateOnly(input.endDate);
        if (end.getTime() < start.getTime()) {
            throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'endDate must be >= startDate' });
        }

        const days = countBusinessDaysInclusiveUtc(start, end);

        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.leaveRequest.findUnique({ where: { id } });
            if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
            if (existing.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
            assertStatus(existing.status, LeaveRequestStatus.draft, 'Only draft can be updated');

            await tx.leaveRequestDayBlock.deleteMany({ where: { leaveRequestId: id } });

            const dates = expandDateRangeInclusiveUtc(start, end);
            try {
                await tx.leaveRequestDayBlock.createMany({
                    data: dates.map((d) => ({ userId, date: d, leaveRequestId: id })),
                });
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    throw new ConflictException({ code: 'DATE_OVERLAP', message: 'Date range overlaps with an existing leave request' });
                }
                throw e;
            }

            const updated = await tx.leaveRequest.update({
                where: { id },
                data: {
                    leaveTypeId: input.leaveTypeId,
                    startDate: start,
                    endDate: end,
                    days,
                    reason: input.reason ?? null,
                },
                include: {
                    user: { include: { department: true } },
                    leaveType: true,
                    approver: { include: { department: true } },
                },
            });

            if (input.attachmentId) {
                await tx.attachment.updateMany({
                    where: { id: input.attachmentId, ownerUserId: userId, status: AttachmentStatus.TEMP },
                    data: { leaveRequestId: id },
                });
            }

            const attachment = await tx.attachment.findFirst({
                where: { leaveRequestId: id, ownerUserId: userId, status: { in: [AttachmentStatus.TEMP, AttachmentStatus.ACTIVE] } },
                orderBy: { createdAt: 'desc' },
            });

            return { request: updated, attachment };
        });
    }

    async submit(userId: string, id: string) {
        const year = new Date().getUTCFullYear();

        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                const request = await tx.leaveRequest.findUnique({
                    where: { id },
                    include: { leaveType: true },
                });
                if (!request) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
                if (request.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
                assertStatus(request.status, LeaveRequestStatus.draft, 'Only draft can be submitted');

                if (request.leaveType.requireAttachment) {
                    const hasAttachment = await tx.attachment.findFirst({
                        where: { leaveRequestId: id, ownerUserId: userId, status: { in: [AttachmentStatus.TEMP, AttachmentStatus.ACTIVE] } },
                    });
                    if (!hasAttachment) {
                        throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Attachment required' });
                    }
                }

                const balance = await tx.leaveBalance.findUnique({
                    where: { userId_leaveTypeId_year: { userId, leaveTypeId: request.leaveTypeId, year } },
                });
                if (!balance) {
                    throw new ConflictException({ code: 'BALANCE_NOT_FOUND', message: 'Leave balance not initialized' });
                }

                const available = balance.quota - balance.usedDays - balance.reservedDays;
                if (available < request.days) {
                    throw new ConflictException({ code: 'INSUFFICIENT_BALANCE', message: 'Not enough available days' });
                }

                const updated = await tx.leaveRequest.update({
                    where: { id },
                    data: { status: LeaveRequestStatus.submitted, submittedAt: new Date() },
                });

                try {
                    await tx.leaveBalanceLedger.create({
                        data: {
                            leaveBalanceId: balance.id,
                            leaveRequestId: id,
                            type: LedgerType.reserve,
                            days: request.days,
                        },
                    });
                    await tx.leaveBalance.update({
                        where: { id: balance.id },
                        data: { reservedDays: { increment: request.days } },
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                        // idempotent reserve
                    } else {
                        throw e;
                    }
                }

                await this.logs.create(tx, id, userId, ApprovalAction.submit);

                await tx.attachment.updateMany({
                    where: { leaveRequestId: id, ownerUserId: userId, status: AttachmentStatus.TEMP },
                    data: { status: AttachmentStatus.ACTIVE },
                });

                return updated;
            });

            auditLog({ actorId: userId, leaveRequestId: id, action: 'leave_request.submit', result: 'success' });
            return updated;
        } catch (e: any) {
            auditLog({
                actorId: userId,
                leaveRequestId: id,
                action: 'leave_request.submit',
                result: 'failure',
                error: { name: e?.name, message: e?.message },
            });
            throw e;
        }
    }

    async cancel(userId: string, id: string) {
        const year = new Date().getUTCFullYear();

        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                const request = await tx.leaveRequest.findUnique({ where: { id } });
                if (!request) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
                if (request.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
                assertStatus(request.status, LeaveRequestStatus.submitted, 'Only submitted can be cancelled');

                const updated = await tx.leaveRequest.update({
                    where: { id },
                    data: { status: LeaveRequestStatus.cancelled, cancelledAt: new Date() },
                });

                const balance = await tx.leaveBalance.findUnique({
                    where: { userId_leaveTypeId_year: { userId, leaveTypeId: request.leaveTypeId, year } },
                });
                if (!balance) throw new ConflictException({ code: 'BALANCE_NOT_FOUND', message: 'Leave balance not initialized' });

                try {
                    await tx.leaveBalanceLedger.create({
                        data: {
                            leaveBalanceId: balance.id,
                            leaveRequestId: id,
                            type: LedgerType.release_reserve,
                            days: request.days,
                        },
                    });
                    await tx.leaveBalance.update({
                        where: { id: balance.id },
                        data: { reservedDays: { decrement: request.days } },
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                        // idempotent
                    } else {
                        throw e;
                    }
                }

                await tx.leaveRequestDayBlock.deleteMany({ where: { leaveRequestId: id } });

                await this.logs.create(tx, id, userId, ApprovalAction.cancel);

                return updated;
            });

            auditLog({ actorId: userId, leaveRequestId: id, action: 'leave_request.cancel', result: 'success' });
            return updated;
        } catch (e: any) {
            auditLog({
                actorId: userId,
                leaveRequestId: id,
                action: 'leave_request.cancel',
                result: 'failure',
                error: { name: e?.name, message: e?.message },
            });
            throw e;
        }
    }
}
