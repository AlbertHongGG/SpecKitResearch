import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import {
  CreateSurveyRequestSchema,
  CloseSurveyResponseSchema,
  PublishSurveyResponseSchema,
  SurveyDetailResponseSchema,
  SurveyListResponseSchema,
} from '@acme/contracts';

import { OwnerGuard } from '../auth/owner.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/zodValidation.pipe';
import { UpdateDraftService } from './updateDraft.service';
import { UpdatePublishedService } from './updatePublished.service';
import { PublishService } from './publish.service';
const UpdateSurveyRequestSchema = z.object({ patch: z.any() });

function toIso(date: Date): string {
  return date.toISOString();
}

@Controller('surveys')
@UseGuards(OwnerGuard)
export class SurveysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly updateDraft: UpdateDraftService,
    private readonly updatePublished: UpdatePublishedService,
    private readonly publishService: PublishService,
  ) {}

  private async loadDetailResponse(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { orderBy: { order: 'asc' }, include: { options: true } },
        rule_groups: { include: { rules: true } },
      },
    });

    if (!survey) throw new NotFoundException('Survey not found');

    const questions = survey.questions.map((q) => ({
      id: q.id,
      survey_id: q.survey_id,
      type: q.type,
      title: q.title,
      is_required: q.is_required,
      order: q.order,
    }));

    const options = survey.questions.flatMap((q) =>
      q.options.map((o) => ({
        id: o.id,
        question_id: o.question_id,
        label: o.label,
        value: o.value,
      })),
    );

    const rule_groups = survey.rule_groups.map((g) => ({
      id: g.id,
      survey_id: g.survey_id,
      target_question_id: g.target_question_id,
      action: g.action,
      group_operator: g.group_operator,
      rules: g.rules.map((r) => ({
        id: r.id,
        rule_group_id: r.rule_group_id,
        source_question_id: r.source_question_id,
        operator: r.operator,
        value: r.value,
      })),
    }));

    const body = {
      survey: {
        id: survey.id,
        owner_user_id: survey.owner_user_id,
        slug: survey.slug,
        title: survey.title,
        description: survey.description ?? null,
        is_anonymous: survey.is_anonymous,
        status: survey.status,
        publish_hash: survey.publish_hash ?? null,
        created_at: toIso(survey.created_at),
      },
      questions,
      options,
      rule_groups,
    };

    // Ensure contract parity.
    SurveyDetailResponseSchema.parse(body);
    return body;
  }

  @Get()
  async list(@Req() req: Request) {
    const userId = req.session.userId;

    const surveys = await this.prisma.survey.findMany({
      where: { owner_user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    const body = {
      surveys: surveys.map((s) => ({
        id: s.id,
        owner_user_id: s.owner_user_id,
        slug: s.slug,
        title: s.title,
        description: s.description ?? null,
        is_anonymous: s.is_anonymous,
        status: s.status,
        publish_hash: s.publish_hash ?? null,
        created_at: toIso(s.created_at),
      })),
    };

    SurveyListResponseSchema.parse(body);
    return body;
  }

  @Post()
  @HttpCode(200)
  async create(
    @Body(new ZodValidationPipe(CreateSurveyRequestSchema)) body: {
      slug: string;
      title: string;
      description?: string;
      is_anonymous: boolean;
    },
    @Req() req: Request,
  ) {
    const userId = req.session.userId;

    try {
      const survey = await this.prisma.survey.create({
        data: {
          owner_user_id: userId!,
          slug: body.slug,
          title: body.title,
          description: body.description,
          is_anonymous: body.is_anonymous,
          status: 'Draft',
        },
        select: { id: true },
      });

      return { survey_id: survey.id };
    } catch {
      throw new ConflictException('Slug already exists');
    }
  }

  @Get(':surveyId')
  async detail(@Param('surveyId') surveyId: string) {
    return await this.loadDetailResponse(surveyId);
  }

  @Put(':surveyId')
  async update(
    @Param('surveyId') surveyId: string,
    @Body(new ZodValidationPipe(UpdateSurveyRequestSchema)) body: { patch: unknown },
  ) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      select: { status: true },
    });

    if (!survey) throw new NotFoundException('Survey not found');

    if (survey.status === 'Draft') {
      await this.updateDraft.updateDraft(surveyId, body.patch);
    } else {
      await this.updatePublished.updatePublished(surveyId, body.patch);
    }

    return await this.loadDetailResponse(surveyId);
  }

  @Post(':surveyId/publish')
  @HttpCode(200)
  async publish(@Param('surveyId') surveyId: string) {
    const resp = await this.publishService.publish(surveyId);
    PublishSurveyResponseSchema.parse(resp);
    return resp;
  }

  @Post(':surveyId/close')
  @HttpCode(200)
  async close(@Param('surveyId') surveyId: string) {
    const resp = await this.publishService.close(surveyId);
    CloseSurveyResponseSchema.parse(resp);
    return resp;
  }
}
