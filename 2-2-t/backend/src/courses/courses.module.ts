import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CourseRepository } from './course.repository';
import { CourseVisibilityPolicy } from './course-visibility.policy';
import { OptionalSessionGuard } from '../common/auth/optional-session.guard';
import { CourseContentPolicy } from './course-content.policy';
import { CourseStateService } from './course-state.service';
import { CourseLockPolicy } from './course-lock.policy';

@Module({
  controllers: [CoursesController],
    providers: [
      CourseRepository,
      CourseVisibilityPolicy,
      OptionalSessionGuard,
      CourseContentPolicy,
      CourseStateService,
      CourseLockPolicy,
    ],
  exports: [CourseRepository, CourseContentPolicy, CourseStateService, CourseLockPolicy],
})
export class CoursesModule {}
