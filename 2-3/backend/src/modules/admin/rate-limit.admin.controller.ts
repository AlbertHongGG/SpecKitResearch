import { BadRequestException, Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';
import { RateLimitPolicyService } from '../../shared/rate-limit/rate-limit.policy.service';

import { RateLimitPolicyUpdateDto } from './rate-limit.admin.dto';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('admin/rate-limit')
@UseGuards(RequireAdminGuard)
export class RateLimitAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly policy: RateLimitPolicyService,
  ) {}

  @Get()
  async getPolicy() {
    const p = await this.policy.getPolicy();
    return {
      default_per_minute: p.defaultPerMinute,
      default_per_hour: p.defaultPerHour,
      cap_per_minute: p.capPerMinute,
      cap_per_hour: p.capPerHour,
      updated_at: p.updatedAt.toISOString()
    };
  }

  @Patch()
  async updatePolicy(@Body() body: RateLimitPolicyUpdateDto, @Req() req: RequestWithSession) {
    if (body.default_per_minute > body.cap_per_minute || body.default_per_hour > body.cap_per_hour) {
      throw new BadRequestException({
        error: { code: 'bad_request', message: 'Default rate limit must not exceed cap' }
      });
    }

    const actor = auditActorFromSession(req.session!);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.rateLimitPolicy.upsert({
        where: { id: 'default' },
        update: {
          defaultPerMinute: body.default_per_minute,
          defaultPerHour: body.default_per_hour,
          capPerMinute: body.cap_per_minute,
          capPerHour: body.cap_per_hour
        },
        create: {
          id: 'default',
          defaultPerMinute: body.default_per_minute,
          defaultPerHour: body.default_per_hour,
          capPerMinute: body.cap_per_minute,
          capPerHour: body.cap_per_hour
        }
      });

      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.AdminRateLimitPolicyUpdate,
        targetType: 'rate_limit_policy',
        targetId: row.id,
        metadata: {
          default_per_minute: row.defaultPerMinute,
          default_per_hour: row.defaultPerHour,
          cap_per_minute: row.capPerMinute,
          cap_per_hour: row.capPerHour
        }
      });
      return row;
    });

    this.policy.invalidateCache();
    return {
      default_per_minute: updated.defaultPerMinute,
      default_per_hour: updated.defaultPerHour,
      cap_per_minute: updated.capPerMinute,
      cap_per_hour: updated.capPerHour,
      updated_at: updated.updatedAt.toISOString()
    };
  }
}
