import { Module } from '@nestjs/common';

import { NavController } from './nav.controller.js';
import { SessionGuard } from '../../common/auth/session.guard.js';

@Module({
  controllers: [NavController],
  providers: [SessionGuard],
})
export class NavModule {}
