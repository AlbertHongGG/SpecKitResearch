import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LeaveBalanceController } from './leave-balance.controller';
import { LeaveBalanceService } from './leave-balance.service';

@Module({
  controllers: [LeaveBalanceController],
  providers: [PrismaService, LeaveBalanceService],
  exports: [LeaveBalanceService],
})
export class LeaveBalanceModule {}
