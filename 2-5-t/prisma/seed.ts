import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  const adminEmail = normalizeEmail("admin@example.com");
  const userEmail = normalizeEmail("user@example.com");
  const modEmail = normalizeEmail("mod@example.com");

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      role: "admin",
      passwordHash: await hashPassword("password123"),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      role: "user",
      passwordHash: await hashPassword("password123"),
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: modEmail },
    update: {},
    create: {
      email: modEmail,
      role: "user",
      passwordHash: await hashPassword("password123"),
    },
  });

  const board = await prisma.board.upsert({
    where: { id: "seed-board" },
    update: {},
    create: {
      id: "seed-board",
      name: "公告與討論",
      description: "系統內建 seed 看板",
      isActive: true,
      sortOrder: 0,
    },
  });

  await prisma.moderatorAssignment.upsert({
    where: { boardId_userId: { boardId: board.id, userId: moderator.id } },
    update: {},
    create: { boardId: board.id, userId: moderator.id },
  });

  const thread = await prisma.thread.create({
    data: {
      boardId: board.id,
      authorId: user.id,
      title: "歡迎來到多角色論壇",
      content: "這是一個 seed 主題（之後會由 usecases + 狀態機管理）。",
      status: "published",
      publishedAt: new Date(),
    },
  });

  await prisma.post.create({
    data: {
      threadId: thread.id,
      authorId: user.id,
      content: "第一則回覆（seed）。",
      status: "visible",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.completed",
      targetType: "system",
      targetId: "seed",
      metadata: {
        adminEmail,
        userEmail,
        modEmail,
        boardId: board.id,
        threadId: thread.id,
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
