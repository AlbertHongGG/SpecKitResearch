import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { computeVisibleQuestions, validateSurveyDraft, validateSubmission } from '../index';

type Fixture = {
  survey: any;
  cases: Array<{ name: string; answers: Record<string, unknown>; expected_visible: string[] }>;
};

describe('logic-engine fixtures', () => {
  it('passes simple fixture cases', () => {
    const filePath = path.join(__dirname, '..', '..', 'fixtures', 'simple.json');
    const fixture = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Fixture;

    const draft = validateSurveyDraft(fixture.survey);
    expect(draft.ok).toBe(true);

    for (const c of fixture.cases) {
      const visible = computeVisibleQuestions(fixture.survey, c.answers).visibleQuestionIds;
      expect([...visible].sort()).toEqual([...c.expected_visible].sort());

      const submission = validateSubmission(fixture.survey, c.answers);
      expect(submission.ok).toBe(true);
    }
  });
});
