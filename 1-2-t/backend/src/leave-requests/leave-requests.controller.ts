import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LeaveRequestStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../common/guards/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from '../users/users.service';
import {
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
} from './dto/decision.dto';
import {
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
} from './dto/leave-request.dto';
import { ListMyLeaveRequestsService } from './list-my-leave-requests.service';
import { LeaveRequestsRepository } from './leave-requests.repo';
import { LeaveRequestsService } from './leave-requests.service';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(
    private readonly leaveRequests: LeaveRequestsService,
    private readonly repo: LeaveRequestsRepository,
    private readonly listMy: ListMyLeaveRequestsService,
    private readonly users: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createDraft(
    @Req() req: Request & { user?: AuthUser },
    @Body() dto: CreateLeaveRequestDto,
  ) {
    const created = await this.leaveRequests.createDraft({
      userId: req.user!.userId,
      leaveTypeId: dto.leave_type_id,
      startDate: dto.start_date,
      endDate: dto.end_date,
      reason: dto.reason,
      attachmentId: dto.attachment_id,
    });

    return {
      id: created.id,
      leave_type: {
        id: created.leaveType.id,
        name: created.leaveType.name,
        annual_quota: created.leaveType.annualQuota,
        carry_over: created.leaveType.carryOver,
        require_attachment: created.leaveType.requireAttachment,
        is_active: created.leaveType.isActive,
      },
      start_date: created.startDate,
      end_date: created.endDate,
      days: created.days,
      status: created.status,
      submitted_at: created.submittedAt,
      decided_at: created.decidedAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateDraft(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
    @Body() dto: UpdateLeaveRequestDto,
  ) {
    const updated = await this.leaveRequests.updateDraft({
      userId: req.user!.userId,
      id,
      leaveTypeId: dto.leave_type_id,
      startDate: dto.start_date,
      endDate: dto.end_date,
      reason: dto.reason,
      attachmentId: dto.attachment_id,
    });

    return {
      id: updated.id,
      leave_type: {
        id: updated.leaveType.id,
        name: updated.leaveType.name,
        annual_quota: updated.leaveType.annualQuota,
        carry_over: updated.leaveType.carryOver,
        require_attachment: updated.leaveType.requireAttachment,
        is_active: updated.leaveType.isActive,
      },
      start_date: updated.startDate,
      end_date: updated.endDate,
      days: updated.days,
      status: updated.status,
      submitted_at: updated.submittedAt,
      decided_at: updated.decidedAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  async submit(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
  ) {
    const lr = await this.leaveRequests.submit({
      userId: req.user!.userId,
      id,
    });
    return {
      id: lr!.id,
      status: lr!.status,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancel(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
  ) {
    const lr = await this.leaveRequests.cancel({
      userId: req.user!.userId,
      id,
    });
    return { id: lr!.id, status: lr!.status };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
  ) {
    const lr = await this.repo.findById(id);
    if (!lr)
      throw new NotFoundException({
        code: 'not_found',
        message: 'Leave request not found',
      });

    const isOwner = lr.userId === req.user!.userId;
    const isManager = req.user!.role === Role.manager;
    const inScope = isManager
      ? await this.users.isDirectManagerOf(req.user!.userId, lr.userId)
      : false;
    if (!isOwner && !inScope)
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Out of scope',
      });

    return {
      id: lr.id,
      leave_type: {
        id: lr.leaveType.id,
        name: lr.leaveType.name,
        annual_quota: lr.leaveType.annualQuota,
        carry_over: lr.leaveType.carryOver,
        require_attachment: lr.leaveType.requireAttachment,
        is_active: lr.leaveType.isActive,
      },
      start_date: lr.startDate,
      end_date: lr.endDate,
      days: lr.days,
      status: lr.status,
      submitted_at: lr.submittedAt,
      decided_at: lr.decidedAt,
      user: {
        id: lr.user.id,
        name: lr.user.name,
        email: lr.user.email,
        role: lr.user.role,
        department_id: lr.user.departmentId,
        manager_id: lr.user.managerId,
      },
      reason: lr.reason,
      attachment_url: lr.attachmentId
        ? `/attachments/${lr.attachmentId}`
        : null,
      approver: lr.approver
        ? {
            id: lr.approver.id,
            name: lr.approver.name,
            email: lr.approver.email,
            role: lr.approver.role,
            department_id: lr.approver.departmentId,
            manager_id: lr.approver.managerId,
          }
        : null,
      rejection_reason: lr.rejectionReason,
      cancelled_at: lr.cancelledAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @Req() req: Request & { user?: AuthUser },
    @Query('status') status?: LeaveRequestStatus,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('sort') sort?: string,
  ) {
    return this.listMy.list(req.user!.userId, {
      status,
      leaveTypeId,
      start,
      end,
      sort,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.manager)
  @Post(':id/approve')
  async approve(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
    @Body() dto: ApproveLeaveRequestDto,
  ) {
    const lr = await this.leaveRequests.approve({
      managerId: req.user!.userId,
      id,
      note: dto.note,
    });
    return { id: lr!.id, status: lr!.status };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.manager)
  @Post(':id/reject')
  async reject(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
    @Body() dto: RejectLeaveRequestDto,
  ) {
    const lr = await this.leaveRequests.reject({
      managerId: req.user!.userId,
      id,
      reason: dto.reason,
    });
    return { id: lr!.id, status: lr!.status };
  }
}
