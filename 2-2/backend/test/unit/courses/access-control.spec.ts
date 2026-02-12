import { describe, it, expect } from 'vitest';
import { ensureCourseVisible, ensureContentAccess } from '../../../src/modules/courses/access-control.js';

const course = { id: 'c1', instructorId: 'i1', status: 'draft' } as any;

describe('access-control', () => {
  it('allows owner to see draft course', () => {
    expect(() => ensureCourseVisible(course, 'i1', 'instructor')).not.toThrow();
  });

  it('hides draft course from others', () => {
    expect(() => ensureCourseVisible(course, 's1', 'student')).toThrow();
  });

  it('allows purchased or admin to access content', () => {
    expect(() => ensureContentAccess(course as any, 's1', 'student', true)).not.toThrow();
    expect(() => ensureContentAccess(course as any, 'a1', 'admin', false)).not.toThrow();
  });
});
