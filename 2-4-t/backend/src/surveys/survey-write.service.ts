import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import type { RuleGroup, Question } from '@app/contracts';
import { DraftValidationService } from './draft-validation.service';
import { SchemaLockService } from './schema-lock.service';

@Injectable()
export class SurveyWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly draftValidation: DraftValidationService,
    private readonly schemaLock: SchemaLockService
  ) {}

  async updateDraftStructure(args: {
    surveyId: string;
    title?: string;
    description?: string | null;
    isAnonymous?: boolean;
    questions?: Question[];
    ruleGroups?: RuleGroup[];
  }) {
    const { surveyId, title, description, isAnonymous, questions, ruleGroups } = args;

    const wantsStructure = questions !== undefined || ruleGroups !== undefined;
    if (wantsStructure && (!questions || !ruleGroups)) {
      throw new BadRequestException({
        message: 'Both questions and rule_groups must be provided together',
        details: null
      });
    }

    if (questions && ruleGroups) {
      this.draftValidation.validateOrThrow({ questions, rule_groups: ruleGroups });
    }

    await this.prisma.$transaction(async (tx) => {
      const survey = await tx.survey.findUnique({ where: { id: surveyId }, select: { status: true } });
      if (!survey) {
        throw new ConflictException('Survey not found');
      }
      if (survey.status !== 'DRAFT') {
        this.schemaLock.locked(['questions', 'rule_groups'], survey.status);
      }

      await tx.survey.update({
        where: { id: surveyId },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(isAnonymous !== undefined ? { isAnonymous } : {})
        }
      });

      if (!questions || !ruleGroups) return;

      const existingGroups = await tx.ruleGroup.findMany({
        where: { surveyId },
        select: { id: true, rules: { select: { id: true } } }
      });
      for (const group of existingGroups) {
        for (const rule of group.rules) {
          await tx.logicRule.delete({ where: { id: rule.id } });
        }
        await tx.ruleGroup.delete({ where: { id: group.id } });
      }

      const existingQuestions = await tx.question.findMany({
        where: { surveyId },
        select: { id: true, options: { select: { id: true } } }
      });
      for (const q of existingQuestions) {
        for (const opt of q.options) {
          await tx.option.delete({ where: { id: opt.id } });
        }
        await tx.question.delete({ where: { id: q.id } });
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await tx.question.create({
          data: {
            id: q.id,
            surveyId,
            order: i + 1,
            type: q.type,
            required: q.required,
            title: q.title,
            description: q.description ?? null
          }
        });

        for (let j = 0; j < (q.options?.length ?? 0); j++) {
          const o = q.options![j];
          await tx.option.create({
            data: {
              id: o.id,
              questionId: q.id,
              order: j + 1,
              label: o.label,
              value: o.value
            }
          });
        }
      }

      for (let i = 0; i < ruleGroups.length; i++) {
        const g = ruleGroups[i];

        await tx.ruleGroup.create({
          data: {
            id: g.id,
            surveyId,
            targetQuestionId: g.target_question_id,
            action: g.action === 'show' ? 'SHOW' : 'HIDE',
            operator: g.mode,
            order: i + 1
          }
        });

        for (let j = 0; j < g.rules.length; j++) {
          const r = g.rules[j];
          await tx.logicRule.create({
            data: {
              id: r.id,
              ruleGroupId: g.id,
              sourceQuestionId: r.source_question_id,
              operator:
                r.operator === 'equals' ? 'EQUALS' : r.operator === 'not_equals' ? 'NOT_EQUALS' : 'CONTAINS',
              valueJson: r.value,
              order: j + 1
            }
          });
        }
      }
    });
  }
}
