import { test as base } from '@playwright/test';

type SessionFixture = {
  loginAsBuyer: (email: string, password: string) => Promise<void>;
};

export const test = base.extend<SessionFixture>({
  loginAsBuyer: async ({ page }, use) => {
    await use(async (email: string, password: string) => {
      await page.request.post('/auth/login', {
        data: { email, password },
      });
    });
  },
});

export { expect } from '@playwright/test';
