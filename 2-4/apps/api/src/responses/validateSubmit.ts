import type { SurveySnapshot } from '@acme/logic-engine';
import { canonicalizeAnswers, computeVisibility } from '@acme/logic-engine';

type FieldError = { path: string; message: string };

type Question = SurveySnapshot['questions'][number];

type SubmitAnswerInput = { question_id: string; value: unknown };

function pathForAnswerIndex(index: number, key: 'question_id' | 'value') {
  return `answers[${index}].${key}`;
}

function pathForQuestion(questionId: string) {
  return `answers.${questionId}`;
}

function isBlank(value: unknown): boolean {
  if (value === null || typeof value === 'undefined') return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validateType(question: Question, value: unknown): string | null {
  switch (question.type) {
    case 'SingleChoice':
      return typeof value === 'string' ? null : 'Expected a string';
    case 'MultipleChoice':
      return Array.isArray(value) && value.every((v) => typeof v === 'string') ? null : 'Expected string[]';
    case 'Text':
      return typeof value === 'string' ? null : 'Expected a string';
    case 'Number':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'Expected a finite number';
    case 'Rating':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'Expected a finite number';
    case 'Matrix':
      return value && typeof value === 'object' && !Array.isArray(value) ? null : 'Expected an object';
    default:
      return 'Unsupported question type';
  }
}

export function validateSubmit(
  snapshot: SurveySnapshot,
  answers: SubmitAnswerInput[],
):
  | { ok: true; visibility: { visible_question_ids: string[]; hidden_question_ids: string[] }; canonicalById: Record<string, unknown> }
  | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];

  const questionsById = new Map(snapshot.questions.map((q) => [q.id, q] as const));
  const answersById: Record<string, unknown> = {};

  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!a || typeof a.question_id !== 'string') {
      errors.push({ path: pathForAnswerIndex(i, 'question_id'), message: 'Invalid question_id' });
      continue;
    }

    if (!questionsById.has(a.question_id)) {
      errors.push({ path: pathForAnswerIndex(i, 'question_id'), message: 'Unknown question_id' });
      continue;
    }

    answersById[a.question_id] = a.value;
  }

  const canonicalById = canonicalizeAnswers(snapshot, answersById);
  const visibility = computeVisibility(snapshot, canonicalById);
  const hiddenSet = new Set(visibility.hidden_question_ids);
  const visibleSet = new Set(visibility.visible_question_ids);

  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!a || typeof a.question_id !== 'string') continue;
    if (hiddenSet.has(a.question_id)) {
      errors.push({ path: pathForAnswerIndex(i, 'question_id'), message: 'Answer for hidden question is not allowed' });
    }
  }

  for (const q of snapshot.questions) {
    if (!visibleSet.has(q.id)) continue;

    const v = canonicalById[q.id];
    if (q.is_required && isBlank(v)) {
      errors.push({ path: pathForQuestion(q.id), message: 'Required' });
      continue;
    }

    if (typeof v !== 'undefined') {
      const typeError = validateType(q, v);
      if (typeError) errors.push({ path: pathForQuestion(q.id), message: typeError });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, visibility, canonicalById };
}
