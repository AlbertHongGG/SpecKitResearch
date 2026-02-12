import type { RuleOperator } from '@app/contracts';
import type { AnswerValue } from './types';

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export function evaluateOperator(operator: RuleOperator, actual: AnswerValue, expected: AnswerValue): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'contains': {
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.includes(expected);
      }
      if (Array.isArray(actual) && isPrimitive(expected)) {
        return actual.includes(expected as any);
      }
      return false;
    }
    default: {
      const exhaustive: never = operator;
      return exhaustive;
    }
  }
}
