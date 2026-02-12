import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { ActivityStatus } from '@prisma/client'
import { ViewerStateService } from '../activities/viewer-state.service'
import { AuditService } from '../audit/audit.service'
import { makeError } from '../common/http/error-response'
import { withSqliteRetry } from '../common/db/sqlite-retry'
import { IdempotencyService } from '../common/idempotency/idempotency.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { TimeService } from '../common/time/time.service'
import type { ActivityStatusChangeRequestDto, ActivityUpsertRequestDto, ActivityUpsertResponseDto } from './dto/admin-activity.dto'
import type { RegistrationRosterResponseDto } from './dto/roster.dto'
import { exportRosterCsv } from './csv/export-roster.csv'

function assertDateAfterDeadline(params: { date: Date; deadline: Date }) {
  if (params.date.getTime() <= params.deadline.getTime()) {
    throw new HttpException(
      makeError('VALIDATION_FAILED', '活動開始時間必須晚於報名截止時間'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }
}

function assertAdminAllowedInitialStatus(status: ActivityStatus) {
  if (status !== 'draft' && status !== 'published') {
    throw new HttpException(
      makeError('VALIDATION_FAILED', '建立活動時 status 只能是 draft 或 published'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }
}

function assertAdminStatusTransition(params: { current: ActivityStatus; next: ActivityStatus }) {
  const { current, next } = params
  if (next === 'full') {
    throw new HttpException(
      makeError('VALIDATION_FAILED', 'full 狀態由系統自動管理'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }

  const ok =
    (current === 'draft' && next === 'published') ||
    ((current === 'published' || current === 'full') && next === 'closed') ||
    ((current === 'draft' || current === 'closed') && next === 'archived')

  if (!ok) {
    throw new HttpException(
      makeError('STATE_INVALID', '目前狀態不允許此變更'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }
}

@Injectable()
export class AdminActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly audit: AuditService,
    private readonly time: TimeService,
    private readonly viewerState: ViewerStateService,
  ) {}

  async listAll(params: { actorUserId: string }): Promise<{ items: any[] }> {
    const now = this.time.now()
    const activities = await this.prisma.activity.findMany({
      orderBy: [{ date: 'asc' }],
    })

    return {
      items: activities.map((a) => this.mapActivityDetail({ activity: a, viewerUserId: params.actorUserId, isRegistered: false, now })),
    }
  }

  async getOne(params: { actorUserId: string; activityId: string }): Promise<ActivityUpsertResponseDto> {
    const now = this.time.now()
    const a = await this.prisma.activity.findUnique({ where: { id: params.activityId } })
    if (!a) {
      throw new HttpException(makeError('NOT_FOUND', 'Activity not found'), HttpStatus.NOT_FOUND)
    }

    return {
      activity: this.mapActivityDetail({ activity: a, viewerUserId: params.actorUserId, isRegistered: false, now }),
    }
  }

  async create(params: {
    actorUserId: string
    body: ActivityUpsertRequestDto
  }): Promise<ActivityUpsertResponseDto> {
    const now = this.time.now()
    const date = new Date(params.body.date)
    const deadline = new Date(params.body.deadline)

    assertDateAfterDeadline({ date, deadline })
    assertAdminAllowedInitialStatus(params.body.status)

    const created = await this.prisma.activity.create({
      data: {
        title: params.body.title,
        description: params.body.description,
        date,
        deadline,
        location: params.body.location,
        capacity: params.body.capacity,
        remainingSlots: params.body.capacity,
        status: params.body.status,
        createdById: params.actorUserId,
      },
    })

    await this.audit.log({
      action: 'ACTIVITY_CREATE',
      actorUserId: params.actorUserId,
      entityType: 'activity',
      entityId: created.id,
      metadata: { status: created.status },
    })

    return {
      activity: this.mapActivityDetail({
        activity: created,
        viewerUserId: params.actorUserId,
        isRegistered: false,
        now,
      }),
    }
  }

  async update(params: {
    actorUserId: string
    activityId: string
    body: ActivityUpsertRequestDto
  }): Promise<ActivityUpsertResponseDto> {
    const now = this.time.now()
    const date = new Date(params.body.date)
    const deadline = new Date(params.body.deadline)
    assertDateAfterDeadline({ date, deadline })

    const existing = await this.prisma.activity.findUnique({ where: { id: params.activityId } })
    if (!existing) {
      throw new HttpException(makeError('NOT_FOUND', 'Activity not found'), HttpStatus.NOT_FOUND)
    }

    const activeCount = await this.prisma.registration.count({
      where: { activityId: params.activityId, canceledAt: null },
    })
    if (params.body.capacity < activeCount) {
      throw new HttpException(
        makeError('VALIDATION_FAILED', 'capacity 不可小於已報名人數', { active_count: activeCount }),
        HttpStatus.UNPROCESSABLE_ENTITY,
      )
    }

    const remainingSlots = params.body.capacity - activeCount
    let status: ActivityStatus = params.body.status
    if (status === 'published' && remainingSlots === 0) status = 'full'

    const updated = await this.prisma.activity.update({
      where: { id: params.activityId },
      data: {
        title: params.body.title,
        description: params.body.description,
        date,
        deadline,
        location: params.body.location,
        capacity: params.body.capacity,
        remainingSlots,
        status,
      },
    })

    await this.audit.log({
      action: 'ACTIVITY_UPDATE',
      actorUserId: params.actorUserId,
      entityType: 'activity',
      entityId: updated.id,
      metadata: { from_status: existing.status, to_status: updated.status },
    })

    return {
      activity: this.mapActivityDetail({ activity: updated, viewerUserId: params.actorUserId, isRegistered: false, now }),
    }
  }

  async changeStatus(params: {
    actorUserId: string
    activityId: string
    idempotencyKey?: string
    body: ActivityStatusChangeRequestDto
  }): Promise<ActivityUpsertResponseDto> {
    const { actorUserId, activityId, idempotencyKey } = params

    if (idempotencyKey) {
      const { replay, recordId } = await this.idempotency.claim({
        userId: actorUserId,
        action: 'admin_status_change',
        key: idempotencyKey,
        requestHash: `${activityId}:${params.body.new_status}`,
      })

      if (replay) return replay.body as ActivityUpsertResponseDto

      try {
        const body = await this.changeStatusOnce({ actorUserId, activityId, newStatus: params.body.new_status })
        await this.idempotency.storeResult({ recordId, status: HttpStatus.OK, body })
        return body
      } catch (e) {
        if (e instanceof HttpException) {
          await this.idempotency.storeResult({ recordId, status: e.getStatus(), body: e.getResponse() })
        }
        throw e
      }
    }

    return this.changeStatusOnce({ actorUserId, activityId, newStatus: params.body.new_status })
  }

  private async changeStatusOnce(params: {
    actorUserId: string
    activityId: string
    newStatus: ActivityStatus
  }): Promise<ActivityUpsertResponseDto> {
    const now = this.time.now()

    const result = await withSqliteRetry(() =>
      this.prisma.$transaction(async (tx) => {
      const current = await tx.activity.findUnique({ where: { id: params.activityId } })
      if (!current) {
        throw new HttpException(makeError('NOT_FOUND', 'Activity not found'), HttpStatus.NOT_FOUND)
      }

      assertAdminStatusTransition({ current: current.status as ActivityStatus, next: params.newStatus })

      if (params.newStatus === 'published') {
        const activeCount = await tx.registration.count({
          where: { activityId: params.activityId, canceledAt: null },
        })
        const remainingSlots = current.capacity - activeCount
        const nextStatus: ActivityStatus = remainingSlots === 0 ? 'full' : 'published'
        const updated = await tx.activity.update({
          where: { id: params.activityId },
          data: { status: nextStatus, remainingSlots },
        })
        return { updated, fromStatus: current.status as ActivityStatus, fromRemainingSlots: current.remainingSlots }
      }

      const updated = await tx.activity.update({
        where: { id: params.activityId },
        data: { status: params.newStatus },
      })
      return { updated, fromStatus: current.status as ActivityStatus, fromRemainingSlots: current.remainingSlots }
      }),
    )

    const updated = result.updated

    await this.audit.log({
      action: 'ACTIVITY_STATUS_CHANGE',
      actorUserId: params.actorUserId,
      entityType: 'activity',
      entityId: updated.id,
      metadata: {
        from_status: result.fromStatus,
        to_status: updated.status,
        from_remaining_slots: result.fromRemainingSlots,
        to_remaining_slots: updated.remainingSlots,
        requested_status: params.newStatus,
      },
    })

    return {
      activity: this.mapActivityDetail({ activity: updated, viewerUserId: params.actorUserId, isRegistered: false, now }),
    }
  }

  async getRoster(params: { actorUserId: string; activityId: string }): Promise<RegistrationRosterResponseDto> {
    const exists = await this.prisma.activity.findUnique({ where: { id: params.activityId }, select: { id: true } })
    if (!exists) {
      throw new HttpException(makeError('NOT_FOUND', 'Activity not found'), HttpStatus.NOT_FOUND)
    }

    const regs = await this.prisma.registration.findMany({
      where: { activityId: params.activityId, canceledAt: null },
      include: { user: true },
      orderBy: [{ createdAt: 'asc' }],
    })

    return {
      items: regs.map((r) => ({
        name: r.user.name,
        email: r.user.email,
        registered_at: r.createdAt.toISOString(),
      })),
    }
  }

  async exportRosterCsv(params: { actorUserId: string; activityId: string }): Promise<string> {
    const roster = await this.getRoster(params)

    await this.audit.log({
      action: 'EXPORT_CSV',
      actorUserId: params.actorUserId,
      entityType: 'activity',
      entityId: params.activityId,
      metadata: { count: roster.items.length },
    })

    return exportRosterCsv(roster.items)
  }

  private mapActivityDetail(params: {
    activity: {
      id: string
      title: string
      description: string
      date: Date
      deadline: Date
      location: string
      capacity: number
      remainingSlots: number
      status: any
      createdById: string
      createdAt: Date
      updatedAt: Date
    }
    viewerUserId?: string
    isRegistered: boolean
    now: Date
  }) {
    const viewer = this.viewerState.computeDetail({
      viewerUserId: params.viewerUserId,
      isRegistered: params.isRegistered,
      status: params.activity.status as ActivityStatus,
      remainingSlots: params.activity.remainingSlots,
      deadline: params.activity.deadline,
      date: params.activity.date,
      now: params.now,
    })

    return {
      id: params.activity.id,
      title: params.activity.title,
      date: params.activity.date.toISOString(),
      location: params.activity.location,
      capacity: params.activity.capacity,
      remaining_slots: params.activity.remainingSlots,
      status: params.activity.status,
      viewer,
      description: params.activity.description,
      deadline: params.activity.deadline.toISOString(),
      created_by: params.activity.createdById,
      created_at: params.activity.createdAt.toISOString(),
      updated_at: params.activity.updatedAt.toISOString(),
    }
  }
}
