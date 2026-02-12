import { Module } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { ProgressController } from './progress.controller.js';

@Module({
  controllers: [ProgressController],
  providers: [PrismaService],
})
export class ProgressModule {}
