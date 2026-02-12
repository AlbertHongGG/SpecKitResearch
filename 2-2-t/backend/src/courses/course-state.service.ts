import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseStatus } from '@prisma/client';
import { ErrorCodes, makeError } from '@app/contracts';

@Injectable()
export class CourseStateService {
  constructor(private readonly prisma: PrismaService) {}

  async submitForReview(params: { courseId: string; instructorId: string }) {
    const course = await this.prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));
    if (course.instructorId !== params.instructorId) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你不是此課程作者'));
    }
    if (course.status !== CourseStatus.draft) {
      throw new BadRequestException(makeError(ErrorCodes.CONFLICT, '僅 draft 可提交審核'));
    }

    return this.prisma.course.update({
      where: { id: course.id },
      data: { status: CourseStatus.submitted },
    });
  }

  async resetRejectedToDraft(params: { courseId: string; instructorId: string }) {
    const course = await this.prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));
    if (course.instructorId !== params.instructorId) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你不是此課程作者'));
    }
    if (course.status !== CourseStatus.rejected) {
      throw new BadRequestException(makeError(ErrorCodes.CONFLICT, '僅 rejected 可重設為 draft'));
    }

    return this.prisma.course.update({
      where: { id: course.id },
      data: { status: CourseStatus.draft, rejectedReason: null },
    });
  }

  async archiveOrRepublish(params: { courseId: string; actorUserId: string; actorRole: string; action: 'archive' | 'republish' }) {
    const course = await this.prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));

    const isOwner = course.instructorId === params.actorUserId;
    const isAdmin = params.actorRole === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你沒有權限變更課程狀態'));
    }

    if (params.action === 'archive') {
      if (course.status !== CourseStatus.published) {
        throw new BadRequestException(makeError(ErrorCodes.CONFLICT, '僅 published 可下架'));
      }
      return this.prisma.course.update({
        where: { id: course.id },
        data: { status: CourseStatus.archived, archivedAt: course.archivedAt ?? new Date() },
      });
    }

    if (course.status !== CourseStatus.archived) {
      throw new BadRequestException(makeError(ErrorCodes.CONFLICT, '僅 archived 可重新上架'));
    }

    return this.prisma.course.update({
      where: { id: course.id },
      data: { status: CourseStatus.published, publishedAt: course.publishedAt ?? new Date() },
    });
  }

  async adminReview(params: {
    courseId: string;
    adminId: string;
    decision: 'published' | 'rejected';
    reason?: string | null;
    note?: string | null;
  }) {
    const course = await this.prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));
    if (course.status !== CourseStatus.submitted) {
      throw new BadRequestException(makeError(ErrorCodes.CONFLICT, '僅 submitted 可審核'));
    }

    if (params.decision === 'rejected' && !params.reason?.trim()) {
      throw new BadRequestException(makeError(ErrorCodes.VALIDATION_ERROR, '駁回理由必填', { field: 'reason' }));
    }

    return this.prisma.$transaction(async (tx) => {
      const nextStatus = params.decision === 'published' ? CourseStatus.published : CourseStatus.rejected;
      const updated = await tx.course.update({
        where: { id: course.id },
        data: {
          status: nextStatus,
          publishedAt: nextStatus === CourseStatus.published ? course.publishedAt ?? new Date() : course.publishedAt,
          rejectedReason: nextStatus === CourseStatus.rejected ? params.reason!.trim() : null,
        },
      });

      await tx.courseReview.create({
        data: {
          courseId: course.id,
          reviewerAdminId: params.adminId,
          decision: nextStatus,
          reason: params.decision === 'rejected' ? params.reason!.trim() : null,
          note: params.decision === 'published' ? (params.note?.trim() ? params.note.trim() : null) : null,
        },
      });

      return updated;
    });
  }
}
