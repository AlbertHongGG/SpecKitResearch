import { Controller, Get, Param, Post, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('admin/courses')
@Roles('admin')
export class AdminCoursesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const items = await this.prisma.course.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return { items };
  }

  @Post(':courseId/archive')
  async archive(@Param('courseId') courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'published') {
      throw new ConflictException('Course not published');
    }
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'archived', archivedAt: new Date() },
    });
  }

  @Post(':courseId/publish')
  async publish(@Param('courseId') courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'archived') {
      throw new ConflictException('Course not archived');
    }
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: 'published',
        publishedAt: course?.publishedAt ?? new Date(),
      },
    });
  }
}
