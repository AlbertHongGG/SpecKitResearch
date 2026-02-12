import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { SubmitResponseRequestSchema } from '@acme/contracts';
import { canonicalizeAnswers } from '@acme/logic-engine';

import { logInfo, logWarn } from '../common/logger';
import { incCounter } from '../common/metrics';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/zodValidation.pipe';
import { ResponsesService } from './responses.service';
import { validateSubmit } from './validateSubmit';

@Controller()
export class ResponsesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly responses: ResponsesService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @Post('responses')
  @HttpCode(200)
  async submit(
    @Body(new ZodValidationPipe(SubmitResponseRequestSchema)) body: {
      survey_id: string;
      publish_hash: string;
      answers: Array<{ question_id: string; value: unknown }>;
    },
    @Req() req: Request,
  ) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: body.survey_id },
      select: {
        id: true,
        status: true,
        is_anonymous: true,
        publish_hash: true,
      },
    });

    if (!survey) throw new NotFoundException('Not found');
    if (survey.status !== 'Published') throw new NotFoundException('Not found');
    if (!survey.publish_hash) throw new NotFoundException('Not found');

    if (survey.publish_hash !== body.publish_hash) {
      throw new ConflictException('publish_hash mismatch');
    }

    const publish = await this.prisma.surveyPublish.findUnique({
      where: { publish_hash: body.publish_hash },
      select: { id: true, publish_hash: true, schema_json: true },
    });

    if (!publish) throw new NotFoundException('Not found');

    const respondentId = req.session.userId ?? null;
    if (!survey.is_anonymous && !respondentId) {
      throw new UnauthorizedException('Authentication required');
    }

    const snapshot = this.responses.buildSnapshotFromPublish({
      publishHash: publish.publish_hash,
      schemaJson: publish.schema_json,
    });

    const validation = validateSubmit(snapshot, body.answers);
    if (!validation.ok) {
      incCounter('submit_validation_error');
      logWarn('submit_validation_error', {
        surveyId: survey.id,
        publish_hash: body.publish_hash,
        error_count: validation.errors.length,
      });
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const canonicalAnswersById = canonicalizeAnswers(snapshot, validation.canonicalById);

    const created = await this.responses.createResponse({
      surveyId: survey.id,
      surveyPublishId: publish.id,
      publishHash: publish.publish_hash,
      respondentId,
      snapshot,
      canonicalAnswersById,
    });

    incCounter('submit_success');
    logInfo('submit_success', { surveyId: survey.id, publish_hash: body.publish_hash });
    return created;
  }
}
