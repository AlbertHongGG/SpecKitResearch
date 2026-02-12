import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { DraftValidationService } from './draft-validation.service';
import { SurveyWriteService } from './survey-write.service';
import { PublishService } from './publish.service';
import { CloseService } from './close.service';
import { PublishHashBuilder } from './publish-hash.builder';
import { SchemaLockService } from './schema-lock.service';
import { RequireAuthGuard } from '../auth/require-auth.guard';
import { RequireOwnerGuard } from '../auth/require-owner.guard';

@Module({
  controllers: [SurveysController],
  providers: [
    PrismaService,
    SurveysService,
    DraftValidationService,
    SurveyWriteService,
    SchemaLockService,
    PublishHashBuilder,
    PublishService,
    CloseService,
    RequireAuthGuard,
    RequireOwnerGuard
  ]
})
export class SurveysModule {}

