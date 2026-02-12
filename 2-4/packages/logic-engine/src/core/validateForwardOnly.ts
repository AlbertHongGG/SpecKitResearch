import type { SurveySnapshot } from './types.js';

export type ForwardOnlyError = {
  source_question_id: string;
  target_question_id: string;
  message: string;
};

export function validateForwardOnly(snapshot: SurveySnapshot): ForwardOnlyError[] {
  const orderById = new Map(snapshot.questions.map((q) => [q.id, q.order] as const));
  const errors: ForwardOnlyError[] = [];

  for (const group of snapshot.rule_groups) {
    const targetOrder = orderById.get(group.target_question_id);
    for (const rule of group.rules) {
      const sourceOrder = orderById.get(rule.source_question_id);

      if (targetOrder == null || sourceOrder == null) continue;
      if (targetOrder <= sourceOrder) {
        errors.push({
          source_question_id: rule.source_question_id,
          target_question_id: group.target_question_id,
          message: 'Rule must be forward-only (target.order > source.order)',
        });
      }
    }
  }

  return errors;
}
