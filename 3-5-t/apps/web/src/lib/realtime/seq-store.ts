'use client';

const storageKey = (projectId: string) => `trello-lite:lastSeenSeq:${projectId}`;

export function getLastSeenSeq(projectId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : null;
  } catch {
    return null;
  }
}

export function setLastSeenSeq(projectId: string, seq: number) {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(seq) || seq < 0) return;

  try {
    const prev = getLastSeenSeq(projectId);
    if (prev != null && prev >= seq) return;
    window.localStorage.setItem(storageKey(projectId), String(Math.floor(seq)));
  } catch {
    // ignore
  }
}

export function clearLastSeenSeq(projectId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(projectId));
  } catch {
    // ignore
  }
}
