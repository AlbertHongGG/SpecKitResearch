import { Module } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

@Module({
  controllers: [FilesController],
  providers: [PrismaService, FilesService],
})
export class FilesModule {}
