import { describe, expect, it } from 'vitest';

import type { SurveySnapshot } from '../core/types';
import { canonicalizeAnswers, computeVisibleQuestions } from '..';

describe('canonicalizeAnswers + hidden-answer clearing (via visibility)', () => {
  const snapshot: SurveySnapshot = {
    survey: {
      id: 's1',
      slug: 's',
      title: 't',
      description: null,
      is_anonymous: true,
      status: 'Published',
    },
    publish_hash: 'ph',
    questions: [
      { id: 'q1', type: 'MultipleChoice', title: 'Q1', is_required: false, order: 1 },
      { id: 'q2', type: 'Matrix', title: 'Q2', is_required: false, order: 2 },
      { id: 'q3', type: 'SingleChoice', title: 'Q3', is_required: false, order: 3 },
      { id: 'q4', type: 'Text', title: 'Q4', is_required: false, order: 4 },
    ],
    rule_groups: [
      {
        id: 'g1',
        target_question_id: 'q4',
        action: 'show',
        group_operator: 'AND',
        rules: [{ id: 'r1', source_question_id: 'q3', operator: 'equals', value: 'yes' }],
      },
    ],
  };

  it('sorts MultipleChoice answers and coerces items to strings', () => {
    const out = canonicalizeAnswers(snapshot, { q1: ['b', 1, 'a'] });
    expect(out.q1).toEqual(['1', 'a', 'b']);
  });

  it('sorts Matrix keys deterministically', () => {
    const out = canonicalizeAnswers(snapshot, { q2: { b: 2, a: 1 } });
    expect(out.q2).toEqual({ a: 1, b: 2 });
  });

  it('can clear hidden answers based on computed visibility', () => {
    const answers = {
      q3: 'no',
      q4: 'should be cleared',
    };

    const visibility = computeVisibleQuestions(snapshot, answers);
    expect(visibility.hidden_question_ids).toContain('q4');

    const cleared = { ...answers } as Record<string, unknown>;
    for (const qid of visibility.hidden_question_ids) delete cleared[qid];

    expect(cleared.q4).toBeUndefined();
    expect(cleared.q3).toBe('no');
  });
});
