'use client';

import type { Question } from '@acme/contracts';

function isBlank(value: unknown): boolean {
  if (value === null || typeof value === 'undefined') return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function validateVisibleRequired(visibleQuestions: Question[], answersById: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  for (const q of visibleQuestions) {
    if (!q.is_required) continue;
    if (isBlank(answersById[q.id])) {
      errors[q.id] = 'Required';
    }
  }
  return errors;
}
