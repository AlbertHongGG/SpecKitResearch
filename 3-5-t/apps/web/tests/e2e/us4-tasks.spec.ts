import { test, expect } from '@playwright/test';

test('US4: create task → drag → edit → comment', async ({ page }) => {
  const now = Date.now();

  const email = `e2e-us4-${now}@example.com`;
  const projectName = `E2E US4 Project ${now}`;

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('顯示名稱').fill('US4');
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

  await expect(page.locator('section[data-testid^="list-"]', { hasText: 'Todo' })).toBeVisible({ timeout: 15000 });

  await page.getByTestId('create-list-title').fill('Doing');
  await page.getByTestId('create-list-submit').click();

  await expect(page.locator('section[data-testid^="list-"]', { hasText: 'Doing' })).toBeVisible({ timeout: 15000 });

  const todo = page.locator('section[data-testid^="list-"]', { hasText: 'Todo' });
  const doing = page.locator('section[data-testid^="list-"]', { hasText: 'Doing' });

  // Create a task in Todo.
  await todo.getByPlaceholder('新增 task…').fill('Task 1');
  await todo.getByRole('button', { name: '新增' }).click();

  await expect(todo.locator('button', { hasText: 'Task 1' })).toBeVisible();

  // Drag task from Todo to Doing.
  const card = todo.locator('button', { hasText: 'Task 1' }).first();
  const dropzone = doing.locator('[data-testid^="task-dropzone-"]').first();

  const cardBox = await card.boundingBox();
  const dropBox = await dropzone.boundingBox();
  expect(cardBox).toBeTruthy();
  expect(dropBox).toBeTruthy();

  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(dropBox!.x + dropBox!.width / 2, dropBox!.y + 10, { steps: 12 });
  await page.mouse.up();

  await expect(doing.locator('button', { hasText: 'Task 1' })).toBeVisible({ timeout: 15000 });

  // Open side panel.
  await doing.locator('button', { hasText: 'Task 1' }).first().click();
  await expect(page.getByTestId('task-panel-title')).toContainText('Task 1');

  // Edit title and add comment.
  await page.getByTestId('task-title').fill('Task 1 (edited)');
  await page.getByTestId('task-description').fill('Hello from e2e');
  await page.getByTestId('task-save').click();

  await expect(doing).toContainText('Task 1 (edited)', { timeout: 15000 });

  await page.getByTestId('comment-input').fill('First comment');
  await page.getByTestId('comment-submit').click();
  await expect(page.getByTestId('comment-list')).toContainText('First comment');

  await page.getByTestId('task-panel-close').click();
  await expect(page.getByTestId('task-panel-title')).toHaveCount(0);
});
