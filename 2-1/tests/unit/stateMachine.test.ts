import { describe, expect, it } from 'vitest';

import { assertCourseTransition } from '@/lib/courses/stateMachine';

describe('course state machine', () => {
  it('allows draft -> submitted', () => {
    expect(assertCourseTransition('draft', 'submitted')).toBe(true);
  });

  it('rejects submitted -> draft', () => {
    expect(assertCourseTransition('submitted', 'draft')).toBe(false);
  });

  it('allows rejected -> draft', () => {
    expect(assertCourseTransition('rejected', 'draft')).toBe(true);
  });
});
