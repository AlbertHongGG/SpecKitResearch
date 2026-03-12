import { Inject, Injectable } from '@nestjs/common';

import { AppLoggerService } from '../../common/observability/logger.service';
import { AuditLogRepository, type AuditQueryInput, type AuditWriteInput } from './audit-log.repository';

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AuditLogRepository) private readonly repository: AuditLogRepository,
    @Inject(AppLoggerService) private readonly logger: AppLoggerService,
  ) {}

  async record(entry: AuditWriteInput) {
    const auditLog = await this.repository.create(entry);
    this.logger.log(
      {
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        auditLogId: auditLog.id,
      },
      'AuditLogService',
    );

    return auditLog;
  }

  listRecent(query: AuditQueryInput) {
    return this.repository.findRecent(query);
  }
}
