import * as path from 'node:path';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { getEnv } from '../common/config/env';
import { ManagerScopeService } from '../users/permissions/manager-scope.service';
import { LocalFilesystemStorage } from './storage/local-filesystem.storage';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'application/pdf',
]);

@Injectable()
export class AttachmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly managerScope: ManagerScopeService,
    ) { }

    private uploadDir() {
        const { UPLOAD_DIR } = getEnv();
        return path.resolve(UPLOAD_DIR);
    }

    private storage() {
        return new LocalFilesystemStorage(this.uploadDir());
    }

    async upload(ownerUserId: string, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'file is required' });
        }
        if (file.size <= 0 || file.size > MAX_BYTES) {
            throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid file size' });
        }
        if (!ALLOWED_MIME.has(file.mimetype)) {
            throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Unsupported file type' });
        }

        const storageKey = randomUUID();
        await this.storage().save(storageKey, file.buffer);

        const attachment = await this.prisma.attachment.create({
            data: {
                ownerUserId,
                originalFilename: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                storageKey,
                status: AttachmentStatus.TEMP,
            },
        });

        return attachment;
    }

    async getMetadata(userId: string, attachmentId: string) {
        const attachment = await this.prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: {
                leaveRequest: {
                    include: { user: true },
                },
            },
        });

        if (!attachment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });

        await this.assertCanAccess(userId, attachment);

        return attachment;
    }

    async openDownloadStream(userId: string, attachmentId: string) {
        const attachment = await this.prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: {
                leaveRequest: {
                    include: { user: true },
                },
            },
        });

        if (!attachment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });

        await this.assertCanAccess(userId, attachment);

        const exists = await this.storage().exists(attachment.storageKey);
        if (!exists) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
        }

        return { attachment, stream: this.storage().open(attachment.storageKey) };
    }

    private async assertCanAccess(
        userId: string,
        attachment: Prisma.AttachmentGetPayload<{ include: { leaveRequest: { include: { user: true } } } }>,
    ) {
        if (attachment.ownerUserId === userId) return;

        const lr = attachment.leaveRequest;
        if (!lr) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
        }

        const ok = await this.managerScope.canManage(userId, lr.userId);
        if (!ok) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
        }
    }
}
