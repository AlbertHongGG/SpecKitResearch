import { test, expect } from "@playwright/test";
import { readSeed } from "./_seed";
import { loginAsSeedUser } from "./_auth";

test("Board inactive disables interactions", async ({ page }) => {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");
  if (!seed.threads.inactivePublished) throw new Error("Inactive-board thread missing in seed");

  await loginAsSeedUser(page);

  await page.goto(`/threads/${seed.threads.inactivePublished.id}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Inactive Board Thread" })).toBeVisible();

  await expect(page.getByRole("button", { name: "按讚" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "收藏" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "送出回覆" })).toBeDisabled();
});
