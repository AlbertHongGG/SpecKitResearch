import type { AnswerMap, SubmissionValidationResult } from './types';
import type { PublicSurvey } from '@app/contracts';
import { computeVisibleQuestions } from './compute-visible';

export function validateSubmission(survey: Pick<PublicSurvey, 'questions' | 'rule_groups'>, answers: AnswerMap): SubmissionValidationResult {
  const { visibleQuestionIds } = computeVisibleQuestions(survey, answers);
  const errors: SubmissionValidationResult['errors'] = [];

  for (const [questionId] of Object.entries(answers)) {
    if (!visibleQuestionIds.has(questionId)) {
      errors.push({
        code: 'ANSWER_FOR_HIDDEN_QUESTION',
        message: 'Answer provided for a hidden question',
        question_id: questionId
      });
    }
  }

  for (const q of survey.questions) {
    if (!visibleQuestionIds.has(q.id)) {
      continue;
    }
    if (q.required) {
      const v = answers[q.id];
      const missing = v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
      if (missing) {
        errors.push({
          code: 'REQUIRED_QUESTION_MISSING',
          message: 'Required question is missing an answer',
          question_id: q.id
        });
      }
    }
  }

  return { ok: errors.length === 0, errors, visibleQuestionIds };
}
