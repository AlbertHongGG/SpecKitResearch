import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApprovalAction, LeaveRequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertDateOnly } from '../common/date/date-only';
import { logger } from '../common/observability/logger';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { UsersService } from '../users/users.service';
import { calculateLeaveDays } from './leave-request.calc';
import { hasDateConflict } from './leave-request.conflict';
import { LeaveRequestsRepository } from './leave-requests.repo';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: LeaveRequestsRepository,
    private readonly leaveBalance: LeaveBalanceService,
    private readonly users: UsersService,
  ) {}

  async createDraft(params: {
    userId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentId?: string;
  }) {
    assertDateOnly(params.startDate, 'start_date');
    assertDateOnly(params.endDate, 'end_date');

    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: params.leaveTypeId },
    });
    if (!leaveType || !leaveType.isActive) {
      throw new UnprocessableEntityException({
        code: 'validation_error',
        message: 'Invalid leave_type_id',
      });
    }

    const days = calculateLeaveDays(params.startDate, params.endDate);
    if (days <= 0) {
      throw new UnprocessableEntityException({
        code: 'validation_error',
        message: 'Invalid date range',
      });
    }

    const existing = await this.repo.findForConflictCheck(
      params.userId,
      params.startDate,
      params.endDate,
    );
    if (hasDateConflict(existing, params.startDate, params.endDate)) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Date range overlaps an existing request',
      });
    }

    const created = await this.prisma.leaveRequest.create({
      data: {
        userId: params.userId,
        leaveTypeId: params.leaveTypeId,
        startDate: params.startDate,
        endDate: params.endDate,
        days,
        reason: params.reason,
        attachmentId: params.attachmentId,
        status: LeaveRequestStatus.draft,
      },
      include: { leaveType: true },
    });

    logger.info(
      {
        action: 'leave_request.create_draft',
        actorId: params.userId,
        leaveRequestId: created.id,
        leaveTypeId: created.leaveTypeId,
        startDate: created.startDate,
        endDate: created.endDate,
        days: created.days,
      },
      'Leave request draft created',
    );

    return created;
  }

  async updateDraft(params: {
    userId: string;
    id: string;
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    attachmentId?: string | null;
  }) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id: params.id },
    });
    if (!existing)
      throw new NotFoundException({
        code: 'not_found',
        message: 'Leave request not found',
      });
    if (existing.userId !== params.userId) {
      throw new ForbiddenException({ code: 'forbidden', message: 'Not owner' });
    }
    if (existing.status !== LeaveRequestStatus.draft) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Only draft can be updated',
      });
    }

    const leaveTypeId = params.leaveTypeId ?? existing.leaveTypeId;
    const startDate = params.startDate ?? existing.startDate;
    const endDate = params.endDate ?? existing.endDate;

    assertDateOnly(startDate, 'start_date');
    assertDateOnly(endDate, 'end_date');

    const days = calculateLeaveDays(startDate, endDate);
    if (days <= 0) {
      throw new UnprocessableEntityException({
        code: 'validation_error',
        message: 'Invalid date range',
      });
    }

    const conflicts = await this.repo.findForConflictCheck(
      params.userId,
      startDate,
      endDate,
    );
    if (hasDateConflict(conflicts, startDate, endDate, existing.id)) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Date range overlaps an existing request',
      });
    }

    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType || !leaveType.isActive) {
      throw new UnprocessableEntityException({
        code: 'validation_error',
        message: 'Invalid leave_type_id',
      });
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: existing.id },
      data: {
        leaveTypeId,
        startDate,
        endDate,
        days,
        reason: params.reason ?? existing.reason,
        attachmentId:
          params.attachmentId === undefined
            ? existing.attachmentId
            : params.attachmentId,
      },
      include: { leaveType: true },
    });

    logger.info(
      {
        action: 'leave_request.update_draft',
        actorId: params.userId,
        leaveRequestId: existing.id,
        leaveTypeId,
        startDate,
        endDate,
        days,
      },
      'Leave request draft updated',
    );

    return updated;
  }

  async submit(params: { userId: string; id: string }) {
    const lr = await this.repo.findById(params.id);
    if (!lr)
      throw new NotFoundException({
        code: 'not_found',
        message: 'Leave request not found',
      });
    if (lr.userId !== params.userId)
      throw new ForbiddenException({ code: 'forbidden', message: 'Not owner' });
    if (lr.status !== LeaveRequestStatus.draft) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Only draft can be submitted',
      });
    }
    if (lr.leaveType.requireAttachment && !lr.attachmentId) {
      throw new UnprocessableEntityException({
        code: 'validation_error',
        message: 'Attachment required',
      });
    }

    const conflicts = await this.repo.findForConflictCheck(
      params.userId,
      lr.startDate,
      lr.endDate,
    );
    if (hasDateConflict(conflicts, lr.startDate, lr.endDate, lr.id)) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Date range overlaps an existing request',
      });
    }

    const year = Number(lr.startDate.slice(0, 4));

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: {
          id: lr.id,
          userId: params.userId,
          status: LeaveRequestStatus.draft,
        },
        data: { status: LeaveRequestStatus.submitted, submittedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new ConflictException({
          code: 'conflict',
          message: 'State conflict',
        });
      }

      await tx.leaveApprovalLog.create({
        data: {
          leaveRequestId: lr.id,
          actorId: params.userId,
          action: ApprovalAction.submit,
        },
      });

      await this.leaveBalance.reserveDaysTx(tx as unknown as PrismaService, {
        userId: params.userId,
        leaveTypeId: lr.leaveTypeId,
        year,
        leaveRequestId: lr.id,
        days: lr.days,
      });
    });

    logger.info(
      {
        action: 'leave_request.submit',
        actorId: params.userId,
        leaveRequestId: lr.id,
        leaveTypeId: lr.leaveTypeId,
        startDate: lr.startDate,
        endDate: lr.endDate,
        days: lr.days,
      },
      'Leave request submitted',
    );

    return this.repo.findById(lr.id);
  }

  async cancel(params: { userId: string; id: string }) {
    const lr = await this.repo.findById(params.id);
    if (!lr)
      throw new NotFoundException({
        code: 'not_found',
        message: 'Leave request not found',
      });
    if (lr.userId !== params.userId)
      throw new ForbiddenException({ code: 'forbidden', message: 'Not owner' });
    if (lr.status !== LeaveRequestStatus.submitted) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Only submitted can be cancelled',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: {
          id: lr.id,
          userId: params.userId,
          status: LeaveRequestStatus.submitted,
        },
        data: { status: LeaveRequestStatus.cancelled, cancelledAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new ConflictException({
          code: 'conflict',
          message: 'State conflict',
        });
      }

      await tx.leaveApprovalLog.create({
        data: {
          leaveRequestId: lr.id,
          actorId: params.userId,
          action: ApprovalAction.cancel,
        },
      });

      await this.leaveBalance.releaseReserveTx(tx as unknown as PrismaService, {
        leaveRequestId: lr.id,
        days: lr.days,
      });
    });

    logger.info(
      {
        action: 'leave_request.cancel',
        actorId: params.userId,
        leaveRequestId: lr.id,
        leaveTypeId: lr.leaveTypeId,
        startDate: lr.startDate,
        endDate: lr.endDate,
        days: lr.days,
      },
      'Leave request cancelled',
    );

    return this.repo.findById(lr.id);
  }

  async approve(params: { managerId: string; id: string; note?: string }) {
    const lr = await this.repo.findById(params.id);
    if (!lr)
      throw new NotFoundException({
        code: 'not_found',
        message: 'Leave request not found',
      });
    if (lr.status !== LeaveRequestStatus.submitted) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Only submitted can be approved',
      });
    }

    const manager = await this.users.findById(params.managerId);
    if (manager.role !== Role.manager)
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Manager only',
      });
    const inScope = await this.users.isDirectManagerOf(
      params.managerId,
      lr.userId,
    );
    if (!inScope)
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Out of scope',
      });

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: { id: lr.id, status: LeaveRequestStatus.submitted },
        data: {
          status: LeaveRequestStatus.approved,
          approverId: params.managerId,
          decidedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException({
          code: 'conflict',
          message: 'State conflict',
        });
      }

      await tx.leaveApprovalLog.create({
        data: {
          leaveRequestId: lr.id,
          actorId: params.managerId,
          action: ApprovalAction.approve,
          note: params.note,
        },
      });

      await this.leaveBalance.deductReservedTx(tx as unknown as PrismaService, {
        leaveRequestId: lr.id,
        days: lr.days,
      });
    });

    logger.info(
      {
        action: 'leave_request.approve',
        actorId: params.managerId,
        leaveRequestId: lr.id,
        requestUserId: lr.userId,
        leaveTypeId: lr.leaveTypeId,
        startDate: lr.startDate,
        endDate: lr.endDate,
        days: lr.days,
      },
      'Leave request approved',
    );

    return this.repo.findById(lr.id);
  }

  async reject(params: { managerId: string; id: string; reason: string }) {
    const lr = await this.repo.findById(params.id);
    if (!lr)
      throw new NotFoundException({
        code: 'not_found',
        message: 'Leave request not found',
      });
    if (lr.status !== LeaveRequestStatus.submitted) {
      throw new ConflictException({
        code: 'conflict',
        message: 'Only submitted can be rejected',
      });
    }

    const manager = await this.users.findById(params.managerId);
    if (manager.role !== Role.manager)
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Manager only',
      });
    const inScope = await this.users.isDirectManagerOf(
      params.managerId,
      lr.userId,
    );
    if (!inScope)
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Out of scope',
      });

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: { id: lr.id, status: LeaveRequestStatus.submitted },
        data: {
          status: LeaveRequestStatus.rejected,
          approverId: params.managerId,
          rejectionReason: params.reason,
          decidedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException({
          code: 'conflict',
          message: 'State conflict',
        });
      }

      await tx.leaveApprovalLog.create({
        data: {
          leaveRequestId: lr.id,
          actorId: params.managerId,
          action: ApprovalAction.reject,
          note: params.reason,
        },
      });

      await this.leaveBalance.releaseReserveTx(tx as unknown as PrismaService, {
        leaveRequestId: lr.id,
        days: lr.days,
      });
    });

    logger.info(
      {
        action: 'leave_request.reject',
        actorId: params.managerId,
        leaveRequestId: lr.id,
        requestUserId: lr.userId,
        leaveTypeId: lr.leaveTypeId,
        startDate: lr.startDate,
        endDate: lr.endDate,
        days: lr.days,
      },
      'Leave request rejected',
    );

    return this.repo.findById(lr.id);
  }
}
