import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../auth/require-auth.guard';
import { RequireOwnerGuard } from '../auth/require-owner.guard';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import {
  CreateSurveyRequestSchema,
  UpdateSurveyRequestSchema
} from '@app/contracts';
import type { CreateSurveyRequest, UpdateSurveyRequest } from '@app/contracts';
import { SurveysService } from './surveys.service';
import { PublishService } from './publish.service';
import { CloseService } from './close.service';

@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly surveys: SurveysService,
    private readonly publish: PublishService,
    private readonly close: CloseService
  ) {}

  @Get()
  @UseGuards(RequireAuthGuard)
  async listSurveys(@Req() req: Request) {
    const user = (req as any).user as { id: string };
    const surveys = await this.surveys.listForOwner(user.id);
    return { surveys };
  }

  @Post()
  @UseGuards(RequireAuthGuard)
  async createSurvey(
    @Req() req: Request,
    @Body(new ZodValidationPipe(CreateSurveyRequestSchema)) body: CreateSurveyRequest
  ) {
    const user = (req as any).user as { id: string };
    const survey = await this.surveys.createDraft(user.id, body);
    return { survey };
  }

  @Get(':id')
  @UseGuards(RequireAuthGuard, RequireOwnerGuard)
  async getSurvey(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user as { id: string };
    const survey = await this.surveys.getDetailOrThrow(user.id, id);
    return { survey };
  }

  @Patch(':id')
  @UseGuards(RequireAuthGuard, RequireOwnerGuard)
  async updateSurvey(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSurveyRequestSchema)) body: UpdateSurveyRequest
  ) {
    const user = (req as any).user as { id: string };
    const survey = await this.surveys.update(user.id, id, body);
    return { survey };
  }

  @Post(':id/publish')
  @UseGuards(RequireAuthGuard, RequireOwnerGuard)
  async publishSurvey(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user as { id: string };
    const survey = await this.publish.publish(user.id, id);
    return {
      survey: {
        id: survey.id,
        status: survey.status,
        publish_hash: survey.publishHash
      }
    };
  }

  @Post(':id/close')
  @UseGuards(RequireAuthGuard, RequireOwnerGuard)
  async closeSurvey(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user as { id: string };
    const survey = await this.close.close(user.id, id);
    return {
      survey: {
        id: survey.id,
        status: survey.status
      }
    };
  }
}

