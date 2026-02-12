import { test, expect } from '@playwright/test';
import { login, seedUsers } from './helpers';

test('US5: admin can review a submitted course and reject with reason', async ({ browser }) => {
  // Create a new submitted course as instructor first.
  const instructorContext = await browser.newContext();
  const instructorPage = await instructorContext.newPage();

  await login(instructorPage, { ...seedUsers.instructor, redirectTo: '/instructor/courses' });
  await expect(instructorPage.getByRole('heading', { name: '我的課程（教師）' })).toBeVisible();

  const title = `E2E 審核課程 ${Date.now()}`;
  await instructorPage.getByLabel('標題').fill(title);
  await instructorPage.getByLabel('簡介').fill('待審核課程');
  await instructorPage.getByLabel('價格').fill('0');
  await instructorPage.getByRole('button', { name: '建立' }).click();

  await expect(instructorPage.getByRole('heading', { name: '編輯課程' })).toBeVisible();
  await instructorPage.getByRole('button', { name: '提交審核' }).click();
  await expect(instructorPage.getByText('狀態：submitted')).toBeVisible();

  const courseIdMatch = instructorPage.url().match(/\/instructor\/courses\/([^/?#]+)/);
  if (!courseIdMatch) throw new Error(`cannot extract courseId from url: ${instructorPage.url()}`);
  const courseId = courseIdMatch[1]!;

  await instructorContext.close();

  // Review as admin.
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await login(adminPage, { ...seedUsers.admin, redirectTo: '/admin/reviews' });
  await expect(adminPage.getByRole('heading', { name: '審核佇列' })).toBeVisible();

  await expect(adminPage.getByText(title)).toBeVisible();
  await adminPage.locator(`a[href="/admin/reviews/${courseId}"]`).click();

  await expect(adminPage).toHaveURL(new RegExp(`/admin/reviews/${courseId}(\\?|$)`));

  await adminPage.getByRole('button', { name: '駁回' }).click();
  await adminPage.getByLabel('駁回理由（必填）').fill('內容需補齊');
  await adminPage.getByRole('button', { name: '送出決策' }).click();

  await expect(adminPage).toHaveURL(/\/admin\/reviews/);

  await adminContext.close();
});
