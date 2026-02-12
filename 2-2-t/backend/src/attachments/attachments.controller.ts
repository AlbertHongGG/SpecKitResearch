import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionGuard } from '../common/auth/session.guard';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get(':attachmentId/download')
  @UseGuards(SessionGuard)
  async download(@Param('attachmentId') attachmentId: string, @Req() req: any, @Res() res: Response) {
    const { attachment, stream } = await this.service.getDownload({
      attachmentId,
      viewer: { id: req.user.id, role: req.user.role },
    });

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', String(attachment.sizeBytes));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalFilename)}`,
    );

    stream.pipe(res);
  }
}
