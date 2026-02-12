import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import type { CreateSurveyRequest, SurveyDetail, SurveySummary, UpdateSurveyRequest } from '@app/contracts';
import { toSurveyDetail, toSurveySummary } from './survey-mappers';
import { SurveyWriteService } from './survey-write.service';
import { SchemaLockService } from './schema-lock.service';

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: SurveyWriteService,
    private readonly schemaLock: SchemaLockService
  ) {}

  async listForOwner(ownerUserId: string): Promise<SurveySummary[]> {
    const surveys = await this.prisma.survey.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' }
    });
    return surveys.map(toSurveySummary);
  }

  async createDraft(ownerUserId: string, input: CreateSurveyRequest): Promise<SurveySummary> {
    try {
      const survey = await this.prisma.survey.create({
        data: {
          ownerUserId,
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          isAnonymous: input.is_anonymous,
          status: 'DRAFT'
        }
      });
      return toSurveySummary(survey);
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg.includes('Unique constraint failed') || msg.includes('P2002')) {
        throw new ConflictException('Slug already exists');
      }
      throw e;
    }
  }

  async getDetailOrThrow(ownerUserId: string, surveyId: string): Promise<SurveyDetail> {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
        ruleGroups: { include: { rules: true }, orderBy: { order: 'asc' } }
      }
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.ownerUserId !== ownerUserId) throw new NotFoundException('Survey not found');

    return toSurveyDetail(survey);
  }

  async update(ownerUserId: string, surveyId: string, input: UpdateSurveyRequest): Promise<SurveyDetail> {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.ownerUserId !== ownerUserId) throw new NotFoundException('Survey not found');

    if (survey.status !== 'DRAFT') {
      const structural =
        input.is_anonymous !== undefined || input.questions !== undefined || input.rule_groups !== undefined;
      if (structural) {
        const fields = [
          ...(input.is_anonymous !== undefined ? ['is_anonymous'] : []),
          ...(input.questions !== undefined ? ['questions'] : []),
          ...(input.rule_groups !== undefined ? ['rule_groups'] : [])
        ];
        this.schemaLock.locked(fields, survey.status);
      }

      await this.prisma.survey.update({
        where: { id: surveyId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {})
        }
      });
    } else {
      await this.writer.updateDraftStructure({
        surveyId,
        title: input.title,
        description: input.description,
        isAnonymous: input.is_anonymous,
        questions: input.questions,
        ruleGroups: input.rule_groups
      });
    }

    return this.getDetailOrThrow(ownerUserId, surveyId);
  }
}
