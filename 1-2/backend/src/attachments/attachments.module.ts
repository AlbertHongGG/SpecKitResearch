import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentCleanupJob } from './cleanup/attachment-cleanup.job';

@Module({
    imports: [UsersModule],
    controllers: [AttachmentsController],
    providers: [AttachmentsService, AttachmentCleanupJob],
})
export class AttachmentsModule { }
