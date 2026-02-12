import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

test("US4 admin governance: boards + moderator + ban + audit", async ({ page }) => {
  process.env.DATABASE_URL ??= "file:./dev.db";
  const prisma = new PrismaClient();

  const adminEmail = `admin_${uniq("u")}@example.com`;
  const adminPassword = "password-1234";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const modEmail = `mod_${uniq("u")}@example.com`;
  const modPassword = "password-1234";
  const modPasswordHash = await bcrypt.hash(modPassword, 12);

  const targetEmail = `target_${uniq("u")}@example.com`;
  const targetPasswordHash = await bcrypt.hash("password-1234", 12);

  await prisma.user.create({
    data: { email: adminEmail, passwordHash: adminPasswordHash, role: "admin", isBanned: false },
  });

  await prisma.user.create({
    data: { email: modEmail, passwordHash: modPasswordHash, role: "user", isBanned: false },
  });

  await prisma.user.create({
    data: { email: targetEmail, passwordHash: targetPasswordHash, role: "user", isBanned: false },
  });

  await prisma.$disconnect();

  const boardName = `E2E Board ${uniq("b")}`;

  // Admin logs in and manages governance
  await page.goto("/login?returnTo=/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("密碼").fill(adminPassword);
  await page.getByRole("button", { name: "登入" }).click();

  await expect(page.getByText("Admin")).toBeVisible();

  // Create board
  await page.getByLabel("看板名稱").fill(boardName);
  await page.getByLabel("看板描述").fill("E2E admin board");
  await page.getByLabel("看板排序").fill("123");
  await page.getByRole("button", { name: "新增" }).click();

  await expect(page.locator(".rounded.border.p-3").filter({ hasText: boardName })).toBeVisible();

  // Assign moderator
  await page.getByRole("combobox", { name: "看板" }).selectOption({ label: boardName });
  await page.getByLabel("使用者 Email").fill(modEmail);
  await page.getByRole("combobox", { name: "動作" }).selectOption("assign");
  await page.getByRole("button", { name: "送出" }).first().click();
  await expect(page.getByText("已完成").first()).toBeVisible();

  // Deactivate board
  const row = page.locator(".rounded.border.p-3").filter({ hasText: boardName });
  await row.locator('input[type="checkbox"]').setChecked(false);
  await row.getByRole("button", { name: "儲存" }).click();
  await expect(row.getByText("停用")).toBeVisible();

  // Ban then unban user
  await page.getByLabel("停權 Email").fill(targetEmail);
  await page.getByLabel("停權狀態").selectOption("ban");
  await page.getByLabel("停權原因").fill("E2E ban reason");
  await page.getByRole("button", { name: "送出" }).nth(1).click();
  await expect(page.getByText("已完成").nth(1)).toBeVisible();

  await page.getByLabel("停權狀態").selectOption("unban");
  await page.getByRole("button", { name: "送出" }).nth(1).click();
  await expect(page.getByText("已完成").nth(1)).toBeVisible();

  // Audit log shows sensitive actions
  await page.reload();
  await expect(page.getByRole("cell", { name: "board.create" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "moderator.assign" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "user.ban" }).first()).toBeVisible();

  // Logout admin
  await page.getByRole("button", { name: "登出" }).click();

  // Moderator can access /mod and see assigned board
  await page.goto("/login?returnTo=/mod");
  await page.getByLabel("Email").fill(modEmail);
  await page.getByLabel("密碼").fill(modPassword);
  await page.getByRole("button", { name: "登入" }).click();

  await expect(page.getByText("Moderator Panel")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "看板" })).toContainText(boardName);
});
