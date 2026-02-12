export function clearHiddenAnswers(
  answers: Record<string, unknown>,
  becameHiddenQuestionIds: string[]
): Record<string, unknown> {
  if (becameHiddenQuestionIds.length === 0) return answers;
  const next = { ...answers };
  for (const qid of becameHiddenQuestionIds) {
    delete next[qid];
  }
  return next;
}
