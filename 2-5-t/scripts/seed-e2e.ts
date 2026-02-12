import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const repoRoot = process.cwd();
  const playwrightDir = path.join(repoRoot, ".playwright");
  const seedFile = path.join(playwrightDir, "seed.json");

  await fs.mkdir(playwrightDir, { recursive: true });

  const prisma = new PrismaClient();

  // Idempotent-ish: clear tables in dependency order.
  await prisma.like.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.report.deleteMany();
  await prisma.post.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.moderatorAssignment.deleteMany();
  await prisma.board.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const password = "P@ssw0rd1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: { email: "admin@example.com", passwordHash, role: "admin", isBanned: false },
    select: { id: true, email: true },
  });

  const mod = await prisma.user.create({
    data: { email: "mod@example.com", passwordHash, role: "user", isBanned: false },
    select: { id: true, email: true },
  });

  const user = await prisma.user.create({
    data: { email: "user@example.com", passwordHash, role: "user", isBanned: false },
    select: { id: true, email: true },
  });

  const board = await prisma.board.create({
    data: { name: "General", description: "E2E board", isActive: true, sortOrder: 0 },
    select: { id: true },
  });

  const inactiveBoard = await prisma.board.create({
    data: { name: "Inactive", description: "Inactive board", isActive: false, sortOrder: 1 },
    select: { id: true },
  });

  await prisma.moderatorAssignment.create({
    data: { boardId: board.id, userId: mod.id },
    select: { id: true },
  });

  const published = await prisma.thread.create({
    data: {
      boardId: board.id,
      authorId: user.id,
      title: "Hello FTS",
      content: "This thread should be searchable",
      status: "published",
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  const hidden = await prisma.thread.create({
    data: {
      boardId: board.id,
      authorId: user.id,
      title: "Hidden FTS",
      content: "This must not leak in search",
      status: "hidden",
    },
    select: { id: true },
  });

  const locked = await prisma.thread.create({
    data: {
      boardId: board.id,
      authorId: user.id,
      title: "Locked Thread",
      content: "Locked",
      status: "locked",
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  const inactivePublished = await prisma.thread.create({
    data: {
      boardId: inactiveBoard.id,
      authorId: user.id,
      title: "Inactive Board Thread",
      content: "Read-only because board inactive",
      status: "published",
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  const post = await prisma.post.create({
    data: {
      threadId: published.id,
      authorId: user.id,
      content: "First reply",
      status: "visible",
    },
    select: { id: true },
  });

  await prisma.$disconnect();

  const seed = {
    credentials: {
      password,
      adminEmail: admin.email,
      modEmail: mod.email,
      userEmail: user.email,
    },
    admin,
    mod,
    user,
    board,
    inactiveBoard,
    threads: { published, hidden, locked, inactivePublished },
    post,
  };

  await fs.writeFile(seedFile, JSON.stringify(seed, null, 2), "utf8");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
