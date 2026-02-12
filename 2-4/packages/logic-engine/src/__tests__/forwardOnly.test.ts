import { describe, expect, it } from 'vitest';

import { validateDraftRules, validateForwardOnly } from '..';
import type { SurveySnapshot } from '../core/types';

describe('validateForwardOnly', () => {
  it('reports an error when a rule points backward or same-order', () => {
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
          target_question_id: 'q1',
          action: 'show',
          group_operator: 'AND',
          rules: [{ id: 'r1', source_question_id: 'q2', operator: 'equals', value: 'x' }],
        },
      ],
    };

    const errors = validateForwardOnly(snapshot);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      source_question_id: 'q2',
      target_question_id: 'q1',
    });

    const draft = validateDraftRules(snapshot);
    expect(draft.ok).toBe(false);
    expect(draft.forward_only_errors).toHaveLength(1);
  });

  it('returns no errors for strictly forward rules', () => {
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
      ],
    };

    expect(validateForwardOnly(snapshot)).toEqual([]);
    expect(validateDraftRules(snapshot).ok).toBe(true);
  });
});
