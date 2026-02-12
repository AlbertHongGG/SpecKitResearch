import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator.js';
import { CourseService } from './course.service.js';
import { ensureCourseVisible } from './access-control.js';

@Controller('courses')
export class CourseController {
  constructor(private readonly courses: CourseService) {}

  @Public()
  @Get()
  async list(@Query('q') q?: string, @Query('categoryId') categoryId?: string, @Query('tagId') tagId?: string) {
    const items = await this.courses.listPublished({ q, categoryId, tagId });
    return { items };
  }

  @Public()
  @Get(':courseId')
  async detail(@Param('courseId') courseId: string, @Req() req: Request) {
    const course = await this.courses.getCourseDetail(courseId);
    ensureCourseVisible(course, req.user?.id, req.user?.role);
    return course;
  }
}
