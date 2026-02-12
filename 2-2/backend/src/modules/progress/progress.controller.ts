import { Body, Controller, Param, Put, Req, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../../repositories/prisma.service.js';
import { ensureContentAccess } from '../courses/access-control.js';

const progressSchema = z.object({
  isCompleted: z.boolean(),
});

@Controller('my-courses')
export class ProgressController {
  constructor(private readonly prisma: PrismaService) {}

  @Put(':courseId/lessons/:lessonId/progress')
  async updateProgress(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = progressSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { select: { courseId: true } } },
    });
    if (!lesson || lesson.section.courseId !== courseId) {
      throw new BadRequestException('Lesson not in course');
    }
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId } },
    });
    ensureContentAccess(course!, req.user?.id, req.user?.role, !!purchase);
    const data = parsed.data.isCompleted
      ? { isCompleted: true, completedAt: new Date() }
      : { isCompleted: false, completedAt: null };
    const progress = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user!.id, lessonId } },
      create: { userId: req.user!.id, lessonId, ...data },
      update: data,
    });
    return { lessonId: progress.lessonId, isCompleted: progress.isCompleted, completedAt: progress.completedAt };
  }
}
