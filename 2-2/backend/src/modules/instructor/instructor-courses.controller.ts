import { Body, Controller, Get, Param, Patch, Post, Req, ConflictException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { Roles } from '../auth/roles.decorator.js';
import { InstructorCoursesService } from './instructor-courses.service.js';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
  price: z.number().int().min(0),
  coverImageUrl: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

@Controller('instructor/courses')
@Roles('instructor', 'admin')
export class InstructorCoursesController {
  constructor(private readonly service: InstructorCoursesService) {}

  @Get()
  async list(@Req() req: Request) {
    return { items: await this.service.listCourses(req.user!.id) };
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    return this.service.createCourse(req.user!.id, parsed.data);
  }

  @Get(':courseId')
  async detail(@Param('courseId') courseId: string, @Req() req: Request) {
    return this.service.getCourse(courseId, req.user!.id);
  }

  @Patch(':courseId')
  async update(
    @Param('courseId') courseId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    return this.service.updateCourse(courseId, req.user!.id, parsed.data);
  }

  @Post(':courseId/archive')
  async archive(@Param('courseId') courseId: string, @Req() req: Request) {
    const course = await this.service.getCourse(courseId, req.user!.id);
    if (course.status !== 'published') {
      throw new ConflictException('Course not published');
    }
    return this.service.archiveCourse(courseId);
  }

  @Post(':courseId/publish')
  async publish(@Param('courseId') courseId: string, @Req() req: Request) {
    const course = await this.service.getCourse(courseId, req.user!.id);
    if (course.status !== 'archived') {
      throw new ConflictException('Course not archived');
    }
    return this.service.publishCourse(courseId);
  }
}
