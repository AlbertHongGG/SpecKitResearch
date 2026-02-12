import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseStatus } from '@prisma/client';
import { ErrorCodes, makeError } from '@app/contracts';

@Injectable()
export class CourseLockPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async assertInstructorCanEditCourse(params: { courseId: string; instructorId: string }) {
    const course = await this.prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));
    if (course.instructorId !== params.instructorId) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你不是此課程作者'));
    }

    if (course.status === CourseStatus.submitted) {
      throw new ConflictException(makeError(ErrorCodes.CONFLICT, '課程已提交審核，暫時無法修改'));
    }

    return course;
  }
}
