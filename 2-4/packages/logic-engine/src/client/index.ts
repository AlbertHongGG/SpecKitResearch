import type { SurveySnapshot, VisibilityResult } from '../core/types.js';

export function isQuestionVisible(visibility: VisibilityResult, questionId: string): boolean {
  return visibility.visible_question_ids.includes(questionId);
}

export function visibleQuestionsInOrder(snapshot: SurveySnapshot, visibility: VisibilityResult) {
  const visibleSet = new Set(visibility.visible_question_ids);
  return snapshot.questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((q) => visibleSet.has(q.id));
}
