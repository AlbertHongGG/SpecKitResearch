import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { CsrfController } from './csrf.controller.js';
import { SessionService } from './session.service.js';
import { RateLimitGuard } from '../../common/security/rate-limit.guard.js';

@Module({
  controllers: [AuthController, CsrfController],
  providers: [SessionService, RateLimitGuard],
  exports: [SessionService],
})
export class AuthModule {}
