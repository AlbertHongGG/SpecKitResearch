import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { InstructorCoursesController } from './instructor-courses.controller';
import { InstructorCoursesService } from './instructor-courses.service';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';

@Module({
  imports: [CoursesModule],
  controllers: [InstructorCoursesController, CurriculumController],
  providers: [InstructorCoursesService, CurriculumService],
})
export class InstructorModule {}
