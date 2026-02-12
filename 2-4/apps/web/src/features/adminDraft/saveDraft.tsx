'use client';

import {
  GroupOperatorSchema,
  QuestionTypeSchema,
  RuleActionSchema,
  RuleOperatorSchema,
  SurveyDetailResponseSchema,
} from '@acme/contracts';
import type { z } from 'zod';

import { updateSurvey } from './api';

export type SurveyDetail = z.infer<typeof SurveyDetailResponseSchema>;

export type DraftQuestionInput = {
  id: string;
  type: z.infer<typeof QuestionTypeSchema>;
  title: string;
  is_required: boolean;
  order: number;
};

export type DraftOptionInput = {
  id: string;
  question_id: string;
  label: string;
  value: string;
};

export type DraftRuleInput = {
  id: string;
  source_question_id: string;
  operator: z.infer<typeof RuleOperatorSchema>;
  value: string;
};

export type DraftRuleGroupInput = {
  id: string;
  target_question_id: string;
  action: z.infer<typeof RuleActionSchema>;
  group_operator: z.infer<typeof GroupOperatorSchema>;
  rules: DraftRuleInput[];
};

export type DraftPatch = {
  title: string;
  description: string | null;
  is_anonymous: boolean;
  questions: DraftQuestionInput[];
  options: DraftOptionInput[];
  rule_groups: DraftRuleGroupInput[];
};

export function toDraftPatch(detail: SurveyDetail): DraftPatch {
  return {
    title: detail.survey.title,
    description: detail.survey.description ?? null,
    is_anonymous: detail.survey.is_anonymous,
    questions: detail.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        is_required: q.is_required,
        order: q.order,
      })),
    options: detail.options.map((o) => ({
      id: o.id,
      question_id: o.question_id,
      label: o.label,
      value: o.value,
    })),
    rule_groups: detail.rule_groups.map((g) => ({
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
}

export async function saveDraft(surveyId: string, patch: DraftPatch) {
  const data = await updateSurvey(surveyId, patch);
  return SurveyDetailResponseSchema.parse(data);
}
