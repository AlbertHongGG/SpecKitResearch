import { test, expect } from '@playwright/test';

import { ensureOnCourseDetail, registerStudent, login } from './helpers';

test('US1：browse → login/register → purchase → read → progress', async ({ page }) => {
  const courseTitle = 'Welcome Course';

  await ensureOnCourseDetail(page, courseTitle);

  await page.getByRole('button', { name: '購買' }).click();
  await expect(page).toHaveURL(/\/login\?next=/);

  const loginUrl = new URL(page.url());
  const next = loginUrl.searchParams.get('next') ?? `/courses/seed_course_1`;

  const email = `student+${Date.now()}@example.com`;
  const password = 'password1234';

  await registerStudent(page, { email, password, next });
  await login(page, { email, password, next });

  await page.getByRole('button', { name: '購買' }).click();
  await expect(page.getByRole('button', { name: '已購買' })).toBeDisabled();

  await page.goto('/my-courses');
  await page.getByRole('heading', { name: '我的課程' }).waitFor();
  await page.getByText(courseTitle, { exact: true }).click();

  await page.getByRole('button', { name: '標記完成' }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: '取消完成' })).toBeEnabled();
});
