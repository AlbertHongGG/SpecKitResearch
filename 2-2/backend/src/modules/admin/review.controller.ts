import { Body, Controller, Get, Param, Post, ConflictException, Req, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../../repositories/prisma.service.js';
import { Roles } from '../auth/roles.decorator.js';

const reviewSchema = z.object({
  decision: z.enum(['published', 'rejected']),
  reason: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

@Controller('admin/review')
@Roles('admin')
export class ReviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const items = await this.prisma.course.findMany({
      where: { status: 'submitted' },
      orderBy: { updatedAt: 'desc' },
    });
    return { items };
  }

  @Post(':courseId')
  async review(@Param('courseId') courseId: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'submitted') {
      throw new ConflictException('Course not in review');
    }
    if (parsed.data.decision === 'rejected' && !parsed.data.reason) {
      throw new ConflictException('Rejection reason required');
    }
    const now = new Date();
    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: parsed.data.decision === 'published' ? 'published' : 'rejected',
        rejectedReason: parsed.data.decision === 'rejected' ? parsed.data.reason ?? null : null,
        publishedAt: parsed.data.decision === 'published' ? course.publishedAt ?? now : course.publishedAt,
      },
    });
    await this.prisma.courseReview.create({
      data: {
        courseId,
        adminId: req.user!.id,
        decision: parsed.data.decision,
        reason: parsed.data.decision === 'rejected' ? parsed.data.reason ?? null : null,
        note: parsed.data.decision === 'published' ? parsed.data.note ?? null : null,
      },
    });
    return updated;
  }
}
