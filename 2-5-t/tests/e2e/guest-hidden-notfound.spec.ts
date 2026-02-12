import { test, expect } from "@playwright/test";
import { readSeed } from "./_seed";

test("Hidden thread is NotFound for guest", async ({ page }) => {
  const seed = readSeed();
  await page.goto(`/threads/${seed.threads.hidden.id}`);
  // Next.js notFound typically renders /_not-found route content.
  await expect(page).toHaveURL(/\/threads\//);
  await expect(page.getByText(/not found|找不到|404/i)).toBeVisible();
});
