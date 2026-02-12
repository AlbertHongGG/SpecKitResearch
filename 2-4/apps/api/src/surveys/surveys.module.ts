import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewController } from './preview.controller';
import { SurveysController } from './surveys.controller';
import { PublishService } from './publish.service';
import { UpdateDraftService } from './updateDraft.service';
import { UpdatePublishedService } from './updatePublished.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SurveysController, PreviewController],
  providers: [UpdateDraftService, UpdatePublishedService, PublishService],
})
export class SurveysModule {}
