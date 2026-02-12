import { test, expect } from "@playwright/test";

import { readSeed } from "./_seed";
import { loginAsSeedUser, loginAsSeedMod } from "./_auth";

test("Moderation scope is enforced for reports", async ({ page }) => {
  const seed = readSeed();

  await loginAsSeedUser(page);
  await page.goto(`/mod/boards/${seed.board.id}/reports`, { waitUntil: "networkidle" });

  // Regular user should not have moderation scope.
  await expect(page.getByText("Insufficient scope")).toBeVisible();

  // Moderator should be able to load the queue.
  await loginAsSeedMod(page);
  await page.goto(`/mod/boards/${seed.board.id}/reports`, { waitUntil: "networkidle" });

  // The page should render the status tabs.
  await expect(page.getByRole("button", { name: "pending" })).toBeVisible();
});
