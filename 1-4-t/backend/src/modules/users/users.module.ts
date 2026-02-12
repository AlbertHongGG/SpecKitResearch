import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AppJwtService } from '../auth/jwt.service'
import { AdminUsersController } from './admin-users.controller'
import { AdminUsersService } from './admin-users.service'
import { UsersService } from './users.service'

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminUsersController],
  providers: [UsersService, AdminUsersService, AppJwtService, JwtAuthGuard, RolesGuard],
  exports: [UsersService, AdminUsersService],
})
export class UsersModule {}
