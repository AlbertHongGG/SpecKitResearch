import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { AttachmentStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getEnv } from '../../common/config/env';
import { LocalFilesystemStorage } from '../storage/local-filesystem.storage';

const STALE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AttachmentCleanupJob {
    constructor(private readonly prisma: PrismaService) { }

    private storage() {
        const { UPLOAD_DIR } = getEnv();
        return new LocalFilesystemStorage(path.resolve(UPLOAD_DIR));
    }

    /**
     * Cleans up TEMP/orphan attachments.
     *
     * MVP behavior:
     * - Select TEMP attachments that are either unlinked (leaveRequestId=null) or older than 24h
     * - Delete blob from local storage
     * - Mark as DELETED in DB
     */
    async runOnce(args?: { limit?: number }) {
        const limit = args?.limit ?? 200;
        const cutoff = new Date(Date.now() - STALE_MS);

        const candidates = await this.prisma.attachment.findMany({
            where: {
                status: AttachmentStatus.TEMP,
                OR: [{ leaveRequestId: null }, { createdAt: { lt: cutoff } }],
            },
            take: limit,
            orderBy: { createdAt: 'asc' },
        });

        for (const a of candidates) {
            await this.storage().delete(a.storageKey);
            await this.prisma.attachment.update({
                where: { id: a.id },
                data: { status: AttachmentStatus.DELETED },
            });
        }

        return { deleted: candidates.length };
    }
}
