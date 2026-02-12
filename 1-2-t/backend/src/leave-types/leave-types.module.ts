import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LeaveTypesController } from './leave-types.controller';
import { LeaveTypesService } from './leave-types.service';

@Module({
  controllers: [LeaveTypesController],
  providers: [PrismaService, LeaveTypesService],
  exports: [LeaveTypesService],
})
export class LeaveTypesModule {}
