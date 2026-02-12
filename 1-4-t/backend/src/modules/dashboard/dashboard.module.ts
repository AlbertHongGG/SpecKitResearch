import { Module } from '@nestjs/common'
import { PrismaModule } from '../../common/prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
