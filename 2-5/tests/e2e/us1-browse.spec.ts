import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

test("US1 public browse: home -> board -> thread", async ({ page }) => {
  process.env.DATABASE_URL ??= "file:./dev.db";
  const prisma = new PrismaClient();

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  expect(admin).toBeTruthy();
  const general = await prisma.board.findUnique({ where: { name: "General" } });
  expect(general).toBeTruthy();

  const title = `E2E 公開瀏覽 ${uniq("t")}`;
  const content = `E2E content ${uniq("c")}`;
  const reply = `E2E reply ${uniq("p")}`;
  const threadId = `e2e_us1_${uniq("id")}`;

  await prisma.thread.create({
    data: {
      id: threadId,
      boardId: general!.id,
      authorId: admin!.id,
      title,
      content,
      status: "published",
      isPinned: false,
      isFeatured: false,
    },
  });
  await prisma.post.create({
    data: {
      threadId,
      authorId: admin!.id,
      content: reply,
      status: "visible",
    },
  });

  await prisma.$disconnect();

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "看板" })).toBeVisible();
  await page.getByRole("link", { name: "General" }).click();

  await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
  await page.getByRole("link", { name: title }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(content)).toBeVisible();
  await expect(page.getByText(reply)).toBeVisible();
});
