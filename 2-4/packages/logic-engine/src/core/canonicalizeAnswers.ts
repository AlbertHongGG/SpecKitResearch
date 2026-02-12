import type { AnswersByQuestionId, SurveySnapshot } from './types.js';

function sortObjectKeys(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = value[key];
  }
  return out;
}

export function canonicalizeAnswers(snapshot: SurveySnapshot, answers: AnswersByQuestionId): AnswersByQuestionId {
  const questionsById = new Map(snapshot.questions.map((q) => [q.id, q] as const));
  const out: AnswersByQuestionId = {};

  for (const [questionId, value] of Object.entries(answers)) {
    const question = questionsById.get(questionId);
    if (!question) continue;

    if (question.type === 'MultipleChoice' && Array.isArray(value)) {
      out[questionId] = value.map(String).sort();
      continue;
    }

    if (question.type === 'Matrix' && value && typeof value === 'object' && !Array.isArray(value)) {
      out[questionId] = sortObjectKeys(value as Record<string, unknown>);
      continue;
    }

    out[questionId] = value;
  }

  return out;
}
