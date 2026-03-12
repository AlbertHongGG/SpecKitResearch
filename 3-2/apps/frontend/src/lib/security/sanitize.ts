const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BIDI_CONTROL_REGEX = /[\u202A-\u202E\u2066-\u2069]/g;

export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const text = typeof input === 'string' ? input : String(input);

  // React escapes HTML by default, but we still defensively strip control chars
  // that can be used for log/UX confusion (incl. bidi override characters).
  return text.replace(CONTROL_CHARS_REGEX, '').replace(BIDI_CONTROL_REGEX, '');
}
