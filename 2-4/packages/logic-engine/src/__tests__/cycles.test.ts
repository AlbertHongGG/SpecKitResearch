import { describe, expect, it } from 'vitest';

import { detectCycles, validateDraftRules } from '..';
import type { SurveySnapshot } from '../core/types';

describe('detectCycles', () => {
  it('returns null when there is no cycle', () => {
    const snapshot: SurveySnapshot = {
      survey: {
        id: 's1',
        slug: 'draft',
        title: 'Draft',
        description: null,
        is_anonymous: true,
        status: 'Draft',
      },
      publish_hash: 'draft',
      questions: [
        { id: 'q1', type: 'SingleChoice', title: 'Q1', is_required: false, order: 1 },
        { id: 'q2', type: 'Text', title: 'Q2', is_required: false, order: 2 },
        { id: 'q3', type: 'Text', title: 'Q3', is_required: false, order: 3 },
      ],
      rule_groups: [
        {
          id: 'rg1',
          target_question_id: 'q2',
          action: 'show',
          group_operator: 'AND',
          rules: [{ id: 'r1', source_question_id: 'q1', operator: 'equals', value: 'x' }],
        },
        {
          id: 'rg2',
          target_question_id: 'q3',
          action: 'show',
          group_operator: 'AND',
          rules: [{ id: 'r2', source_question_id: 'q2', operator: 'equals', value: 'x' }],
        },
      ],
    };

    expect(detectCycles(snapshot)).toBeNull();
    expect(validateDraftRules(snapshot).cycle).toBeNull();
  });

  it('returns a cycle path when there is a cycle', () => {
    const snapshot: SurveySnapshot = {
      survey: {
        id: 's1',
        slug: 'draft',
        title: 'Draft',
        description: null,
        is_anonymous: true,
        status: 'Draft',
      },
      publish_hash: 'draft',
      questions: [
        { id: 'q1', type: 'SingleChoice', title: 'Q1', is_required: false, order: 1 },
        { id: 'q2', type: 'Text', title: 'Q2', is_required: false, order: 2 },
      ],
      rule_groups: [
        {
          id: 'rg1',
          target_question_id: 'q2',
          action: 'show',
          group_operator: 'AND',
          rules: [{ id: 'r1', source_question_id: 'q1', operator: 'equals', value: 'x' }],
        },
        {
          id: 'rg2',
          target_question_id: 'q1',
          action: 'show',
          group_operator: 'AND',
          rules: [{ id: 'r2', source_question_id: 'q2', operator: 'equals', value: 'x' }],
        },
      ],
    };

    const cycle = detectCycles(snapshot);
    expect(cycle).not.toBeNull();
    expect(cycle?.cycle_path_question_ids).toEqual(['q1', 'q2', 'q1']);

    const draft = validateDraftRules(snapshot);
    expect(draft.ok).toBe(false);
    expect(draft.cycle?.cycle_path_question_ids).toEqual(['q1', 'q2', 'q1']);
  });
});
