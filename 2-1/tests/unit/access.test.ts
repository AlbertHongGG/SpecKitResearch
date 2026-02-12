import { describe, expect, it } from 'vitest';

import { canReadContent, shouldHideMarketingAs404 } from '@/lib/access/courseAccess';

describe('course access rules', () => {
  it('marketing is hidden as 404 for non-published to non-author/non-admin', () => {
    expect(
      shouldHideMarketingAs404({
        courseStatus: 'draft',
        isAuthor: false,
        role: null,
      }),
    ).toBe(true);
  });

  it('marketing is visible to author for non-published', () => {
    expect(
      shouldHideMarketingAs404({
        courseStatus: 'submitted',
        isAuthor: true,
        role: 'instructor',
      }),
    ).toBe(false);
  });

  it('content is readable for purchased user', () => {
    expect(
      canReadContent({
        isAuthor: false,
        isPurchased: true,
        role: 'student',
      }),
    ).toBe(true);
  });

  it('content is forbidden when not purchased and not author/admin', () => {
    expect(
      canReadContent({
        isAuthor: false,
        isPurchased: false,
        role: 'student',
      }),
    ).toBe(false);
  });
});
