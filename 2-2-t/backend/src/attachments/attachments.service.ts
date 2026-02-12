import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ErrorCodes, makeError } from '@app/contracts';
import { canAccessCourseContent } from '../common/auth/policies';
import { LocalStorage } from './storage.local';

@Injectable()
export class AttachmentsService {
  private readonly storage: LocalStorage;

  constructor(private readonly prisma: PrismaService) {
    const uploadsDir = process.env.UPLOADS_DIR ?? '../var/uploads';
    this.storage = new LocalStorage(uploadsDir);
    this.storage.ensureUploadsDir();
  }

  async getDownload(params: { attachmentId: string; viewer: { id: string; role: string } }) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: params.attachmentId },
      include: { lesson: { include: { section: { include: { course: true } } } } },
    });

    if (!attachment || attachment.deletedAt) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '檔案不存在'));
    }

    const course = attachment.lesson.section.course;

    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: params.viewer.id, courseId: course.id } },
      select: { id: true },
    });

    const allowed = canAccessCourseContent({
      viewerUserId: params.viewer.id,
      viewerRole: params.viewer.role as any,
      ownerUserId: course.instructorId,
      isPurchased: Boolean(purchase),
    });

    if (!allowed) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你沒有下載此附件的權限'));
    }

    if (!this.storage.exists(attachment.storageKey)) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '檔案不存在'));
    }

    return {
      attachment,
      stream: this.storage.createReadStream(attachment.storageKey),
    };
  }
}
