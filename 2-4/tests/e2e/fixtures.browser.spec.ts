import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

type FixtureVector = { name: string; answers: unknown; expected: unknown };
type Fixture = { snapshot: unknown; vectors: FixtureVector[] };

test('logic-engine fixtures match in browser (US1)', async ({ page }) => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const htmlPath = path.join(here, 'fixtures.html');

  await page.goto(`file://${htmlPath}`);
  await page.waitForFunction(() => {
    const w = window as unknown as { __computeVisibleQuestions?: unknown };
    return typeof w.__computeVisibleQuestions === 'function';
  });

  const fixturePath = path.join(here, '../../packages/logic-engine/fixtures/us1.json');
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture;

  const results = await page.evaluate((fx: Fixture) => {
    const w = window as unknown as {
      __computeVisibleQuestions?: (snapshot: unknown, answers: unknown) => unknown;
    };
    const fn = w.__computeVisibleQuestions;
    if (typeof fn !== 'function') throw new Error('missing __computeVisibleQuestions');
    return fx.vectors.map((v) => ({ name: v.name, result: fn(fx.snapshot, v.answers) }));
  }, fixture);

  for (const r of results) {
    const expected = fixture.vectors.find((v) => v.name === r.name)?.expected;
    expect(r.result, r.name).toEqual(expected);
  }
});
