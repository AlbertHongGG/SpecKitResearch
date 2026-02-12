import { Body, Controller, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';

import { PreviewSurveyRequestSchema, PreviewSurveyResponseSchema } from '@acme/contracts';
import { computeVisibleQuestions } from '@acme/logic-engine';
import type { SurveySnapshot } from '@acme/logic-engine';

import { OwnerGuard } from '../auth/owner.guard';
import { ZodValidationPipe } from '../common/zodValidation.pipe';
import { PrismaService } from '../prisma/prisma.service';

@Controller('surveys')
@UseGuards(OwnerGuard)
export class PreviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':surveyId/preview')
  @HttpCode(200)
  async preview(
    @Param('surveyId') surveyId: string,
    @Body(new ZodValidationPipe(PreviewSurveyRequestSchema)) body: {
      answers: Array<{ question_id: string; value: unknown }>;
    },
  ) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        rule_groups: { include: { rules: true } },
      },
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.status !== 'Draft') throw new NotFoundException('Survey not found');

    const snapshot: SurveySnapshot = {
      survey: {
        id: survey.id,
        slug: survey.slug,
        title: survey.title,
        description: survey.description ?? null,
        is_anonymous: survey.is_anonymous,
        status: 'Draft',
      },
      publish_hash: survey.publish_hash ?? 'draft',
      questions: survey.questions.map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        is_required: q.is_required,
        order: q.order,
      })),
      rule_groups: survey.rule_groups.map((g) => ({
        id: g.id,
        target_question_id: g.target_question_id,
        action: g.action,
        group_operator: g.group_operator,
        rules: g.rules.map((r) => ({
          id: r.id,
          source_question_id: r.source_question_id,
          operator: r.operator,
          value: r.value,
        })),
      })),
    };

    const answersById = Object.fromEntries(body.answers.map((a) => [a.question_id, a.value] as const));
    const result = computeVisibleQuestions(snapshot, answersById);

    PreviewSurveyResponseSchema.parse(result);
    return result;
  }
}
