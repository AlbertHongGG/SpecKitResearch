import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';

@Injectable()
export class InstructorCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(instructorId: string) {
    return this.prisma.course.findMany({
      where: { instructorId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createCourse(instructorId: string, payload: {
    title: string;
    description: string;
    categoryId: string;
    tagIds?: string[];
    price: number;
    coverImageUrl?: string | null;
  }) {
    const category = await this.prisma.courseCategory.findUnique({
      where: { id: payload.categoryId },
    });
    if (!category || !category.isActive) {
      throw new ConflictException('Invalid category');
    }
    if (payload.tagIds && payload.tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({ where: { id: { in: payload.tagIds } } });
      if (tags.length !== payload.tagIds.length || tags.some((t) => !t.isActive)) {
        throw new ConflictException('Invalid tags');
      }
    }
    return this.prisma.course.create({
      data: {
        instructorId,
        title: payload.title,
        description: payload.description,
        categoryId: payload.categoryId,
        price: payload.price,
        coverImageUrl: payload.coverImageUrl ?? null,
        status: 'draft',
        tags: payload.tagIds
          ? { create: payload.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
    });
  }

  async getCourse(courseId: string, instructorId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.instructorId !== instructorId) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async updateCourse(courseId: string, instructorId: string, payload: {
    title?: string;
    description?: string;
    categoryId?: string;
    tagIds?: string[];
    price?: number;
    coverImageUrl?: string | null;
  }) {
    const course = await this.getCourse(courseId, instructorId);
    if (course.status === 'submitted') {
      throw new ConflictException('Course is locked for review');
    }
    if (payload.categoryId) {
      const category = await this.prisma.courseCategory.findUnique({
        where: { id: payload.categoryId },
      });
      if (!category || !category.isActive) {
        throw new ConflictException('Invalid category');
      }
    }
    if (payload.tagIds && payload.tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({ where: { id: { in: payload.tagIds } } });
      if (tags.length !== payload.tagIds.length || tags.some((t) => !t.isActive)) {
        throw new ConflictException('Invalid tags');
      }
    }
    const statusUpdate = course.status === 'rejected' ? { status: 'draft', rejectedReason: null } : {};
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: payload.title ?? course.title,
        description: payload.description ?? course.description,
        categoryId: payload.categoryId ?? course.categoryId,
        price: payload.price ?? course.price,
        coverImageUrl: payload.coverImageUrl ?? course.coverImageUrl,
        ...statusUpdate,
        tags: payload.tagIds
          ? {
              deleteMany: {},
              create: payload.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
    });
  }

  async archiveCourse(courseId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'archived', archivedAt: new Date() },
    });
  }

  async publishCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'published', publishedAt: course?.publishedAt ?? new Date() },
    });
  }
}
