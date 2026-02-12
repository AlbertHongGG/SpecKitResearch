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

test("admin assign moderator takes effect", async ({ page }) => {
  const email = `mod+${Date.now()}@example.com`;
  const password = "password123";

  await registerUser(page, email, password);

  // switch to admin
  await page.context().clearCookies();
  await loginAsSeedAdmin(page);

  // create a board
  await page.goto("/admin/boards", { waitUntil: "networkidle" });
  const boardName = `E2E Mod Board ${Date.now()}`;
  const createSection = page.locator("section", { hasText: "新增看板" });
  await createSection.getByLabel("名稱").fill(boardName);
  await createSection.getByRole("button", { name: "建立" }).click();
  await expect(page.locator(`input[value="${boardName}"]`)).toBeVisible();

  // assign moderator
  await page.goto("/admin/moderators", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Moderators" })).toBeVisible();

  await page.getByRole("combobox").selectOption({ label: boardName });
  await page.getByLabel("User email").fill(email);
  await page.getByRole("button", { name: "指派" }).click();

  await expect(page.getByText(email)).toBeVisible();

  // login as the new moderator, verify /mod has the board
  await page.context().clearCookies();

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  const loginResponsePromise = page.waitForResponse(
    (r: any) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "登入" }).click();
  const loginRes = await loginResponsePromise;
  expect(loginRes.ok()).toBeTruthy();

  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some((c: any) => c.name === "session" || c.name === "__Host-session");
    })
    .toBeTruthy();

  await page.goto("/mod", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "治理面板" })).toBeVisible();
  await expect(page.getByText(boardName)).toBeVisible({ timeout: 15000 });
});
