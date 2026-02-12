'use client';

import { validateSurveyDraft } from '@app/logic-engine';
import type { Question, RuleGroup } from '@app/contracts';

export type EditorValidationError = {
  code: string;
  message: string;
  [k: string]: unknown;
};

export function validateDraftClient(input: { questions: Question[]; rule_groups: RuleGroup[] }): EditorValidationError[] {
  const questionIds = new Set(input.questions.map((q) => q.id));
  const refErrors: EditorValidationError[] = [];

  for (const group of input.rule_groups) {
    if (!questionIds.has(group.target_question_id)) {
      refErrors.push({
        code: 'INVALID_RULE_REFERENCE',
        message: `Unknown target_question_id: ${group.target_question_id}`,
        rule_group_id: group.id,
        target_question_id: group.target_question_id
      });
    }
    for (const rule of group.rules) {
      if (!questionIds.has(rule.source_question_id)) {
        refErrors.push({
          code: 'INVALID_RULE_REFERENCE',
          message: `Unknown source_question_id: ${rule.source_question_id}`,
          rule_group_id: group.id,
          source_question_id: rule.source_question_id
        });
      }
    }
  }

  const res = validateSurveyDraft(input);
  return [...refErrors, ...res.errors];
}
