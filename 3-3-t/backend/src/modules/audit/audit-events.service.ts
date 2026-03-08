import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';

@Injectable()
export class AuditEventsService {
  constructor(private readonly auditService: AuditService) {}

  append(req: any, action: string, targetType: string, targetId: string | undefined, payload: Record<string, unknown>) {
    return this.auditService.append({
      actorUserId: req.session?.userId || 'system',
      actorRoleContext: req.role || 'END_USER',
      organizationId: req.orgId,
      action,
      targetType,
      targetId,
      payload,
      traceId: req.traceId,
      correlationId: req.correlationId,
    });
  }
}
