import { Module } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { CourseController } from './course.controller.js';
import { CourseService } from './course.service.js';
import { MyCoursesService } from './my-courses.service.js';
import { MyCoursesController } from './my-courses.controller.js';
import { ReaderController } from './reader.controller.js';

@Module({
  controllers: [CourseController, MyCoursesController, ReaderController],
  providers: [PrismaService, CourseService, MyCoursesService],
})
export class CoursesModule {}
