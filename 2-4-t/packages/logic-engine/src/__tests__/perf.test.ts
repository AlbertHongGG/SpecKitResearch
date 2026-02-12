import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import type { Question, RuleGroup } from '@app/contracts';
import { computeVisibleQuestions } from '../compute-visible';

describe('perf smoke', () => {
  it('recomputes visibility under 200ms (smoke)', () => {
    const questionCount = 120;

    const questions: Question[] = Array.from({ length: questionCount }).map((_, i) => ({
      id: `q${i + 1}`,
      title: `Q${i + 1}`,
      type: 'TEXT',
      required: false
    }));

    // A simple chain: q1 -> q2 -> ... -> qN (show rules).
    const rule_groups: RuleGroup[] = Array.from({ length: questionCount - 1 }).map((_, i) => ({
      id: `rg${i + 1}`,
      target_question_id: `q${i + 2}`,
      action: 'show',
      mode: 'AND',
      rules: [
        {
          id: `r${i + 1}`,
          source_question_id: `q${i + 1}`,
          operator: 'equals',
          value: 'yes'
        }
      ]
    }));

    const answers: Record<string, unknown> = { q1: 'yes' };

    // Warmup
    computeVisibleQuestions({ questions, rule_groups }, answers);

    const start = performance.now();
    const res = computeVisibleQuestions({ questions, rule_groups }, answers);
    const ms = performance.now() - start;

    expect(res.visibleQuestionIds.size).toBeGreaterThan(0);
    expect(ms).toBeLessThan(200);
  });
});
