import { test, expect } from "@playwright/test";
import { readSeed } from "./_seed";
import { loginAsSeedUser } from "./_auth";

test("User can like/favorite repeatedly without errors", async ({ page }) => {
  const seed = readSeed();
  if (!seed.credentials) throw new Error("Seed credentials missing");

  await loginAsSeedUser(page);

  await page.goto(`/threads/${seed.threads.published.id}`, { waitUntil: "networkidle" });

  const like = page.getByRole("button", { name: "按讚" });
  await like.click();
  await expect(page.getByRole("button", { name: "取消按讚" })).toBeVisible();
  await page.getByRole("button", { name: "取消按讚" }).click();
  await expect(page.getByRole("button", { name: "按讚" })).toBeVisible();
  await page.getByRole("button", { name: "按讚" }).click();
  await expect(page.getByRole("button", { name: "取消按讚" })).toBeVisible();

  const fav = page.getByRole("button", { name: "收藏" });
  await fav.click();
  await expect(page.getByRole("button", { name: "取消收藏" })).toBeVisible();
  await page.getByRole("button", { name: "取消收藏" }).click();
  await expect(page.getByRole("button", { name: "收藏" })).toBeVisible();
});
