import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseLockPolicy } from '../courses/course-lock.policy';
import { ErrorCodes, makeError } from '@app/contracts';
import { LessonContentType } from '@prisma/client';

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockPolicy: CourseLockPolicy,
  ) {}

  private async resolveCourseBySection(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '章節不存在'));
    return { section, course: section.course };
  }

  private async resolveCourseByLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '單元不存在'));
    return { lesson, section: lesson.section, course: lesson.section.course };
  }

  async getCurriculum(params: { courseId: string; instructorId: string }) {
    const course = await this.prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));
    if (course.instructorId !== params.instructorId) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你不是此課程作者'));
    }

    const sections = await this.prisma.section.findMany({
      where: { courseId: course.id },
      include: { lessons: { orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    });

    return {
      course: { id: course.id, status: course.status, title: course.title },
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        position: s.position,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          position: l.position,
          contentType: l.contentType,
        })),
      })),
    };
  }

  async createSection(params: { courseId: string; instructorId: string; title: string }) {
    await this.lockPolicy.assertInstructorCanEditCourse({
      courseId: params.courseId,
      instructorId: params.instructorId,
    });

    const max = await this.prisma.section.aggregate({
      where: { courseId: params.courseId },
      _max: { position: true },
    });

    const section = await this.prisma.section.create({
      data: {
        courseId: params.courseId,
        title: params.title,
        position: (max._max.position ?? 0) + 1,
      },
    });

    return { id: section.id };
  }

  async updateSection(params: { sectionId: string; instructorId: string; title: string }) {
    const { section, course } = await this.resolveCourseBySection(params.sectionId);
    await this.lockPolicy.assertInstructorCanEditCourse({ courseId: course.id, instructorId: params.instructorId });

    const updated = await this.prisma.section.update({ where: { id: section.id }, data: { title: params.title } });
    return { id: updated.id };
  }

  async deleteSection(params: { sectionId: string; instructorId: string }) {
    const { section, course } = await this.resolveCourseBySection(params.sectionId);
    await this.lockPolicy.assertInstructorCanEditCourse({ courseId: course.id, instructorId: params.instructorId });

    await this.prisma.section.delete({ where: { id: section.id } });
    return { ok: true };
  }

  async reorderSections(params: { courseId: string; instructorId: string; ids: string[] }) {
    await this.lockPolicy.assertInstructorCanEditCourse({ courseId: params.courseId, instructorId: params.instructorId });

    const sections = await this.prisma.section.findMany({ where: { courseId: params.courseId } });
    const sectionIds = new Set(sections.map((s) => s.id));
    if (sections.length !== params.ids.length || params.ids.some((id) => !sectionIds.has(id))) {
      throw new ConflictException(makeError(ErrorCodes.CONFLICT, '排序清單不合法'));
    }

    await this.prisma.$transaction(async (tx) => {
      // move out of the way to avoid unique conflicts
      for (const s of sections) {
        await tx.section.update({ where: { id: s.id }, data: { position: s.position + 1000 } });
      }
      for (let i = 0; i < params.ids.length; i += 1) {
        await tx.section.update({ where: { id: params.ids[i] }, data: { position: i + 1 } });
      }
    });

    return { ok: true };
  }

  private normalizeLessonBody(body: any) {
    const contentType = body.contentType as LessonContentType;
    if (contentType === 'text') {
      return { contentType, contentText: body.contentText ?? '', contentImageUrl: null, contentFileId: null };
    }
    if (contentType === 'image') {
      return { contentType, contentText: null, contentImageUrl: body.contentImageUrl ?? null, contentFileId: null };
    }
    return { contentType, contentText: null, contentImageUrl: null, contentFileId: body.contentFileId ?? null };
  }

  async createLesson(params: { sectionId: string; instructorId: string; body: any }) {
    const { section, course } = await this.resolveCourseBySection(params.sectionId);
    await this.lockPolicy.assertInstructorCanEditCourse({ courseId: course.id, instructorId: params.instructorId });

    const max = await this.prisma.lesson.aggregate({ where: { sectionId: section.id }, _max: { position: true } });
    const normalized = this.normalizeLessonBody(params.body);

    const lesson = await this.prisma.lesson.create({
      data: {
        sectionId: section.id,
        title: params.body.title,
        position: (max._max.position ?? 0) + 1,
        ...normalized,
      },
    });

    return { id: lesson.id };
  }

  async updateLesson(params: { lessonId: string; instructorId: string; body: any }) {
    const { lesson, course } = await this.resolveCourseByLesson(params.lessonId);
    await this.lockPolicy.assertInstructorCanEditCourse({ courseId: course.id, instructorId: params.instructorId });

    const patch: any = {};
    if (typeof params.body.title === 'string') patch.title = params.body.title;
    if (params.body.contentType) {
      Object.assign(patch, this.normalizeLessonBody(params.body));
    }

    const updated = await this.prisma.lesson.update({ where: { id: lesson.id }, data: patch });
    return { id: updated.id };
  }

  async deleteLesson(params: { lessonId: string; instructorId: string }) {
    const { lesson, course } = await this.resolveCourseByLesson(params.lessonId);
    await this.lockPolicy.assertInstructorCanEditCourse({ courseId: course.id, instructorId: params.instructorId });

    await this.prisma.lesson.delete({ where: { id: lesson.id } });
    return { ok: true };
  }

  async reorderLessons(params: { sectionId: string; instructorId: string; ids: string[] }) {
    const { section, course } = await this.resolveCourseBySection(params.sectionId);
    await this.lockPolicy.assertInstructorCanEditCourse({ courseId: course.id, instructorId: params.instructorId });

    const lessons = await this.prisma.lesson.findMany({ where: { sectionId: section.id } });
    const lessonIds = new Set(lessons.map((l) => l.id));
    if (lessons.length !== params.ids.length || params.ids.some((id) => !lessonIds.has(id))) {
      throw new ConflictException(makeError(ErrorCodes.CONFLICT, '排序清單不合法'));
    }

    await this.prisma.$transaction(async (tx) => {
      for (const l of lessons) {
        await tx.lesson.update({ where: { id: l.id }, data: { position: l.position + 1000 } });
      }
      for (let i = 0; i < params.ids.length; i += 1) {
        await tx.lesson.update({ where: { id: params.ids[i] }, data: { position: i + 1 } });
      }
    });

    return { ok: true };
  }
}
