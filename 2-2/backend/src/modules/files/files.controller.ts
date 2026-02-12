import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { FilesService } from './files.service.js';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get('lessons/:lessonId')
  async download(@Param('lessonId') lessonId: string, @Req() req: Request) {
    return this.files.getLessonFile(lessonId, req.user?.id, req.user?.role);
  }
}
