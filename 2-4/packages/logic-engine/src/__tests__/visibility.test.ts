import { describe, expect, it } from 'vitest';

import type { SurveySnapshot } from '../core/types';
import type { RuleGroup } from '../core/types';
import { computeVisibility, evaluateRuleGroup } from '..';

describe('visibility merge semantics + operators', () => {
  const baseSnapshot: SurveySnapshot = {
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
      { id: 'q1', type: 'Text', title: 'Q1', is_required: true, order: 1 },
      { id: 'q2', type: 'Text', title: 'Q2', is_required: false, order: 2 },
    ],
    rule_groups: [],
  };

  it('defaults to all visible when no rule groups', () => {
    const r = computeVisibility(baseSnapshot, { q1: 'x' });
    expect(r.visible_question_ids).toEqual(['q1', 'q2']);
    expect(r.hidden_question_ids).toEqual([]);
  });

  it('hide has priority over show when both are true', () => {
    const snapshot: SurveySnapshot = {
      ...baseSnapshot,
      rule_groups: [
        {
          id: 'g-hide',
          target_question_id: 'q2',
          action: 'hide',
          group_operator: 'AND',
          rules: [{ id: 'r1', source_question_id: 'q1', operator: 'equals', value: 'yes' }],
        },
        {
          id: 'g-show',
          target_question_id: 'q2',
          action: 'show',
          group_operator: 'AND',
          rules: [{ id: 'r2', source_question_id: 'q1', operator: 'equals', value: 'yes' }],
        },
      ],
    };

    const r = computeVisibility(snapshot, { q1: 'yes' });
    expect(r.visible_question_ids).toEqual(['q1']);
    expect(r.hidden_question_ids).toEqual(['q2']);
  });

  it('if any show groups exist, target is hidden unless at least one show is true', () => {
    const snapshot: SurveySnapshot = {
      ...baseSnapshot,
      rule_groups: [
        {
          id: 'g-show',
          target_question_id: 'q2',
          action: 'show',
          group_operator: 'AND',
          rules: [{ id: 'r2', source_question_id: 'q1', operator: 'equals', value: 'yes' }],
        },
      ],
    };

    const r = computeVisibility(snapshot, { q1: 'no' });
    expect(r.visible_question_ids).toEqual(['q1']);
    expect(r.hidden_question_ids).toEqual(['q2']);
  });

  it('supports equals / not_equals / contains for strings', () => {
    const group: RuleGroup = {
      id: 'g',
      target_question_id: 'q2',
      action: 'show',
      group_operator: 'AND',
      rules: [
        { id: 'r1', source_question_id: 'q1', operator: 'equals', value: 'abc' },
        { id: 'r2', source_question_id: 'q1', operator: 'not_equals', value: 'zzz' },
        { id: 'r3', source_question_id: 'q1', operator: 'contains', value: 'b' },
      ],
    };

    expect(evaluateRuleGroup(group, { q1: 'abc' })).toBe(true);
    expect(evaluateRuleGroup(group, { q1: 'ab' })).toBe(false);
  });

  it('supports contains for arrays (e.g., multi-choice answers)', () => {
    const group: RuleGroup = {
      id: 'g',
      target_question_id: 'q2',
      action: 'show',
      group_operator: 'AND',
      rules: [{ id: 'r1', source_question_id: 'q1', operator: 'contains', value: 'x' }],
    };

    expect(evaluateRuleGroup(group, { q1: ['x', 'y'] })).toBe(true);
    expect(evaluateRuleGroup(group, { q1: ['y'] })).toBe(false);
  });
});
