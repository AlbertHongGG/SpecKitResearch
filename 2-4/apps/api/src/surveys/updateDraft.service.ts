import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

import {
  GroupOperatorSchema,
  QuestionTypeSchema,
  RuleActionSchema,
  RuleOperatorSchema,
} from '@acme/contracts';
import type { SurveySnapshot } from '@acme/logic-engine';

import { PrismaService } from '../prisma/prisma.service';
import { validateDraftSnapshot } from './validateDraft';

const DraftQuestionInputSchema = z.object({
  id: z.string().uuid(),
  type: QuestionTypeSchema,
  title: z.string().min(1),
  is_required: z.boolean(),
  order: z.number().int(),
});

const DraftOptionInputSchema = z.object({
  id: z.string().uuid(),
  question_id: z.string().uuid(),
  label: z.string().min(1),
  value: z.string().min(1),
});

const DraftRuleInputSchema = z.object({
  id: z.string().uuid(),
  source_question_id: z.string().uuid(),
  operator: RuleOperatorSchema,
  value: z.string(),
});

const DraftRuleGroupInputSchema = z.object({
  id: z.string().uuid(),
  target_question_id: z.string().uuid(),
  action: RuleActionSchema,
  group_operator: GroupOperatorSchema,
  rules: z.array(DraftRuleInputSchema),
});

const DraftPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    is_anonymous: z.boolean().optional(),
    questions: z.array(DraftQuestionInputSchema).optional(),
    options: z.array(DraftOptionInputSchema).optional(),
    rule_groups: z.array(DraftRuleGroupInputSchema).optional(),
  })
  .strict();

export type DraftPatch = z.infer<typeof DraftPatchSchema>;

@Injectable()
export class UpdateDraftService {
  constructor(private readonly prisma: PrismaService) {}

  async updateDraft(surveyId: string, patch: unknown) {
    const parsed = DraftPatchSchema.safeParse(patch);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const existing = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { orderBy: { order: 'asc' }, include: { options: true } },
        rule_groups: { include: { rules: true } },
      },
    });

    if (!existing) throw new NotFoundException('Survey not found');

    const newQuestions = parsed.data.questions ?? existing.questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      is_required: q.is_required,
      order: q.order,
    }));

    const existingOptions = existing.questions.flatMap((q) => q.options);
    const newOptions = parsed.data.options ?? existingOptions.map((o) => ({
      id: o.id,
      question_id: o.question_id,
      label: o.label,
      value: o.value,
    }));

    const newRuleGroups = parsed.data.rule_groups ?? existing.rule_groups.map((g) => ({
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
    }));

    const snapshot: SurveySnapshot = {
      survey: {
        id: existing.id,
        slug: existing.slug,
        title: parsed.data.title ?? existing.title,
        description: parsed.data.description ?? existing.description ?? null,
        is_anonymous: parsed.data.is_anonymous ?? existing.is_anonymous,
        status: 'Draft',
      },
      publish_hash: existing.publish_hash ?? 'draft',
      questions: newQuestions,
      rule_groups: newRuleGroups,
    };

    const validation = validateDraftSnapshot(snapshot);
    if (!validation.ok) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const structureChanged =
      parsed.data.questions !== undefined || parsed.data.options !== undefined || parsed.data.rule_groups !== undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.survey.update({
        where: { id: surveyId },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          is_anonymous: parsed.data.is_anonymous,
        },
      });

      if (!structureChanged) return;

      // Replace draft structure.
      await tx.logicRule.deleteMany({ where: { group: { survey_id: surveyId } } });
      await tx.ruleGroup.deleteMany({ where: { survey_id: surveyId } });
      await tx.option.deleteMany({ where: { question: { survey_id: surveyId } } });
      await tx.question.deleteMany({ where: { survey_id: surveyId } });

      await tx.question.createMany({
        data: newQuestions.map((q) => ({
          id: q.id,
          survey_id: surveyId,
          type: q.type,
          title: q.title,
          is_required: q.is_required,
          order: q.order,
        })),
      });

      if (newOptions.length > 0) {
        await tx.option.createMany({
          data: newOptions.map((o) => ({
            id: o.id,
            question_id: o.question_id,
            label: o.label,
            value: o.value,
          })),
        });
      }

      for (const group of newRuleGroups) {
        await tx.ruleGroup.create({
          data: {
            id: group.id,
            survey_id: surveyId,
            target_question_id: group.target_question_id,
            action: group.action,
            group_operator: group.group_operator,
            rules: {
              create: group.rules.map((r) => ({
                id: r.id,
                source_question_id: r.source_question_id,
                operator: r.operator,
                value: r.value,
              })),
            },
          },
        });
      }
    });

    return { ok: true };
  }
}
