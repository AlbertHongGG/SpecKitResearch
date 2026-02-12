import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DepartmentCalendarController } from './department-calendar.controller';
import { DepartmentCalendarService } from './department-calendar.service';

@Module({
  controllers: [DepartmentCalendarController],
  providers: [PrismaService, DepartmentCalendarService],
})
export class DepartmentCalendarModule {}
