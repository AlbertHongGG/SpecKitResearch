'use client';

export function buildLoginUrl(returnToPath: string) {
  const u = new URL('/login', window.location.origin);
  u.searchParams.set('return_to', returnToPath);
  return u.pathname + u.search;
}
