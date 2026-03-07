import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "password1234";
  const userEmail = (process.env.SEED_USER_EMAIL ?? "user@example.com").trim().toLowerCase();
  const userPassword = process.env.SEED_USER_PASSWORD ?? "password1234";
  const modEmail = (process.env.SEED_MOD_EMAIL ?? "mod@example.com").trim().toLowerCase();
  const modPassword = process.env.SEED_MOD_PASSWORD ?? "password1234";

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const userPasswordHash = await bcrypt.hash(userPassword, 12);
  const modPasswordHash = await bcrypt.hash(modPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "admin",
      passwordHash,
    },
    create: {
      email: adminEmail,
      role: "admin",
      passwordHash,
      isBanned: false,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      role: "user",
      passwordHash: userPasswordHash,
      isBanned: false,
    },
    create: {
      email: userEmail,
      role: "user",
      passwordHash: userPasswordHash,
      isBanned: false,
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: modEmail },
    update: {
      role: "user",
      passwordHash: modPasswordHash,
      isBanned: false,
    },
    create: {
      email: modEmail,
      role: "user",
      passwordHash: modPasswordHash,
      isBanned: false,
    },
  });

  const boards = [
    { name: "General", description: "General discussion", sortOrder: 1, isActive: true },
    { name: "Announcements", description: "Official updates", sortOrder: 0, isActive: true },
  ];

  for (const b of boards) {
    await prisma.board.upsert({
      where: { name: b.name },
      update: {
        description: b.description,
        sortOrder: b.sortOrder,
        isActive: b.isActive,
      },
      create: {
        name: b.name,
        description: b.description,
        sortOrder: b.sortOrder,
        isActive: b.isActive,
      },
    });
  }

  const general = await prisma.board.findUnique({ where: { name: "General" } });
  if (!general) return;

  await prisma.moderatorAssignment.upsert({
    where: {
      boardId_userId: {
        boardId: general.id,
        userId: moderator.id,
      },
    },
    update: {},
    create: {
      boardId: general.id,
      userId: moderator.id,
    },
  });

  // Seed a few threads for US1 browse/search tests.
  const base = {
    boardId: general.id,
    authorId: admin.id,
    isPinned: false,
    isFeatured: false,
  };

  const published = await prisma.thread.upsert({
    where: { id: "seed_thread_published" },
    update: {
      title: "歡迎來到論壇",
      content: "這是一篇公開可見的主題（seed）。",
      status: "published",
      boardId: general.id,
      authorId: admin.id,
    },
    create: {
      id: "seed_thread_published",
      title: "歡迎來到論壇",
      content: "這是一篇公開可見的主題（seed）。",
      status: "published",
      ...base,
    },
  });

  await prisma.post.upsert({
    where: { id: "seed_post_1" },
    update: {
      threadId: published.id,
      authorId: admin.id,
      content: "這是一則回覆（seed）。",
      status: "visible",
    },
    create: {
      id: "seed_post_1",
      threadId: published.id,
      authorId: admin.id,
      content: "這是一則回覆（seed）。",
      status: "visible",
    },
  });

  await prisma.like.upsert({
    where: {
      userId_targetType_targetId: {
        userId: user.id,
        targetType: "thread",
        targetId: published.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      targetType: "thread",
      targetId: published.id,
    },
  });

  await prisma.favorite.upsert({
    where: {
      userId_threadId: {
        userId: user.id,
        threadId: published.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      threadId: published.id,
    },
  });

  await prisma.thread.upsert({
    where: { id: "seed_thread_hidden" },
    update: {
      title: "隱藏主題（不可被公開搜尋）",
      content: "hidden seed",
      status: "hidden",
      boardId: general.id,
      authorId: admin.id,
    },
    create: {
      id: "seed_thread_hidden",
      title: "隱藏主題（不可被公開搜尋）",
      content: "hidden seed",
      status: "hidden",
      ...base,
    },
  });

  await prisma.thread.upsert({
    where: { id: "seed_thread_draft" },
    update: {
      title: "草稿主題（不可被公開搜尋）",
      content: "draft seed",
      status: "draft",
      boardId: general.id,
      authorId: admin.id,
    },
    create: {
      id: "seed_thread_draft",
      title: "草稿主題（不可被公開搜尋）",
      content: "draft seed",
      status: "draft",
      ...base,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
