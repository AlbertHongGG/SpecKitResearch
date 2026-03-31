import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../common/db/prisma.module'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
