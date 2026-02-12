import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [PasswordService, SessionService],
  exports: [SessionService],
})
export class AuthModule {}
