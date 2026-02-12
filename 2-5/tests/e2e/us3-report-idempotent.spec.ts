import { test, expect } from "@playwright/test";

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

test("US3 report: idempotent reporting", async ({ page }) => {
  const email = `${uniq("u")}@example.com`;
  const password = "password-1234";

  // Register (auto login)
  await page.goto("/register?returnTo=/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "註冊" }).click();
  await expect(page.getByRole("link", { name: "發文" })).toBeVisible();

  // Create & publish a thread
  await page.getByRole("link", { name: "發文" }).click();
  await expect(page.getByRole("heading", { name: "發表主題" })).toBeVisible();
  await page.getByLabel("看板").selectOption({ label: "General" });
  await page.getByLabel("標題").fill("US3 檢舉冪等主題");
  await page.getByLabel("內容").fill("這是一篇用於檢舉冪等測試的主題。\n" + uniq("content"));
  await page.getByRole("button", { name: "發布" }).click();

  await expect(page.getByText("狀態：published")).toBeVisible();

  // First report -> created
  await page.getByRole("button", { name: "檢舉" }).click();
  const dialog1 = page.getByRole("dialog", { name: "檢舉" });
  await dialog1.getByRole("button", { name: "送出" }).click();
  await expect(page.getByText("已送出檢舉")).toBeVisible();
  await dialog1.getByRole("button", { name: "關閉" }).click();

  // Second report -> idempotent (created=false)
  await page.getByRole("button", { name: "檢舉" }).click();
  const dialog2 = page.getByRole("dialog", { name: "檢舉" });
  await dialog2.getByRole("button", { name: "送出" }).click();
  await expect(page.getByText("你已檢舉過此內容")).toBeVisible();
});
