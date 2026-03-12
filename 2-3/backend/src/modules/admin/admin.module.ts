import { Module } from '@nestjs/common';

import { ApiKeysAdminController } from '../api-keys/api-keys.admin.controller';
import { AuditLogsController } from '../audit-logs/audit-logs.controller';
import { EndpointsAdminController } from '../endpoints/endpoints.admin.controller';
import { EndpointsService } from '../endpoints/endpoints.service';
import { ScopesAdminController } from '../scopes/scopes.admin.controller';
import { ScopeRulesAdminController } from '../scopes/scope-rules.admin.controller';
import { ScopeRulesService } from '../scopes/scope-rules.service';
import { ScopesService } from '../scopes/scopes.service';
import { ServicesAdminController } from '../services/services.admin.controller';
import { ServicesRepository } from '../services/services.repository';
import { ServicesService } from '../services/services.service';
import { UsageLogsAdminController } from '../usage-logs/usage-logs.admin.controller';
import { UsageLogsRepository } from '../usage-logs/usage-logs.repository';
import { AdminUsageStatsController } from '../usage-logs/usage-stats.admin.controller';
import { UsersAdminController } from '../users/users.admin.controller';
import { UserDisableService } from '../users/user-disable.service';

import { AdminApiKeysController } from './api-keys.admin.controller';
import { RateLimitAdminController } from './rate-limit.admin.controller';

@Module({
  controllers: [
    ServicesAdminController,
    EndpointsAdminController,
    ScopesAdminController,
    ScopeRulesAdminController,
    RateLimitAdminController,
    AdminApiKeysController,
    ApiKeysAdminController,
    UsersAdminController,
    UsageLogsAdminController,
    AdminUsageStatsController,
    AuditLogsController,
  ],
  providers: [
    ServicesRepository,
    ServicesService,
    EndpointsService,
    ScopesService,
    ScopeRulesService,
    UserDisableService,
    UsageLogsRepository,
  ]
})
export class AdminModule {}
