import { test, expect } from '@playwright/test';

test('US5: multi-tab realtime sync (task created)', async ({ page, context }) => {
  const now = Date.now();

  const email = `e2e-us5-${now}@example.com`;
  const projectName = `E2E US5 Project ${now}`;

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('顯示名稱').fill('US5');
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

  // Create board + list.
  await page.getByTestId('create-board-name').fill('Board A');
  await page.getByTestId('create-board-submit').click();
  await expect(page.getByTestId('board-select')).toContainText('Board A');

  await page.getByTestId('create-list-title').fill('Todo');
  await page.getByTestId('create-list-submit').click();
  await expect(page.locator('section[data-testid^="list-"]', { hasText: 'Todo' })).toBeVisible({ timeout: 15000 });

  // Open a second tab to the same board (shares cookies via context).
  const page2 = await context.newPage();
  await page2.goto(`/projects/${projectId}/board`);
  await expect(page2.getByTestId('board-heading')).toBeVisible();

  const todo1 = page.locator('section[data-testid^="list-"]', { hasText: 'Todo' });
  const todo2 = page2.locator('section[data-testid^="list-"]', { hasText: 'Todo' });

  await expect(todo2).toBeVisible({ timeout: 15000 });

  // Create a task in tab 1 and expect it appears in tab 2 via WS.
  const title = `RT Task ${now}`;
  await todo1.getByPlaceholder('新增 task…').fill(title);
  await todo1.getByRole('button', { name: '新增' }).click();

  await expect(todo1.locator('button', { hasText: title })).toBeVisible({ timeout: 15000 });
  await expect(todo2.locator('button', { hasText: title })).toBeVisible({ timeout: 3000 });
});
