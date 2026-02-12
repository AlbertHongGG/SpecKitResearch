import { test, expect } from "@playwright/test";

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

test("US2 thread: register -> login -> create draft -> publish", async ({ page }) => {
  const email = `${uniq("u")}@example.com`;
  const password = "password-1234";

  await page.goto("/");
  await page.getByRole("link", { name: "註冊" }).click();

  await expect(page.getByRole("heading", { name: "註冊" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "註冊" }).click();

  await expect(page.getByRole("button", { name: "登出" })).toBeVisible();
  await page.getByRole("button", { name: "登出" }).click();

  await page.getByRole("link", { name: "登入" }).click();
  await expect(page.getByRole("heading", { name: "登入" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "登入" }).click();

  await expect(page.getByRole("link", { name: "發文" })).toBeVisible();
  await page.getByRole("link", { name: "發文" }).click();

  await expect(page.getByRole("heading", { name: "發表主題" })).toBeVisible();
  await page.getByLabel("看板").selectOption({ label: "General" });
  await page.getByLabel("標題").fill("US2 草稿主題");
  await page.getByLabel("內容").fill("這是一篇草稿內容（E2E）。");
  await page.getByRole("button", { name: "儲存草稿" }).click();

  await expect(page.getByText("狀態：draft")).toBeVisible();
  await expect(page.getByRole("button", { name: "發布" })).toBeVisible();

  await page.getByRole("button", { name: "發布" }).click();
  await expect(page.getByText("狀態：published")).toBeVisible();
  await expect(page.getByRole("button", { name: "發布" })).toHaveCount(0);

  await expect(page.getByText("回覆", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("輸入回覆內容")).toBeVisible();
});
