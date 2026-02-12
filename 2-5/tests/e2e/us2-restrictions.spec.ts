import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

test("US2 restrictions: locked thread and inactive board", async ({ page }) => {
  process.env.DATABASE_URL ??= "file:./dev.db";
  const prisma = new PrismaClient();

  const email = `${uniq("u")}@example.com`;
  const password = "password-1234";

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  expect(admin).toBeTruthy();

  const general = await prisma.board.findUnique({ where: { name: "General" } });
  expect(general).toBeTruthy();

  const lockedThreadId = `e2e_locked_${uniq("t")}`;
  await prisma.thread.create({
    data: {
      id: lockedThreadId,
      boardId: general!.id,
      authorId: admin!.id,
      title: "E2E 鎖定主題",
      content: "這是一篇鎖定主題（E2E）。",
      status: "locked",
      isPinned: false,
      isFeatured: false,
    },
  });

  const inactiveBoardId = `e2e_inactive_board_${uniq("b")}`;
  const inactiveBoard = await prisma.board.create({
    data: {
      id: inactiveBoardId,
      name: `E2E Inactive ${uniq("board")}`,
      description: "inactive",
      isActive: false,
      sortOrder: 999,
    },
  });

  const inactiveThreadId = `e2e_inactive_thread_${uniq("t")}`;
  await prisma.thread.create({
    data: {
      id: inactiveThreadId,
      boardId: inactiveBoard.id,
      authorId: admin!.id,
      title: "E2E 停用看板主題",
      content: "這是一篇位於停用看板的主題（E2E）。",
      status: "published",
      isPinned: false,
      isFeatured: false,
    },
  });

  await prisma.$disconnect();

  // Register (auto login)
  await page.goto("/register?returnTo=/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "註冊" }).click();
  await expect(page.getByRole("link", { name: "發文" })).toBeVisible();

  // Locked thread: reply forbidden
  await page.goto(`/threads/${lockedThreadId}`);
  await expect(page.getByRole("heading", { name: "E2E 鎖定主題" })).toBeVisible();
  await expect(page.getByText("狀態：locked")).toBeVisible();
  await expect(page.getByText("此主題已鎖定，無法回覆")).toBeVisible();
  await expect(page.getByPlaceholder("輸入回覆內容")).toHaveCount(0);

  // Inactive board: interactions forbidden
  await page.goto(`/threads/${inactiveThreadId}`);
  await expect(page.getByRole("heading", { name: "E2E 停用看板主題" })).toBeVisible();
  await expect(page.getByText("看板已停用，無法互動").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "讚" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "收藏" })).toHaveCount(0);
  await expect(page.getByPlaceholder("輸入回覆內容")).toHaveCount(0);
});
