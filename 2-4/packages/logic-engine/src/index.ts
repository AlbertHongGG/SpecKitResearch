export type * from './core/types.js';
import { canonicalizeAnswers } from './core/canonicalizeAnswers.js';
import { computeVisibility } from './core/computeVisibility.js';
import { detectCycles } from './core/detectCycles.js';
import { evaluateRuleGroup } from './core/evaluateRuleGroup.js';
import { validateForwardOnly } from './core/validateForwardOnly.js';

export { computeVisibility, evaluateRuleGroup, canonicalizeAnswers, validateForwardOnly, detectCycles };

export function computeVisibleQuestions(
	snapshot: import('./core/types.js').SurveySnapshot,
	answers: import('./core/types.js').AnswersByQuestionId,
) {
	return computeVisibility(snapshot, canonicalizeAnswers(snapshot, answers));
}

export function validateDraftRules(snapshot: import('./core/types.js').SurveySnapshot) {
	const forwardOnlyErrors = validateForwardOnly(snapshot);
	const cycle = detectCycles(snapshot);
	return {
		ok: forwardOnlyErrors.length === 0 && cycle === null,
		forward_only_errors: forwardOnlyErrors,
		cycle,
	};
}

