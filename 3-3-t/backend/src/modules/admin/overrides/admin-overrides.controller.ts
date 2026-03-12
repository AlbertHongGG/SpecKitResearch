import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AdminOverrideRepository } from '../admin-override.repository';
import { AdminOverrideGuardService } from './admin-override-guard.service';
import { AuditEventsService } from '../../audit/audit-events.service';

@Controller('admin/overrides')
export class AdminOverridesController {
  constructor(
    private readonly repo: AdminOverrideRepository,
    private readonly guardService: AdminOverrideGuardService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  @Get()
  latest(@Query('organizationId') organizationId?: string) {
    if (!organizationId) return null;
    return this.repo.latestByOrg(organizationId);
  }

  @Post()
  async force(
    @Req() req: any,
    @Body() body: { organizationId: string; forcedStatus: 'Suspended' | 'Expired'; reason: string },
  ) {
    this.guardService.assertCanApply(body.forcedStatus);
    const created = await this.repo.force(body.organizationId, req.session?.userId || 'system', body.forcedStatus, body.reason);
    await this.auditEvents.append(req, 'ADMIN_OVERRIDE_APPLIED', 'AdminOverride', created.id, body);
    return created;
  }

  @Patch(':id/revoke')
  async revoke(@Req() req: any, @Param('id') id: string) {
    const current = await this.repo.getById(id);
    if (!current) {
      throw new BadRequestException('Override not found');
    }
    this.guardService.assertCanRevoke(current);
    const revoked = await this.repo.revoke(id);
    await this.auditEvents.append(req, 'ADMIN_OVERRIDE_REVOKED', 'AdminOverride', revoked.id, {});
    return revoked;
  }
}
