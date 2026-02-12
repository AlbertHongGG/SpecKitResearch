import { test, expect } from '@playwright/test';

test('US2: create project → invite → accept', async ({ page }) => {
  const now = Date.now();

  const ownerEmail = `e2e-owner-${now}@example.com`;
  const memberEmail = `e2e-member-${now}@example.com`;
  const projectName = `E2E Project ${now}`;

  // Owner registers.
  await page.goto('/register');
  await page.getByLabel('Email').fill(ownerEmail);
  await page.getByLabel('顯示名稱').fill('Owner');
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

  // Open members page.
  await page.getByTestId(`project-open-${projectId}`).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/members$`));

  // Invite member.
  await page.getByLabel('Email').fill(memberEmail);
  await page.getByTestId('invite-submit').click();

  // Logout owner.
  await page.getByRole('button', { name: '登出' }).click();

  // Member registers with invited email.
  await page.goto('/register');
  await page.getByLabel('Email').fill(memberEmail);
  await page.getByLabel('顯示名稱').fill('Member');
  await page.getByLabel('密碼').fill('password123');
  await page.getByRole('button', { name: '註冊' }).click();

  await expect(page).toHaveURL(/\/projects$/);

  // Accept invitation.
  await expect(page.getByTestId('invitation-inbox')).toBeVisible();
  await page.getByTestId('invitation-inbox').getByRole('button', { name: '接受' }).first().click();

  // Project should now appear in list for member.
  await expect(page.getByTestId('project-list')).toContainText(projectName);

  // Member can access members page (read).
  await page.goto(`/projects/${projectId}/members`);
  await expect(page.getByRole('heading', { name: '成員', level: 1 })).toBeVisible();
  await expect(page.getByTestId('membership-list').locator('li')).toHaveCount(2);
});
