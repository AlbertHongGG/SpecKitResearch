import { Body, Controller, Post, Req } from '@nestjs/common';
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
}
