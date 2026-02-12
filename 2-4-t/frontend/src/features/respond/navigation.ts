import type { PublicSurvey } from '@app/contracts';

export function orderedVisibleQuestionIds(
  survey: Pick<PublicSurvey, 'questions'>,
  visibleQuestionIds: Set<string>
) {
  return survey.questions.map((q) => q.id).filter((id) => visibleQuestionIds.has(id));
}

export function firstUnansweredQuestionId(ids: string[], answers: Record<string, unknown>) {
  for (const id of ids) {
    if (!(id in answers)) return id;
  }
  return ids[0] ?? null;
}

export function nextQuestionId(ids: string[], currentId: string, answers: Record<string, unknown>) {
  const idx = ids.indexOf(currentId);
  if (idx < 0) return firstUnansweredQuestionId(ids, answers);
  for (let i = idx + 1; i < ids.length; i++) {
    const id = ids[i];
    if (!(id in answers)) return id;
  }
  return null;
}

export function prevAnsweredVisibleQuestionId(ids: string[], currentId: string, answers: Record<string, unknown>) {
  const idx = ids.indexOf(currentId);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    const id = ids[i];
    if (id in answers) return id;
  }
  return null;
}
