import { detectCycles, validateForwardOnly } from '@acme/logic-engine';
import type { SurveySnapshot } from '@acme/logic-engine';

type FieldError = { path: string; message: string };

type DraftValidationResult =
  | { ok: true }
  | { ok: false; errors: FieldError[] };

export function validateDraftSnapshot(snapshot: SurveySnapshot): DraftValidationResult {
  const errors: FieldError[] = [];

  const questionIds = new Set(snapshot.questions.map((q) => q.id));

  // Reference integrity + forward-only (with locatable paths)
  for (let gi = 0; gi < snapshot.rule_groups.length; gi++) {
    const group = snapshot.rule_groups[gi];

    if (!questionIds.has(group.target_question_id)) {
      errors.push({
        path: `rule_groups[${gi}].target_question_id`,
        message: 'Unknown target_question_id',
      });
    }

    for (let ri = 0; ri < group.rules.length; ri++) {
      const rule = group.rules[ri];
      if (!questionIds.has(rule.source_question_id)) {
        errors.push({
          path: `rule_groups[${gi}].rules[${ri}].source_question_id`,
          message: 'Unknown source_question_id',
        });
      }
    }
  }

  const forwardOnlyErrors = validateForwardOnly(snapshot);
  if (forwardOnlyErrors.length > 0) {
    for (let gi = 0; gi < snapshot.rule_groups.length; gi++) {
      const group = snapshot.rule_groups[gi];
      for (let ri = 0; ri < group.rules.length; ri++) {
        const rule = group.rules[ri];
        const violated = forwardOnlyErrors.some(
          (e) => e.source_question_id === rule.source_question_id && e.target_question_id === group.target_question_id,
        );
        if (violated) {
          errors.push({
            path: `rule_groups[${gi}].rules[${ri}]`,
            message: 'Rule must be forward-only (target.order > source.order)',
          });
        }
      }
    }
  }

  const cycle = detectCycles(snapshot);
  if (cycle) {
    errors.push({
      path: 'rule_groups',
      message: `Cycle detected: ${cycle.cycle_path_question_ids.join(' -> ')}`,
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}
