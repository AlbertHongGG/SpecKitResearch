import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseStateService } from '../courses/course-state.service';
import { CourseLockPolicy } from '../courses/course-lock.policy';

@Injectable()
export class InstructorCoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseState: CourseStateService,
    private readonly lockPolicy: CourseLockPolicy,
  ) {}

  async list(params: { instructorId: string }) {
    const items = await this.prisma.course.findMany({
      where: { instructorId: params.instructorId },
      include: { category: true, courseTags: { include: { tag: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      items: items.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        coverImageUrl: c.coverImageUrl,
        status: c.status,
        updatedAt: c.updatedAt.toISOString(),
        category: c.category ? { id: c.category.id, name: c.category.name } : null,
        tags: c.courseTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name, isActive: ct.tag.isActive })),
      })),
    };
  }

  async create(params: { instructorId: string; body: any }) {
    const course = await this.prisma.course.create({
      data: {
        instructorId: params.instructorId,
        title: params.body.title,
        description: params.body.description,
        price: params.body.price,
        coverImageUrl: params.body.coverImageUrl ?? null,
        status: 'draft',
        categoryId: params.body.categoryId ?? null,
        courseTags: {
          create: (params.body.tagIds ?? []).map((tagId: string) => ({ tagId })),
        },
      },
    });

    return { id: course.id };
  }

  async update(params: { courseId: string; instructorId: string; body: any }) {
    const course = await this.lockPolicy.assertInstructorCanEditCourse({
      courseId: params.courseId,
      instructorId: params.instructorId,
    });

    const data: any = {};
    if (Object.prototype.hasOwnProperty.call(params.body, 'title')) data.title = params.body.title;
    if (Object.prototype.hasOwnProperty.call(params.body, 'description')) data.description = params.body.description;
    if (Object.prototype.hasOwnProperty.call(params.body, 'price')) data.price = params.body.price;
    if (Object.prototype.hasOwnProperty.call(params.body, 'coverImageUrl')) data.coverImageUrl = params.body.coverImageUrl ?? null;
    if (Object.prototype.hasOwnProperty.call(params.body, 'categoryId')) data.categoryId = params.body.categoryId ?? null;

    const updated = await this.prisma.course.update({
      where: { id: course.id },
      data,
    });

    // tags: replace set (keep simple)
    if (Array.isArray(params.body.tagIds)) {
      await this.prisma.courseTag.deleteMany({ where: { courseId: updated.id } });
      if (params.body.tagIds.length) {
        await this.prisma.courseTag.createMany({
          data: params.body.tagIds.map((tagId: string) => ({ courseId: updated.id, tagId })),
        });
      }
    }

    return { id: updated.id, status: updated.status };
  }

  async submit(params: { courseId: string; instructorId: string }) {
    const updated = await this.courseState.submitForReview({
      courseId: params.courseId,
      instructorId: params.instructorId,
    });
    return { id: updated.id, status: updated.status };
  }
}
