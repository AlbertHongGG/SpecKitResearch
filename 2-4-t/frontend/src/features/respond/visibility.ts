import { computeVisibleQuestions } from '@app/logic-engine';
import type { PublicSurvey } from '@app/contracts';

export function recomputeVisibility(
  survey: Pick<PublicSurvey, 'questions' | 'rule_groups'>,
  answers: Record<string, unknown>,
  previousVisibleQuestionIds?: Set<string>
) {
  return computeVisibleQuestions(survey, answers, previousVisibleQuestionIds);
}
