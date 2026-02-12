import { expect, type Page } from '@playwright/test';

export async function acceptNextDialog(page: Page) {
  page.once('dialog', async (d) => {
    await d.accept();
  });
}

export async function login(page: Page, params: { email: string; password: string; next?: string }) {
  const next = params.next ?? '/courses';
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator('input[type="email"]').fill(params.email);
  await page.locator('input[type="password"]').fill(params.password);
  await page.getByRole('button', { name: '登入' }).click();
  await page.waitForURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

export async function registerStudent(page: Page, params: { email: string; password: string; next?: string }) {
  const next = params.next ?? '/courses';
  await page.goto(`/register?next=${encodeURIComponent(next)}`);
  await page.locator('input[type="email"]').fill(params.email);
  await page.locator('input[type="password"]').fill(params.password);
  await page.locator('select').selectOption('student');
  await page.getByRole('button', { name: '註冊' }).click();

  await expect(page).toHaveURL(new RegExp('^.*?/login'));
}

export async function ensureOnCourseDetail(page: Page, courseTitle: string) {
  await page.goto('/courses');
  await page.getByRole('heading', { name: '課程' }).waitFor();
  await page.getByText(courseTitle, { exact: true }).click();
  await page.getByRole('heading', { name: courseTitle }).waitFor();
}
