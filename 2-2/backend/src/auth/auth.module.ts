import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { env } from '../common/config/env'
import { PrismaModule } from '../common/db/prisma.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { DevEmailSender, EMAIL_SENDER } from './email-sender'
import { JwtAuthGuard } from './jwt-auth.guard'
import { JwtStrategy } from './jwt.strategy'
import { PasswordResetRepo } from './password-reset.repo'
import { PasswordResetService } from './password-reset.service'
import { RolesGuard } from './roles.guard'
import { UserStatusGuard } from './user-status.guard'

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_EXPIRES_IN_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetRepo,
    PasswordResetService,
    { provide: EMAIL_SENDER, useClass: DevEmailSender },
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    UserStatusGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, UserStatusGuard],
})
export class AuthModule {}
