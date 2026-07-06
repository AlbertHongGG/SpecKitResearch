import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityStatus, AuditAction } from '@prisma/client';

import { canAdminTransition } from '../activities/activity-status';
import { toActivityDetailDto, toActivitySummaryDto } from '../activities/dto/activity.dto';
import { AuditService } from '../audit/audit.service';
import { utcNow } from '../common/time/time';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminActivitiesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listAll() {
    const items = await this.prisma.activity.findMany({ orderBy: { createdAt: 'desc' } });
    return { items: items.map(toActivityDetailDto) };
  }

  async createDraft(params: { actorUserId: string; body: {
    title: string; description: string; date: string; location: string; deadline: string; capacity: number;
  } }) {
    const date = new Date(params.body.date);
    const deadline = new Date(params.body.deadline);
    if (date.getTime() <= deadline.getTime()) throw new BadRequestException('date must be later than deadline');

    const activity = await this.prisma.activity.create({
      data: {
        title: params.body.title,
        description: params.body.description,
        date,
        location: params.body.location,
        deadline,
        capacity: params.body.capacity,
        status: ActivityStatus.DRAFT,
        registeredCount: 0,
        createdByUserId: params.actorUserId,
      },
    });

    await this.audit.write({
      actorUserId: params.actorUserId,
      action: AuditAction.ACTIVITY_CREATE,
      targetType: 'Activity',
      targetId: activity.id,
      summary: `Created activity ${activity.id}`,
    });

    return toActivityDetailDto(activity);
  }

  async update(params: { actorUserId: string; activityId: string; body: {
    title: string; description: string; date: string; location: string; deadline: string; capacity: number;
  } }) {
    const existing = await this.prisma.activity.findUnique({ where: { id: params.activityId } });
    if (!existing) throw new NotFoundException('Not found');

    const date = new Date(params.body.date);
    const deadline = new Date(params.body.deadline);
    if (date.getTime() <= deadline.getTime()) throw new BadRequestException('date must be later than deadline');

    if (params.body.capacity < existing.registeredCount) {
      throw new BadRequestException('capacity cannot be less than registeredCount');
    }

    const updated = await this.prisma.activity.update({
      where: { id: params.activityId },
      data: {
        title: params.body.title,
        description: params.body.description,
        date,
        location: params.body.location,
        deadline,
        capacity: params.body.capacity,
      },
    });

    await this.audit.write({
      actorUserId: params.actorUserId,
      action: AuditAction.ACTIVITY_UPDATE,
      targetType: 'Activity',
      targetId: updated.id,
      summary: `Updated activity ${updated.id}`,
    });

    return toActivityDetailDto(updated);
  }

  async changeStatus(params: { actorUserId: string; activityId: string; toStatus: ActivityStatus }) {
    const activity = await this.prisma.activity.findUnique({ where: { id: params.activityId } });
    if (!activity) throw new NotFoundException('Not found');

    if (!canAdminTransition(activity.status, params.toStatus)) {
      throw new BadRequestException('Invalid transition');
    }

    const updated = await this.prisma.activity.update({
      where: { id: params.activityId },
      data: { status: params.toStatus },
    });

    await this.audit.write({
      actorUserId: params.actorUserId,
      action: AuditAction.ACTIVITY_STATUS_CHANGE,
      targetType: 'Activity',
      targetId: updated.id,
      summary: `Changed status ${activity.status} -> ${updated.status} for ${updated.id}`,
    });

    return toActivityDetailDto(updated);
  }

  async listRegistrations(activityId: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Not found');

    const regs = await this.prisma.registration.findMany({
      where: { activityId, canceledAt: null },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      items: regs.map((r) => ({
        name: r.user.name,
        email: r.user.email,
        registeredAt: r.createdAt.toISOString(),
      })),
    };
  }

  async exportCsv(params: { actorUserId: string; activityId: string; idempotencyKey?: string; shouldAudit: boolean }) {
    const activity = await this.prisma.activity.findUnique({ where: { id: params.activityId } });
    if (!activity) throw new NotFoundException('Not found');

    const rows = await this.listRegistrations(params.activityId);

    const bom = '\uFEFF';
    const header = ['姓名', 'Email', '報名時間'].join(',');
    const lines = rows.items.map((r) => [r.name, r.email, r.registeredAt].map(csvEscape).join(','));
    const csv = bom + [header, ...lines].join('\n') + '\n';

    if (params.shouldAudit) {
      await this.audit.write({
        actorUserId: params.actorUserId,
        action: AuditAction.REGISTRATIONS_EXPORT,
        targetType: 'Activity',
        targetId: params.activityId,
        summary: `Exported registrations CSV for ${params.activityId}`,
      });
    }

    return csv;
  }
}

function csvEscape(v: string): string {
  if (v.includes('"') || v.includes(',') || v.includes('\n')) {
    return `"${v.replaceAll('"', '""')}"`;
  }
  return v;
}
