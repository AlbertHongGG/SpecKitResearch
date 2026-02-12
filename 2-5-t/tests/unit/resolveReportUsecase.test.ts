import { describe, expect, it } from "vitest";

import { createTestDb } from "@/tests/helpers/testDb";
import { createReport } from "@/src/usecases/reports/createReport";
import { resolveReport } from "@/src/usecases/reports/resolveReport";

function actor(input: { id: string; role?: "user" | "admin"; moderatorBoards?: string[] }) {
  return {
    authenticated: true as const,
    user: { id: input.id, role: input.role ?? "user" },
    moderatorBoards: input.moderatorBoards ?? [],
  };
}

describe("resolveReport usecase", () => {
  it("accept hides post when pending -> accepted", async () => {
    const db = await createTestDb();
    db.pushSchema();

    try {
      const board = await db.prisma.board.create({
        data: { id: "b1", name: "Board", description: null, isActive: true, sortOrder: 0 },
        select: { id: true },
      });

      const reporter = await db.prisma.user.create({
        data: { id: "u1", email: "u1@example.com", passwordHash: "x", role: "user", isBanned: false },
        select: { id: true },
      });

      const mod = await db.prisma.user.create({
        data: { id: "m1", email: "m1@example.com", passwordHash: "x", role: "user", isBanned: false },
        select: { id: true },
      });

      const thread = await db.prisma.thread.create({
        data: {
          id: "t1",
          boardId: board.id,
          authorId: reporter.id,
          title: "t",
          content: "c",
          status: "published",
          publishedAt: new Date(),
        },
        select: { id: true },
      });

      const post = await db.prisma.post.create({
        data: { id: "p1", threadId: thread.id, authorId: reporter.id, content: "p", status: "visible" },
        select: { id: true },
      });

      const created = await createReport(db.prisma, actor({ id: reporter.id }), {
        targetType: "post",
        targetId: post.id,
        reason: "spam",
      });

      const resolved = await resolveReport(
        db.prisma,
        actor({ id: mod.id, moderatorBoards: [board.id] }),
        created.report.id,
        { action: "accept", note: "ok" },
      );

      expect(resolved.report.status).toBe("accepted");

      const updatedPost = await db.prisma.post.findUnique({ where: { id: post.id }, select: { status: true } });
      expect(updatedPost?.status).toBe("hidden");
    } finally {
      await db.cleanup();
    }
  });

  it("reject does not hide post", async () => {
    const db = await createTestDb();
    db.pushSchema();

    try {
      const board = await db.prisma.board.create({
        data: { id: "b1", name: "Board", description: null, isActive: true, sortOrder: 0 },
        select: { id: true },
      });

      const reporter = await db.prisma.user.create({
        data: { id: "u1", email: "u1@example.com", passwordHash: "x", role: "user", isBanned: false },
        select: { id: true },
      });

      const mod = await db.prisma.user.create({
        data: { id: "m1", email: "m1@example.com", passwordHash: "x", role: "user", isBanned: false },
        select: { id: true },
      });

      const thread = await db.prisma.thread.create({
        data: {
          id: "t1",
          boardId: board.id,
          authorId: reporter.id,
          title: "t",
          content: "c",
          status: "published",
          publishedAt: new Date(),
        },
        select: { id: true },
      });

      const post = await db.prisma.post.create({
        data: { id: "p1", threadId: thread.id, authorId: reporter.id, content: "p", status: "visible" },
        select: { id: true },
      });

      const created = await createReport(db.prisma, actor({ id: reporter.id }), {
        targetType: "post",
        targetId: post.id,
        reason: "spam",
      });

      const resolved = await resolveReport(
        db.prisma,
        actor({ id: mod.id, moderatorBoards: [board.id] }),
        created.report.id,
        { action: "reject" },
      );

      expect(resolved.report.status).toBe("rejected");

      const updatedPost = await db.prisma.post.findUnique({ where: { id: post.id }, select: { status: true } });
      expect(updatedPost?.status).toBe("visible");
    } finally {
      await db.cleanup();
    }
  });
});
