import { test, expect } from "@playwright/test";
import { readSeed } from "./_seed";
import { loginAsSeedUser } from "./_auth";

test("Locked thread disables reply", async ({ page }) => {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");
  if (!seed.threads.locked) throw new Error("Locked thread missing in seed");

  await loginAsSeedUser(page);

  await page.goto(`/threads/${seed.threads.locked.id}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Locked Thread" })).toBeVisible();

  await expect(page.getByText("此主題已鎖定，無法回覆")).toBeVisible();
  await expect(page.getByRole("button", { name: "送出回覆" })).toBeDisabled();
});
