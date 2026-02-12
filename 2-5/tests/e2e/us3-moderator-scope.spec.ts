import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

test("US3 moderator scope: A allowed, B forbidden", async ({ page }) => {
  process.env.DATABASE_URL ??= "file:./dev.db";
  const prisma = new PrismaClient();

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  expect(admin).toBeTruthy();

  const boardA = await prisma.board.findUnique({ where: { name: "General" } });
  const boardB = await prisma.board.findUnique({ where: { name: "Announcements" } });
  expect(boardA).toBeTruthy();
  expect(boardB).toBeTruthy();

  const modEmail = `mod_${uniq("u")}@example.com`;
  const modPassword = "password-1234";
  const modPasswordHash = await bcrypt.hash(modPassword, 12);

  const mod = await prisma.user.create({
    data: {
      email: modEmail,
      passwordHash: modPasswordHash,
      role: "moderator",
      isBanned: false,
    },
  });

  await prisma.moderatorAssignment.create({
    data: { boardId: boardA!.id, userId: mod.id },
  });

  const threadATitle = `US3 Board A thread ${uniq("title")}`;
  const threadAId = `e2e_us3_a_${uniq("t")}`;
  await prisma.thread.create({
    data: {
      id: threadAId,
      boardId: boardA!.id,
      authorId: admin!.id,
      title: threadATitle,
      content: "Board A content",
      status: "published",
      isPinned: false,
      isFeatured: false,
    },
  });

  const threadBTitle = `US3 Board B thread ${uniq("title")}`;
  const threadBId = `e2e_us3_b_${uniq("t")}`;
  await prisma.thread.create({
    data: {
      id: threadBId,
      boardId: boardB!.id,
      authorId: admin!.id,
      title: threadBTitle,
      content: "Board B content",
      status: "published",
      isPinned: false,
      isFeatured: false,
    },
  });

  await prisma.$disconnect();

  // Reporter registers & reports both threads
  const reporterEmail = `${uniq("r")}@example.com`;
  const reporterPassword = "password-1234";

  await page.goto("/register?returnTo=/");
  await page.getByLabel("Email").fill(reporterEmail);
  await page.getByLabel("密碼").fill(reporterPassword);
  await page.getByRole("button", { name: "註冊" }).click();
  await expect(page.getByRole("button", { name: "登出" })).toBeVisible();

  async function reportThread(threadId: string) {
    await page.goto(`/threads/${threadId}`);
    await expect(page.getByRole("button", { name: "檢舉" })).toBeVisible();
    await page.getByRole("button", { name: "檢舉" }).click();

    const dialog = page.getByRole("dialog", { name: "檢舉" });

    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/reports") && r.request().method() === "POST"),
      dialog.getByRole("button", { name: "送出" }).click(),
    ]);

    const json = (await resp.json()) as any;
    await expect(page.getByText("已送出檢舉")).toBeVisible();
    await dialog.getByRole("button", { name: "關閉" }).click();

    return String(json?.report?.id ?? "");
  }

  const reportAId = await reportThread(threadAId);
  const reportBId = await reportThread(threadBId);
  expect(reportAId).toBeTruthy();
  expect(reportBId).toBeTruthy();

  // Logout reporter
  await page.getByRole("button", { name: "登出" }).click();

  // Moderator (assigned to board A only) logs in
  await page.goto("/login?returnTo=/mod");
  await page.getByLabel("Email").fill(modEmail);
  await page.getByLabel("密碼").fill(modPassword);
  await page.getByRole("button", { name: "登入" }).click();

  await expect(page.getByText("Moderator Panel")).toBeVisible();
  await expect(page.getByRole("link", { name: threadATitle })).toBeVisible();

  // Resolve report on board A via UI
  const cardA = page
    .locator(".rounded-lg.border.bg-white.p-4")
    .filter({ has: page.getByRole("link", { name: threadATitle }) });
  await cardA.getByRole("button", { name: "接受（並隱藏）" }).click();
  await page.getByRole("combobox", { name: "檢舉狀態" }).selectOption("accepted");
  const acceptedCardA = page
    .locator(".rounded-lg.border.bg-white.p-4")
    .filter({ has: page.getByRole("link", { name: threadATitle }) });
  await expect(acceptedCardA.getByRole("link", { name: threadATitle })).toBeVisible();
  await expect(acceptedCardA.getByText("已處理：accepted")).toBeVisible();

  // Attempt to resolve board B report should be forbidden (server-side)
  const status = await page.evaluate(async ({ reportId }) => {
    const t = await fetch("/api/csrf", { credentials: "include" });
    const { token } = (await t.json()) as any;

    const r = await fetch(`/api/reports/${reportId}/resolve`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": token,
      },
      body: JSON.stringify({ outcome: "accepted" }),
    });

    return r.status;
  }, { reportId: reportBId });

  expect(status).toBe(403);
});
