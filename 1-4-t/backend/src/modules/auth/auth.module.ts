import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { AppJwtService } from './jwt.service'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AppJwtService, AuthService, JwtAuthGuard, RolesGuard],
  exports: [AppJwtService, AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
