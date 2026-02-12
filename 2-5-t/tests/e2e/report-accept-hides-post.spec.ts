import { test, expect } from "@playwright/test";

import { readSeed } from "./_seed";
import { loginAsSeedMod, loginAsSeedUser } from "./_auth";

test("Accepting a post report hides the post", async ({ page }) => {
  const seed = readSeed();

  await loginAsSeedUser(page);
  await page.goto(`/threads/${seed.threads.published.id}`, { waitUntil: "networkidle" });

  // Report the seed post.
  await page.getByRole("button", { name: "檢舉回覆" }).first().click();
  await page.getByLabel("原因").fill("spam");
  await page.getByRole("button", { name: "送出檢舉" }).click();
  await expect(page.getByText("已送出檢舉")).toBeVisible();

  // Resolve as moderator.
  await loginAsSeedMod(page);
  await page.goto(`/mod`, { waitUntil: "networkidle" });
  await page.getByText("General").click();

  // Wait for report item to appear.
  await expect(page.getByText(`target: post / ${seed.post.id}`)).toBeVisible();

  await page.getByRole("button", { name: "接受" }).first().click();
  await page.getByRole("button", { name: "確認" }).click();
  await expect(page.getByText("已接受檢舉")).toBeVisible();

  // The post should no longer be visible.
  await page.goto(`/threads/${seed.threads.published.id}`, { waitUntil: "networkidle" });
  await expect(page.getByText("First reply")).toHaveCount(0);
  await expect(page.getByText("目前沒有可見回覆。")).toBeVisible();
});
