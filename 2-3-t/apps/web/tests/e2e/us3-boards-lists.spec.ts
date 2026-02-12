import { test, expect } from '@playwright/test';

test('US3: create board/list → reorder → archive list', async ({ page }) => {
  const now = Date.now();

  const email = `e2e-us3-${now}@example.com`;
  const projectName = `E2E US3 Project ${now}`;

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('顯示名稱').fill('US3');
  await page.getByLabel('密碼').fill('password123');
  await page.getByRole('button', { name: '註冊' }).click();
  await expect(page).toHaveURL(/\/projects$/);

  // Create project.
  await page.getByTestId('toggle-create-project').click();
  await page.getByLabel('Name').fill(projectName);
  await page.getByTestId('create-project-submit').click();

  const projectItem = page.getByTestId('project-list').locator('li', { hasText: projectName });
  await expect(projectItem).toBeVisible();

  const meta = await projectItem.locator('div').nth(0).locator('div').nth(1).textContent();
  const match = meta?.trim().match(/^([0-9a-f-]{36})/i);
  expect(match, `Expected UUID in project meta: ${meta}`).toBeTruthy();
  const projectId = match![1];

  await page.goto(`/projects/${projectId}/board`);
  await expect(page.getByTestId('board-heading')).toBeVisible();

  // Create board.
  await page.getByTestId('create-board-name').fill('Board A');
  await page.getByTestId('create-board-submit').click();
  await expect(page.getByTestId('board-select')).toContainText('Board A');

  // Create two lists.
  await page.getByTestId('create-list-title').fill('Todo');
  await page.getByTestId('create-list-submit').click();
  await expect(page.getByTestId('task-board')).toContainText('Todo');

  await page.getByTestId('create-list-title').fill('Doing');
  await page.getByTestId('create-list-submit').click();
  await expect(page.getByTestId('task-board')).toContainText('Doing', { timeout: 15000 });

  // Reorder lists using the reorder helper (move Todo right).
  const reorder = page.getByTestId('list-reorder');
  await expect(reorder).toBeVisible();
  await reorder.locator('li', { hasText: 'Todo' }).getByRole('button', { name: '→' }).click();

  // Archive a list.
  page.once('dialog', (d) => d.accept());
  await page
    .getByTestId('task-board')
    .locator('section', { hasText: 'Doing' })
    .getByTestId('archive-list')
    .click();

  await expect(page.getByTestId('task-board')).not.toContainText('Doing');

  // Archived list should appear in archived page.
  await page.getByRole('button', { name: '前往封存列表 →' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/archived$`));
  await expect(page.getByTestId('archived-lists')).toContainText('Doing');
});
