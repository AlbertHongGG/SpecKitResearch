import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ErrorCodes, makeError } from '@app/contracts';
import { canAccessCourseContent } from '../common/auth/policies';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class MyCoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async listMyCourses(userId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: true,
            category: true,
            courseTags: { include: { tag: true } },
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    const items = [] as any[];
    for (const p of purchases) {
      const summary = await this.progress.getProgressSummary({ userId, courseId: p.courseId });
      items.push({
        course: {
          id: p.course.id,
          title: p.course.title,
          description: p.course.description,
          price: p.course.price,
          status: p.course.status,
          coverImageUrl: p.course.coverImageUrl,
          category: p.course.category ? { id: p.course.category.id, name: p.course.category.name } : null,
          tags: p.course.courseTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name })),
          instructor: { id: p.course.instructor.id, email: p.course.instructor.email },
        },
        purchasedAt: p.purchasedAt.toISOString(),
        progress: summary,
      });
    }

    return { items };
  }

  async getReader(params: { userId: string; userRole: string; courseId: string; lessonId?: string }) {
    const course = await this.prisma.course.findUnique({
      where: { id: params.courseId },
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

    if (!course) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));
    }

    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: params.userId, courseId: course.id } },
      select: { id: true },
    });

    const allowed = canAccessCourseContent({
      viewerUserId: params.userId,
      viewerRole: params.userRole as any,
      ownerUserId: course.instructorId,
      isPurchased: Boolean(purchase),
    });

    if (!allowed) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你沒有存取此課程內容的權限'));
    }

    const allLessons = course.sections.flatMap((s) => s.lessons);
    const selectedLessonId = params.lessonId ?? allLessons[0]?.id;
    if (!selectedLessonId) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程沒有任何單元'));
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: selectedLessonId },
      include: {
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        contentFile: true,
      },
    });
    if (!lesson) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, 'Lesson 不存在'));
    }

    const summary = await this.progress.getProgressSummary({ userId: params.userId, courseId: course.id });

    const attachmentMetas = lesson.attachments.map((a) => ({
      id: a.id,
      filename: a.originalFilename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    }));

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        status: course.status,
        coverImageUrl: course.coverImageUrl,
        category: course.category ? { id: course.category.id, name: course.category.name } : null,
        tags: course.courseTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name })),
        instructor: { id: course.instructor.id, email: course.instructor.email },
      },
      curriculum: course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        position: s.position,
        lessons: s.lessons.map((l) => ({ id: l.id, title: l.title, position: l.position })),
      })),
      lesson: {
        id: lesson.id,
        title: lesson.title,
        contentType: lesson.contentType,
        contentText: lesson.contentText,
        contentImageUrl: lesson.contentImageUrl,
        attachments: attachmentMetas,
      },
      progressSummary: summary,
    };
  }
}
