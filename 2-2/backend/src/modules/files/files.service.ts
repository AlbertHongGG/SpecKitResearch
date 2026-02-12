import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { ensureContentAccess } from '../courses/access-control.js';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getLessonFile(lessonId: string, userId?: string, role?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    const course = lesson.section.course;
    const purchase = userId
      ? await this.prisma.purchase.findUnique({
          where: { userId_courseId: { userId, courseId: course.id } },
        })
      : null;
    ensureContentAccess(course, userId, role, !!purchase);
    if (lesson.contentType !== 'pdf' && lesson.contentType !== 'image') {
      throw new ForbiddenException('No file content');
    }
    const url = lesson.contentType === 'pdf' ? lesson.contentFileUrl : lesson.contentImageUrl;
    if (!url) {
      throw new NotFoundException('File not found');
    }
    return {
      url,
      name: lesson.contentFileName,
      contentType: lesson.contentType,
    };
  }
}
