export type DraftAnswers = Record<string, unknown>;

function key(slug: string, publishHash: string) {
  return `draft_answers:${slug}:${publishHash}`;
}

export function loadDraftAnswers(slug: string, publishHash: string): DraftAnswers {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(key(slug, publishHash));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as DraftAnswers;
    return {};
  } catch {
    return {};
  }
}

export function saveDraftAnswers(slug: string, publishHash: string, answers: DraftAnswers) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key(slug, publishHash), JSON.stringify(answers));
}

export function clearDraftAnswers(slug: string, publishHash: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key(slug, publishHash));
}
