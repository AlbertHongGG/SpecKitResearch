import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { computeVisibleQuestions } from '..';

type Fixture = {
  snapshot: Parameters<typeof computeVisibleQuestions>[0];
  vectors: Array<{
    name: string;
    answers: Parameters<typeof computeVisibleQuestions>[1];
    expected: ReturnType<typeof computeVisibleQuestions>;
  }>;
};

describe('fixtures/us1.json (node)', () => {
  it('matches expected visibility vectors', () => {
    const fixturePath = new URL('../../fixtures/us1.json', import.meta.url);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture;

    for (const vector of fixture.vectors) {
      const result = computeVisibleQuestions(fixture.snapshot, vector.answers);
      expect(result, vector.name).toEqual(vector.expected);
    }
  });
});
