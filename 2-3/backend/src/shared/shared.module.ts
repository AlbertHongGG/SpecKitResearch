import { Global, Module } from '@nestjs/common';

import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RequireAdminGuard } from '../guards/require-admin.guard';
import { RequireSessionGuard } from '../guards/require-session.guard';
import { ScopeGuard } from '../guards/scope.guard';
import { ApiKeyAuthService } from './auth/api-key-auth.service';
import { ScopeAuthorizationService } from './auth/scope-authorization.service';
import { SessionService } from './auth/session.service';
import { PrismaService } from './db/prisma.service';
import { AuditLogService } from './logging/audit-log.service';
import { UsageLogQueue } from './logging/usage-log.queue';
import { RateLimitBucketRepository } from './rate-limit/rate-limit.repository';
import { RateLimitPolicyService } from './rate-limit/rate-limit.policy.service';
import { RateLimitService } from './rate-limit/rate-limit.service';

@Global()
@Module({
  providers: [
    PrismaService,
    SessionService,
    RequireSessionGuard,
    RequireAdminGuard,
    ApiKeyAuthService,
    ApiKeyAuthGuard,
    ScopeAuthorizationService,
    ScopeGuard,
    RateLimitBucketRepository,
    RateLimitPolicyService,
    RateLimitService,
    RateLimitGuard,
    UsageLogQueue,
    AuditLogService,
  ],
  exports: [
    PrismaService,
    SessionService,
    RequireSessionGuard,
    RequireAdminGuard,
    ApiKeyAuthService,
    ApiKeyAuthGuard,
    ScopeAuthorizationService,
    ScopeGuard,
    RateLimitBucketRepository,
    RateLimitPolicyService,
    RateLimitService,
    RateLimitGuard,
    UsageLogQueue,
    AuditLogService,
  ],
})
export class SharedModule {}
