import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LocalDiskStorage } from './storage/local-disk.storage';

@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalDiskStorage,
    private readonly users: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: Request & { user?: AuthUser },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'validation_error',
        message: 'file is required',
      });
    }

    const stored = await this.storage.put({
      buffer: file.buffer,
      originalFilename: file.originalname,
    });

    const att = await this.prisma.attachment.create({
      data: {
        ownerUserId: req.user!.userId,
        storageKey: stored.storageKey,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: stored.bytes,
      },
    });

    return {
      id: att.id,
      original_filename: att.originalFilename,
      mime_type: att.mimeType,
      size_bytes: att.sizeBytes,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async download(
    @Req() req: Request & { user?: AuthUser },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att)
      throw new NotFoundException({
        code: 'not_found',
        message: 'Attachment not found',
      });

    const isOwner = att.ownerUserId === req.user!.userId;
    const isManagerInScope = await this.users.isDirectManagerOf(
      req.user!.userId,
      att.ownerUserId,
    );
    if (!isOwner && !isManagerInScope) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Out of scope',
      });
    }

    const streamResult = await this.storage.getStream(att.storageKey);
    if (!streamResult)
      throw new NotFoundException({
        code: 'not_found',
        message: 'File missing',
      });

    res.setHeader('Content-Type', att.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(att.originalFilename)}"`,
    );
    streamResult.stream.pipe(res);
  }
}
