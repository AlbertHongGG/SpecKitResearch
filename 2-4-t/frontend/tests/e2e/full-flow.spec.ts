import { test, expect } from '@playwright/test';

test('login → create → edit → publish → respond → results/export', async ({ page }) => {
  const slug = `pw-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/surveys$/);

  await page.getByLabel('Slug').fill(slug);
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Edit survey' })).toBeVisible();

  // Add two questions.
  await page.getByRole('button', { name: 'Add question' }).click();
  await page.getByRole('button', { name: 'Add question' }).click();

  // Set first question title.
  await page.getByLabel('Title').nth(1).fill('Q1');
  // Set second question title.
  await page.getByLabel('Title').nth(2).fill('Q2');

  // Add rule group and set value to 'yes'.
  await page.getByRole('button', { name: 'Add rule group' }).click();
  await page.getByLabel('Value').fill('yes');

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();

  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText(/Status: PUBLISHED/)).toBeVisible();

  // Respond as logged-in user (CSRF included) and submit.
  await page.goto(`/s/${slug}`);
  await page.getByPlaceholder('Your answer').fill('yes');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Your answer').fill('hello');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText(/Response ID/)).toBeVisible();

  // Back to results and verify response_count.
  await page.goto('/surveys');
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await page.getByRole('button', { name: 'Results' }).click();
  await expect(page.getByText('Responses: 1')).toBeVisible();

  // Export download (JSON) smoke.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`${slug}.*\.json$`));
});
