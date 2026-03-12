'use client';

import { apiFetch } from '../api-client';

export class OfflineQueuedError extends Error {
  constructor(message: string = '已離線，操作已排隊') {
    super(message);
    this.name = 'OfflineQueuedError';
  }
}

type QueuedMutation = {
  id: string;
  projectId: string;
  createdAt: string;
  request: {
    path: string;
    method: string;
    json?: unknown;
  };
};

const QUEUE_KEY = 'trello-lite:offlineMutationQueue:v1';

function randomId(prefix: string) {
  try {
    return `${prefix}${crypto.randomUUID()}`;
  } catch {
    return `${prefix}${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  }
}

function loadQueue(): QueuedMutation[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueuedMutation[];
  } catch {
    return [];
  }
}

function saveQueue(next: QueuedMutation[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function enqueueMutation(projectId: string, request: QueuedMutation['request']): string {
  const entry: QueuedMutation = {
    id: randomId('m_'),
    projectId,
    createdAt: new Date().toISOString(),
    request,
  };
  const q = loadQueue();
  q.push(entry);
  saveQueue(q);
  return entry.id;
}

function isLikelyNetworkError(err: unknown) {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const anyErr = err as any;
  return anyErr?.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(anyErr?.message ?? ''));
}

export async function runOrQueue<T>(
  projectId: string,
  request: QueuedMutation['request'],
  runNow: () => Promise<T>
): Promise<T> {
  try {
    return await runNow();
  } catch (err) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline || isLikelyNetworkError(err)) {
      enqueueMutation(projectId, request);
      throw new OfflineQueuedError();
    }
    throw err;
  }
}

export async function flushQueuedMutations(projectId: string, maxToFlush: number = 50): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;

  let q = loadQueue();
  const remaining: QueuedMutation[] = [];
  let flushed = 0;

  for (const entry of q) {
    if (entry.projectId !== projectId) {
      remaining.push(entry);
      continue;
    }
    if (flushed >= maxToFlush) {
      remaining.push(entry);
      continue;
    }

    try {
      await apiFetch(entry.request.path, {
        method: entry.request.method,
        json: entry.request.json,
      });
      flushed += 1;
    } catch (err) {
      // Stop on network errors; keep the entry for later.
      if (isLikelyNetworkError(err)) {
        remaining.push(entry);
        // Keep all remaining project entries in order.
        const idx = q.indexOf(entry);
        for (const later of q.slice(idx + 1)) remaining.push(later);
        saveQueue(remaining);
        return flushed;
      }

      // Non-network error (e.g. 409). Drop it to avoid infinite retry loops.
      flushed += 1;
    }
  }

  saveQueue(remaining);
  return flushed;
}
