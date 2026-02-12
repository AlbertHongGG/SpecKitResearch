export function redirectToLoginPreservingReturnTo() {
  if (typeof window === 'undefined') return;

  const path = window.location.pathname;
  if (path.startsWith('/login')) return;

  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?next=${next}`);
}
