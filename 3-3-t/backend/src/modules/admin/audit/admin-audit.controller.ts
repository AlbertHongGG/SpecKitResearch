import { Controller, Get, Query } from '@nestjs/common';
import { AuditQueryService } from '../../audit/audit-query.service';

@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly service: AuditQueryService) {}

  @Get()
  query(
    @Query('actorUserId') actorUserId?: string,
    @Query('actorRoleContext') actorRoleContext?: string,
    @Query('organizationId') organizationId?: string,
    @Query('action') action?: string,
  ) {
    return this.service.query({ actorUserId, actorRoleContext, organizationId, action });
  }
}
