import { pathToRegexp } from 'path-to-regexp';

export type EndpointCandidate = {
  id: string;
  method: string;
  pathPattern: string;
};

const regexpCache = new Map<string, RegExp>();
const MAX_CACHE = 1_000;

function getCompiled(pattern: string) {
  const cached = regexpCache.get(pattern);
  if (cached) return cached;

  const { regexp } = pathToRegexp(pattern, { end: true });
  regexpCache.set(pattern, regexp);

  if (regexpCache.size > MAX_CACHE) {
    // Simple FIFO eviction to cap memory.
    const firstKey = regexpCache.keys().next().value as string | undefined;
    if (firstKey) regexpCache.delete(firstKey);
  }
  return regexp;
}

function scorePattern(pattern: string) {
  const segments = pattern.split('/').filter(Boolean);
  let staticSegments = 0;
  let paramSegments = 0;
  for (const s of segments) {
    if (s.startsWith(':') || s.includes('*')) paramSegments++;
    else staticSegments++;
  }
  return staticSegments * 10 - paramSegments;
}

export function matchEndpoint(
  endpoints: EndpointCandidate[],
  method: string,
  path: string,
): EndpointCandidate | null {
  const methodUpper = method.toUpperCase();
  const candidates = endpoints.filter((e) => e.method === methodUpper);

  let best: EndpointCandidate | null = null;
  let bestScore = -Infinity;
  for (const e of candidates) {
    const regexp = getCompiled(e.pathPattern);
    if (!regexp.test(path)) continue;
    const score = scorePattern(e.pathPattern);
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}
