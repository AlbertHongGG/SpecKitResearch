import { test, expect } from "@playwright/test";
import { readSeed } from "./_seed";
import { loginAsSeedUser } from "./_auth";

test("User can create thread, publish, and reply", async ({ page }) => {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");

  await loginAsSeedUser(page);

  await page.goto(`/boards/${seed.board.id}`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "新增主題" }).click();
  await page.getByLabel("標題").fill("E2E New Thread");
  await page.getByLabel("內容").fill("Hello from E2E");
  await page.getByRole("button", { name: "發布" }).click();

  await expect(page.getByRole("heading", { name: "E2E New Thread" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Hello from E2E")).toBeVisible();

  await page.getByLabel("回覆內容").fill("My reply");
  await page.getByRole("button", { name: "送出回覆" }).click();

  await expect(page.getByText("My reply")).toBeVisible({ timeout: 15_000 });
});
