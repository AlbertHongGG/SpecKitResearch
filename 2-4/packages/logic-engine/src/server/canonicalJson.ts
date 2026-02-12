function assertSerializable(value: unknown) {
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
    throw new Error('Non-canonical number');
  }
  if (typeof value === 'undefined') {
    throw new Error('undefined is not allowed in canonical JSON');
  }
}

export function canonicalStringify(value: unknown): string {
  assertSerializable(value);

  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const v = obj[key];
      if (typeof v === 'undefined') continue;
      parts.push(`${JSON.stringify(key)}:${canonicalStringify(v)}`);
    }
    return `{${parts.join(',')}}`;
  }

  throw new Error('Unsupported type for canonical JSON');
}
