import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { AttachmentsController } from './attachments.controller';
import { LocalDiskStorage } from './storage/local-disk.storage';

@Module({
  imports: [UsersModule],
  controllers: [AttachmentsController],
  providers: [PrismaService, LocalDiskStorage],
  exports: [LocalDiskStorage],
})
export class AttachmentsModule {}
