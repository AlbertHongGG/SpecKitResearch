import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { CsrfController } from './csrf.controller.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [AuthController, CsrfController],
  providers: [SessionService],
  exports: [SessionService],
})
export class AuthModule {}
