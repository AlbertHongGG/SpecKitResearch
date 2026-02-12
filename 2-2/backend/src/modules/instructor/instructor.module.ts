import { Module } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { InstructorCoursesController } from './instructor-courses.controller.js';
import { InstructorCoursesService } from './instructor-courses.service.js';
import { CourseSubmitController } from './course-submit.controller.js';

@Module({
  controllers: [InstructorCoursesController, CourseSubmitController],
  providers: [PrismaService, InstructorCoursesService],
})
export class InstructorModule {}
