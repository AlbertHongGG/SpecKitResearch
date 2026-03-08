import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RateLimitPolicy } from './rate-limit.policy';
import { RateLimitCleanupService } from './rate-limit.cleanup.service';

@Module({
  providers: [RateLimitService, RateLimitPolicy, RateLimitCleanupService],
  exports: [RateLimitService, RateLimitPolicy],
})
export class RateLimitModule {}
