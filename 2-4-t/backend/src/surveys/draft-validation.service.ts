import { BadRequestException, Injectable } from '@nestjs/common';
import { validateSurveyDraft } from '@app/logic-engine';
import type { RuleGroup, Question } from '@app/contracts';

type DraftLike = {
  questions: Question[];
  rule_groups: RuleGroup[];
};

@Injectable()
export class DraftValidationService {
  validateOrThrow(draft: DraftLike) {
    const questionIds = new Set(draft.questions.map((q) => q.id));

    const refErrors: Array<Record<string, unknown>> = [];
    for (const group of draft.rule_groups) {
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

    const result = validateSurveyDraft(draft);
    const allErrors = [...refErrors, ...result.errors];

    if (allErrors.length) {
      throw new BadRequestException({
        message: 'Draft validation failed',
        details: allErrors
      });
    }
  }
}
