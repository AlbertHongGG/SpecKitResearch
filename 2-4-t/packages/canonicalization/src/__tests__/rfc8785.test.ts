import { describe, expect, it } from 'vitest';
import { canonicalizeJson } from '../canonicalize';

describe('canonicalizeJson (RFC 8785 via canonicalize)', () => {
  it('produces stable ordering', () => {
    const a = canonicalizeJson({ b: 1, a: 2 });
    const b = canonicalizeJson({ a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1}');
  });

  it('canonicalizes nested objects and arrays', () => {
    const out = canonicalizeJson({
      z: [3, 2, 1],
      a: { d: true, c: false },
      b: null
    });
    expect(out).toBe('{"a":{"c":false,"d":true},"b":null,"z":[3,2,1]}');
  });

  it('escapes strings deterministically', () => {
    const out = canonicalizeJson({ s: "a\n\t\\b\"c" });
    expect(out).toBe('{"s":"a\\n\\t\\\\b\\\"c"}');
  });
});
