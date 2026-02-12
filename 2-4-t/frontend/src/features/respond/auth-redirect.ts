export function loginUrl(returnTo: string) {
  const u = new URL('/login', typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  u.searchParams.set('return_to', returnTo);
  return u.pathname + u.search;
}
