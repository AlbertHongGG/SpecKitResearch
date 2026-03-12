export function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function safeText(input: unknown, fallback = ''): string {
  if (typeof input === 'string') return escapeHtml(input);
  if (input === null || input === undefined) return fallback;
  try {
    return escapeHtml(String(input));
  } catch {
    return fallback;
  }
}
