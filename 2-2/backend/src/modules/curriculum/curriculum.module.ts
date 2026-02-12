import { Module } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { CurriculumController } from './curriculum.controller.js';

@Module({
  controllers: [CurriculumController],
  providers: [PrismaService],
})
export class CurriculumModule {}
