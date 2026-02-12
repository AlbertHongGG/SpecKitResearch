import { Body, Controller, Param, Post, Req, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../../repositories/prisma.service.js';
import { Roles } from '../auth/roles.decorator.js';

const sectionSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(0),
});

const lessonSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(0),
  contentType: z.enum(['text', 'image', 'pdf']),
  contentText: z.string().optional().nullable(),
  contentImageUrl: z.string().optional().nullable(),
  contentFileUrl: z.string().optional().nullable(),
  contentFileName: z.string().optional().nullable(),
});

@Controller('instructor/courses')
@Roles('instructor', 'admin')
export class CurriculumController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':courseId/curriculum/sections')
  async createSection(
    @Param('courseId') courseId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = sectionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.instructorId !== req.user!.id) {
      throw new NotFoundException('Course not found');
    }
    if (course.status === 'submitted') {
      throw new ConflictException('Course is locked');
    }
    return this.prisma.section.create({
      data: {
        courseId,
        title: parsed.data.title,
        order: parsed.data.order,
      },
    });
  }

  @Post(':courseId/curriculum/sections/:sectionId/lessons')
  async createLesson(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = lessonSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.instructorId !== req.user!.id) {
      throw new NotFoundException('Course not found');
    }
    if (course.status === 'submitted') {
      throw new ConflictException('Course is locked');
    }
    if (parsed.data.contentType === 'text' && !parsed.data.contentText) {
      throw new BadRequestException('contentText required');
    }
    if (parsed.data.contentType === 'image' && !parsed.data.contentImageUrl) {
      throw new BadRequestException('contentImageUrl required');
    }
    if (
      parsed.data.contentType === 'pdf' &&
      (!parsed.data.contentFileUrl || !parsed.data.contentFileName)
    ) {
      throw new BadRequestException('contentFileUrl and contentFileName required');
    }
    return this.prisma.lesson.create({
      data: {
        sectionId,
        title: parsed.data.title,
        order: parsed.data.order,
        contentType: parsed.data.contentType,
        contentText: parsed.data.contentText ?? null,
        contentImageUrl: parsed.data.contentImageUrl ?? null,
        contentFileUrl: parsed.data.contentFileUrl ?? null,
        contentFileName: parsed.data.contentFileName ?? null,
      },
    });
  }
}
