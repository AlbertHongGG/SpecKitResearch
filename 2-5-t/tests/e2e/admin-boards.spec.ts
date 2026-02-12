import { test, expect } from "./fixtures";

import { loginAsSeedAdmin } from "./_auth";

test("admin can create and delete a board", async ({ page }) => {
  await loginAsSeedAdmin(page);

  await page.goto("/admin/boards", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Boards" })).toBeVisible();

  const name = `E2E Board ${Date.now()}`;

  const createSection = page.locator("section", { hasText: "新增看板" });
  await createSection.getByLabel("名稱").fill(name);
  await createSection.getByLabel("描述").fill("created by e2e");
  await createSection.getByRole("button", { name: "建立" }).click();

  const nameInput = page.locator(`input[value="${name}"]`);
  await expect(nameInput).toBeVisible();

  const boardCard = page.locator("div.rounded-md.border.bg-white.p-4", { has: nameInput });
  await boardCard.getByRole("button", { name: "刪除" }).click();

  await expect(page.locator(`input[value="${name}"]`)).toHaveCount(0);
});
