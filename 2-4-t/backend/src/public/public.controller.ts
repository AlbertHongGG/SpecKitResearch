import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import type { PublicSurvey } from '@app/contracts';

@Controller()
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/s/:slug')
  async getPublicSurvey(@Param('slug') slug: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { slug },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
        ruleGroups: { include: { rules: true }, orderBy: { order: 'asc' } }
      }
    });

    if (!survey || survey.status !== 'PUBLISHED' || !survey.publishHash) {
      throw new NotFoundException('Survey not found');
    }

    const publicSurvey: PublicSurvey = {
      id: survey.id,
      slug: survey.slug,
      title: survey.title,
      description: survey.description ?? null,
      is_anonymous: survey.isAnonymous,
      questions: survey.questions.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description ?? undefined,
        type: q.type,
        required: q.required,
        options: q.options.length
          ? q.options
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((o) => ({ id: o.id, label: o.label, value: o.value }))
          : undefined
      })),
      rule_groups: survey.ruleGroups.map((g) => ({
        id: g.id,
        target_question_id: g.targetQuestionId,
        action: g.action === 'SHOW' ? 'show' : 'hide',
        mode: g.operator,
        rules: g.rules
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((r) => ({
            id: r.id,
            source_question_id: r.sourceQuestionId,
            operator:
              r.operator === 'EQUALS' ? 'equals' : r.operator === 'NOT_EQUALS' ? 'not_equals' : 'contains',
            value: r.valueJson
          }))
      }))
    };

    return { survey: publicSurvey, publish_hash: survey.publishHash };
  }
}
