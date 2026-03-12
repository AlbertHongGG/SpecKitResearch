import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { SessionController } from './session.controller';
import { PasswordService } from './password.service';
import { SessionDal } from './session.dal';

@Module({
  controllers: [AuthController, SessionController],
  providers: [PasswordService, SessionDal],
  exports: [SessionDal],
})
export class AuthModule {}
