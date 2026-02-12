import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { AdminUsersController } from './users.controller';
import { AdminUsersService } from './users.service';

@Module({
  imports: [CoursesModule],
  controllers: [ReviewsController, AdminUsersController],
  providers: [ReviewsService, AdminUsersService],
})
export class AdminModule {}
