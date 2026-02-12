import { describe, expect, it } from 'vitest';

import { transitionCourseStatus } from '../../src/domain/courseStatus';
import { DomainError } from '../../src/server/errors/errors';

describe('transitionCourseStatus', () => {
  it('SUBMIT: draft -> submitted', () => {
    const update = transitionCourseStatus({
      current: { status: 'draft', publishedAt: null, archivedAt: null, rejectedReason: null },
      action: { type: 'SUBMIT' },
      now: new Date('2025-01-01T00:00:00.000Z'),
    });
    expect(update.status).toBe('submitted');
    expect(update.rejectedReason).toBeNull();
  });

  it('SUBMIT: published is invalid', () => {
    expect(() =>
      transitionCourseStatus({
        current: {
          status: 'published',
          publishedAt: new Date('2025-01-01T00:00:00.000Z'),
          archivedAt: null,
          rejectedReason: null,
        },
        action: { type: 'SUBMIT' },
      }),
    ).toThrow(DomainError);
  });

  it('APPROVE: submitted -> published sets publishedAt', () => {
    const now = new Date('2025-01-02T00:00:00.000Z');
    const update = transitionCourseStatus({
      current: { status: 'submitted', publishedAt: null, archivedAt: null, rejectedReason: null },
      action: { type: 'APPROVE' },
      now,
    });
    expect(update.status).toBe('published');
    expect(update.archivedAt).toBeNull();
    expect(update.rejectedReason).toBeNull();
    expect(update.publishedAt?.toISOString()).toBe(now.toISOString());
  });

  it('REJECT: submitted -> rejected requires reason', () => {
    expect(() =>
      transitionCourseStatus({
        current: { status: 'submitted', publishedAt: null, archivedAt: null, rejectedReason: null },
        action: { type: 'REJECT', reason: '   ' },
      }),
    ).toThrow(DomainError);

    const update = transitionCourseStatus({
      current: { status: 'submitted', publishedAt: null, archivedAt: null, rejectedReason: null },
      action: { type: 'REJECT', reason: '內容不完整' },
    });
    expect(update.status).toBe('rejected');
    expect(update.rejectedReason).toBe('內容不完整');
  });

  it('ARCHIVE: published -> archived sets archivedAt', () => {
    const now = new Date('2025-01-03T00:00:00.000Z');
    const update = transitionCourseStatus({
      current: { status: 'published', publishedAt: now, archivedAt: null, rejectedReason: null },
      action: { type: 'ARCHIVE' },
      now,
    });
    expect(update.status).toBe('archived');
    expect(update.archivedAt?.toISOString()).toBe(now.toISOString());
  });

  it('UNARCHIVE: archived -> published clears archivedAt', () => {
    const publishedAt = new Date('2025-01-01T00:00:00.000Z');
    const now = new Date('2025-01-04T00:00:00.000Z');
    const update = transitionCourseStatus({
      current: { status: 'archived', publishedAt, archivedAt: now, rejectedReason: null },
      action: { type: 'UNARCHIVE' },
      now,
    });
    expect(update.status).toBe('published');
    expect(update.archivedAt).toBeNull();
    expect(update.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
  });
});
