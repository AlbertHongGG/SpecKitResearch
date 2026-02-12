import { test, expect } from "./fixtures";

import { loginAsSeedAdmin } from "./_auth";

async function registerUser(page: any, email: string, password: string) {
  await page.goto("/register", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "註冊" })).toBeVisible();

  const resPromise = page.waitForResponse((r: any) => r.url().includes("/api/auth/register") && r.request().method() === "POST");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "建立帳號" }).click();

  const res = await resPromise;
  expect(res.ok()).toBeTruthy();
}

test("admin ban user takes effect", async ({ page }) => {
  const email = `ban+${Date.now()}@example.com`;
  const password = "password123";

  await registerUser(page, email, password);

  // switch to admin
  await page.context().clearCookies();
  await loginAsSeedAdmin(page);

  await page.goto("/admin/users", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Users", level: 1 })).toBeVisible();

  await page.getByLabel("Search").fill(email);
  await page.getByRole("button", { name: "查詢" }).click();

  await expect(page.getByText(email)).toBeVisible();

  const userCard = page.locator("div", { has: page.getByText(email) }).first();
  await userCard.getByRole("button", { name: "停權" }).click();
  await expect(page.getByText(`停權：${email}`)).toBeVisible();

  await page.getByLabel("Reason (optional)").fill("e2e ban test");
  await page.getByRole("button", { name: "確認停權" }).click();

  await expect(userCard.getByText("banned")).toBeVisible();

  // banned user cannot login
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "登入" }).click();

  await expect(page.getByText(/banned/i)).toBeVisible();
});
