import { describe, expect, it } from 'vitest';
import { HttpError } from '../../http/errors';
import { assertValidTaskTransition, isValidTaskTransition, type TaskStatus } from './task-state';

describe('task state machine', () => {
  it('allows all valid transitions from spec (FR-033)', () => {
    const cases: Array<[TaskStatus, TaskStatus]> = [
      ['open', 'in_progress'],
      ['open', 'blocked'],
      ['open', 'done'],
      ['open', 'archived'],
      ['in_progress', 'blocked'],
      ['in_progress', 'done'],
      ['in_progress', 'archived'],
      ['blocked', 'in_progress'],
      ['blocked', 'done'],
      ['blocked', 'archived'],
      ['done', 'archived'],
    ];

    for (const [from, to] of cases) {
      expect(isValidTaskTransition(from, to)).toBe(true);
      expect(() => assertValidTaskTransition(from, to)).not.toThrow();
    }
  });

  it('treats no-op transitions as valid', () => {
    const statuses: TaskStatus[] = ['open', 'in_progress', 'blocked', 'done', 'archived'];
    for (const s of statuses) {
      expect(isValidTaskTransition(s, s)).toBe(true);
      expect(() => assertValidTaskTransition(s, s)).not.toThrow();
    }
  });

  it('rejects invalid transitions (FR-034/035)', () => {
    const invalid: Array<[TaskStatus, TaskStatus]> = [
      ['done', 'open'],
      ['done', 'in_progress'],
      ['done', 'blocked'],
      ['archived', 'open'],
      ['archived', 'in_progress'],
      ['archived', 'blocked'],
      ['archived', 'done'],
    ];

    for (const [from, to] of invalid) {
      expect(() => assertValidTaskTransition(from, to)).toThrowError(HttpError);
      try {
        assertValidTaskTransition(from, to);
      } catch (e: any) {
        expect(e.statusCode).toBe(422);
        expect(e.code).toBe('INVALID_TRANSITION');
        expect(e.details).toEqual({ from, to });
      }
    }
  });
});
