import { test, expect } from "@playwright/test";

test("US1 search: cannot hit hidden/draft; direct link blocked", async ({ page }) => {
  await page.goto("/search");

  await page.getByPlaceholder("輸入關鍵字").fill("seed");
  await page.getByRole("button", { name: "搜尋" }).click();

  await expect(page.getByRole("link", { name: "歡迎來到論壇" })).toBeVisible();
  await expect(page.getByRole("link", { name: "隱藏主題（不可被公開搜尋）" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "草稿主題（不可被公開搜尋）" })).toHaveCount(0);

  await page.goto("/threads/seed_thread_hidden");
  await expect(page.getByText("Thread not found")).toBeVisible();

  await page.goto("/threads/seed_thread_draft");
  await expect(page.getByText("Thread not found")).toBeVisible();
});
