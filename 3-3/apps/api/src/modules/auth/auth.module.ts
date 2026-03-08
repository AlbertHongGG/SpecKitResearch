import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';
import { SessionService } from './session.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, SessionService],
  exports: [SessionService],
})
export class AuthModule {}
