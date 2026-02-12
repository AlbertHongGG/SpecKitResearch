import { Module } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { ReviewController } from './review.controller.js';
import { AdminCoursesController } from './courses.controller.js';
import { TaxonomyController } from './taxonomy.controller.js';
import { UsersController } from './users.controller.js';
import { StatsController } from './stats.controller.js';

@Module({
  controllers: [ReviewController, AdminCoursesController, TaxonomyController, UsersController, StatsController],
  providers: [PrismaService],
})
export class AdminModule {}
