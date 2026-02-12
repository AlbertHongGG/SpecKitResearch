import { describe, expect, it } from 'vitest';
import { LoginRequestSchema, SurveyStatusSchema, QuestionTypeSchema } from '../index';

describe('contracts schemas', () => {
  it('validates login request', () => {
    const parsed = LoginRequestSchema.parse({ username: 'u', password: 'p' });
    expect(parsed.username).toBe('u');
  });

  it('enforces enum values', () => {
    expect(SurveyStatusSchema.options).toContain('DRAFT');
    expect(QuestionTypeSchema.options).toContain('SC');
  });
});
