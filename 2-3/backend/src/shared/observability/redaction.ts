export function redactValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  // Very conservative: avoid accidentally logging secrets.
  if (value.length > 24) return '[REDACTED]';

  return value;
}

export function redactObject(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes('password') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('cookie') ||
      lowerKey.includes('api_key') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('secret')
    ) {
      result[key] = '[REDACTED]';
      continue;
    }

    result[key] = redactValue(value);
  }

  return result;
}
