import {
    Controller,
    Get,
    Param,
    Post,
    Res,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CsrfGuard } from '../auth/csrf/csrf.guard';
import { CurrentUser } from '../common/http/current-user.decorator';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
@UseGuards(AuthGuard)
export class AttachmentsController {
    constructor(private readonly attachments: AttachmentsService) { }

    @UseGuards(CsrfGuard)
    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @CurrentUser() user: { id: string },
        @UploadedFile() file: Express.Multer.File,
    ) {
        const attachment = await this.attachments.upload(user.id, file);
        return { attachmentId: attachment.id };
    }

    @Get(':id')
    async metadata(@CurrentUser() user: { id: string }, @Param('id') id: string) {
        const attachment = await this.attachments.getMetadata(user.id, id);
        return {
            id: attachment.id,
            originalFilename: attachment.originalFilename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            createdAt: attachment.createdAt.toISOString(),
        };
    }

    @Get(':id/download')
    async download(
        @CurrentUser() user: { id: string },
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const { attachment, stream } = await this.attachments.openDownloadStream(user.id, id);

        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-store');
        const filename = encodeURIComponent(attachment.originalFilename);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);

        stream.pipe(res);
    }
}
