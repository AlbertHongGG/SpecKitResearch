import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseStatus } from '@prisma/client';
import { ErrorCodes, makeError } from '@app/contracts';
import { withSqliteBusyRetry } from '../common/database/retry';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async purchaseCourse(params: { courseId: string; userId: string }) {
    return withSqliteBusyRetry(async () => {
      const course = await this.prisma.course.findUnique({
        where: { id: params.courseId },
        select: { id: true, status: true },
      });
      if (!course) {
        throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在'));
      }
      if (course.status !== CourseStatus.published) {
        throw new ForbiddenException(makeError(ErrorCodes.COURSE_NOT_PURCHASABLE, '此課程目前不可購買'));
      }

      try {
        const purchase = await this.prisma.purchase.create({
          data: { userId: params.userId, courseId: params.courseId },
        });
        return { purchaseId: purchase.id, purchasedAt: purchase.purchasedAt.toISOString() };
      } catch (e: any) {
        if (e?.code === 'P2002') {
          const existing = await this.prisma.purchase.findUnique({
            where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
            select: { id: true, purchasedAt: true },
          });
          if (!existing) {
            throw new ConflictException(makeError(ErrorCodes.ALREADY_PURCHASED, '已購買'));
          }
          return { purchaseId: existing.id, purchasedAt: existing.purchasedAt.toISOString() };
        }
        throw e;
      }
    });
  }
}
