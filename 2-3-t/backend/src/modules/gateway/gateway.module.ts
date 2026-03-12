import { Module } from '@nestjs/common';

import { GatewayController } from './gateway.controller';
import { GatewayGuardService } from './gateway.guard';
import { GatewayProxyService } from './gateway.proxy';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [RateLimitModule],
  controllers: [GatewayController],
  providers: [GatewayGuardService, GatewayProxyService],
})
export class GatewayModule {}
