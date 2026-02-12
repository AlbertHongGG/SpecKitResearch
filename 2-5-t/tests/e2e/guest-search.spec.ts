import { test, expect } from "@playwright/test";
import { readSeed } from "./_seed";

test("Search only returns publicly visible threads", async ({ page }) => {
  const seed = readSeed();
  await page.goto("/search", { waitUntil: "domcontentloaded" });

  const input = page.getByPlaceholder("輸入關鍵字");
  const submit = page.getByRole("button", { name: "搜尋" });
  const preSearchHint = page.getByText("請輸入關鍵字開始搜尋。", { exact: true });

  // Next.js dev mode can occasionally hydrate after we interact, resetting controlled inputs.
  // Retry a couple of times until the page leaves the pre-search state.
  for (let attempt = 0; attempt < 3; attempt++) {
    await input.fill("FTS");
    await expect(input).toHaveValue("FTS");
    await submit.click();

    try {
      await expect(preSearchHint).toHaveCount(0, { timeout: 2_000 });
      break;
    } catch {
      await page.waitForTimeout(250);
    }
  }

  await expect(page.getByRole("link", { name: "Hello FTS" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Hidden FTS")).toHaveCount(0);

  await page.getByRole("link", { name: "Hello FTS" }).click();
  await expect(page.getByRole("heading", { name: "Hello FTS" })).toBeVisible({ timeout: 15_000 });

  // sanity: board browse still works
  await page.goto(`/boards/${seed.board.id}`);
  await expect(page.getByRole("heading", { name: "General" })).toBeVisible({ timeout: 15_000 });
});
