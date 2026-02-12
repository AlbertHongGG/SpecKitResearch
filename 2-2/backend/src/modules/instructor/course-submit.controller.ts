import { Controller, Param, Post, Req, ConflictException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/roles.decorator.js';
import { PrismaService } from '../../repositories/prisma.service.js';

@Controller('instructor/courses')
@Roles('instructor', 'admin')
export class CourseSubmitController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':courseId/submit')
  async submit(@Param('courseId') courseId: string, @Req() req: Request) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.instructorId !== req.user!.id) {
      throw new NotFoundException('Course not found');
    }
    if (course.status !== 'draft') {
      throw new ConflictException('Course cannot be submitted');
    }
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'submitted' },
    });
  }
}
