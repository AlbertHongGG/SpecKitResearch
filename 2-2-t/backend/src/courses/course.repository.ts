import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished() {
    return this.prisma.course.findMany({
      where: { status: CourseStatus.published },
      include: {
        instructor: true,
        category: true,
        courseTags: { include: { tag: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getCourseWithOutline(courseId: string) {
    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: true,
        category: true,
        courseTags: { include: { tag: true } },
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: { orderBy: { position: 'asc' } },
          },
        },
      },
    });
  }

  async hasPurchase(params: { userId: string; courseId: string }) {
    const p = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
      select: { id: true },
    });
    return Boolean(p);
  }
}
