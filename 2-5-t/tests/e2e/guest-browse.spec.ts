import { test, expect } from "@playwright/test";
import { readSeed } from "./_seed";

test("Guest can browse boards/threads/posts", async ({ page }) => {
  const seed = readSeed();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "多角色論壇／社群平台" })).toBeVisible({
    timeout: 15_000,
  });
  await page.goto(`/boards/${seed.board.id}`);
  await expect(page.getByRole("heading", { name: "General" })).toBeVisible({ timeout: 15_000 });

  await page.goto(`/threads/${seed.threads.published.id}`);
  await expect(page.getByRole("heading", { name: "Hello FTS" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("First reply")).toBeVisible({ timeout: 15_000 });
});
