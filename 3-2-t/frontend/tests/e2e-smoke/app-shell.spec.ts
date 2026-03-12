import { expect, test } from '@playwright/test';

test('homepage shell is reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Jira Lite')).toBeVisible();
});