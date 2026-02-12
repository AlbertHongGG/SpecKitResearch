import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { toSurveyDetail } from './survey-mappers';
import { DraftValidationService } from './draft-validation.service';
import { PublishHashBuilder } from './publish-hash.builder';
import { logSurveyPublished } from '../shared/logging/events';

@Injectable()
export class PublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly draftValidation: DraftValidationService,
    private readonly publishHash: PublishHashBuilder
  ) {}

  async publish(ownerUserId: string, surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
        ruleGroups: { include: { rules: true }, orderBy: { order: 'asc' } }
      }
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.ownerUserId !== ownerUserId) throw new NotFoundException('Survey not found');
    if (survey.status !== 'DRAFT') {
      throw new ConflictException({
        message: 'Survey must be DRAFT to publish',
        details: [{ code: 'INVALID_STATUS_TRANSITION', message: `Current status: ${survey.status}` }]
      });
    }

    const detail = toSurveyDetail(survey);
    this.draftValidation.validateOrThrow({
      questions: detail.questions,
      rule_groups: detail.rule_groups
    });

    const publishHash = this.publishHash.computeFromSurveyStructure({
      survey_id: survey.id,
      slug: survey.slug,
      questions: survey.questions.map((q) => ({
        id: q.id,
        order: q.order,
        type: q.type,
        required: q.required,
        title: q.title,
        description: q.description ?? null,
        options: q.options
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((o) => ({ id: o.id, order: o.order, value: o.value, label: o.label }))
      })),
      rule_groups: survey.ruleGroups.map((g) => ({
        id: g.id,
        target_question_id: g.targetQuestionId,
        action: g.action,
        mode: g.operator,
        order: g.order,
        rules: g.rules
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((r) => ({
            id: r.id,
            source_question_id: r.sourceQuestionId,
            operator: r.operator,
            value: r.valueJson,
            order: r.order
          }))
      }))
    });

    await this.prisma.survey.update({
      where: { id: surveyId },
      data: {
        status: 'PUBLISHED',
        publishHash
      }
    });

    logSurveyPublished({ survey_id: surveyId, owner_user_id: ownerUserId, publish_hash: publishHash });

    return this.prisma.survey.findUniqueOrThrow({
      where: { id: surveyId },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
        ruleGroups: { include: { rules: true }, orderBy: { order: 'asc' } }
      }
    });
  }
}
