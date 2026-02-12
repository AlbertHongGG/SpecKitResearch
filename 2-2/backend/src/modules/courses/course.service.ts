import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(query?: { q?: string; categoryId?: string; tagId?: string }) {
    const where: Record<string, unknown> = { status: 'published' };
    if (query?.q) {
      where.OR = [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }
    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query?.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }
    return this.prisma.course.findMany({
      where,
      include: { category: true, tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourseDetail(courseId: string) {
    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        tags: { include: { tag: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } },
          },
        },
      },
    });
  }
}
