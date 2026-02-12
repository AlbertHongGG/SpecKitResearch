import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../repositories/prisma.service.js';
import { ensureCourseVisible, ensureContentAccess } from './access-control.js';

@Controller('my-courses')
export class ReaderController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':courseId')
  async reader(@Param('courseId') courseId: string, @Req() req: Request) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    ensureCourseVisible(course, req.user?.id, req.user?.role);
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: req.user?.id ?? '', courseId } },
    });
    ensureContentAccess(course!, req.user?.id, req.user?.role, !!purchase);
    return { course, sections: course?.sections ?? [] };
  }
}
