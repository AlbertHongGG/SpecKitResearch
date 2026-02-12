import { ConflictException, NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { ensureCourseVisible } from '../courses/access-control.js';

@Injectable()
export class PurchaseService {
  constructor(private readonly prisma: PrismaService) {}

  async purchaseCourse(userId: string, courseId: string, role: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    ensureCourseVisible(course, userId, role);
    if (!course || course.status !== 'published') {
      throw new NotFoundException('Course not available');
    }
    const existing = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) {
      throw new ConflictException('Already purchased');
    }
    try {
      return await this.prisma.purchase.create({
        data: { userId, courseId },
      });
    } catch {
      throw new ConflictException('Already purchased');
    }
  }
}
