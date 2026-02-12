import { describe, expect, test } from "vitest";

import { createTestDb } from "@/tests/helpers/testDb";
import { setLike } from "@/src/usecases/reactions/setLike";
import { setFavorite } from "@/src/usecases/reactions/setFavorite";
import type { Actor } from "@/src/domain/policies/rbac";

describe("Reactions desired-state idempotency", () => {
  test("Like upsert is idempotent (thread)", async () => {
    const db = await createTestDb();
    db.pushSchema();

    try {
      const user = await db.prisma.user.create({
        data: { email: "u@example.com", passwordHash: "x", role: "user", isBanned: false },
        select: { id: true },
      });
      const board = await db.prisma.board.create({
        data: { name: "B", description: "", isActive: true, sortOrder: 0 },
        select: { id: true },
      });
      const thread = await db.prisma.thread.create({
        data: {
          boardId: board.id,
          authorId: user.id,
          title: "T",
          content: "",
          status: "published",
          publishedAt: new Date(),
        },
        select: { id: true },
      });

      const actor: Actor = {
        authenticated: true,
        user: { id: user.id, role: "user" },
        moderatorBoards: [],
      };

      await setLike(db.prisma, actor, {
        targetType: "thread",
        targetId: thread.id,
        desired: true,
      });
      await setLike(db.prisma, actor, {
        targetType: "thread",
        targetId: thread.id,
        desired: true,
      });

      const likeCount = await db.prisma.like.count({
        where: { userId: user.id, targetType: "thread", targetId: thread.id },
      });
      expect(likeCount).toBe(1);

      await setLike(db.prisma, actor, {
        targetType: "thread",
        targetId: thread.id,
        desired: false,
      });
      await setLike(db.prisma, actor, {
        targetType: "thread",
        targetId: thread.id,
        desired: false,
      });

      const likeCountAfter = await db.prisma.like.count({
        where: { userId: user.id, targetType: "thread", targetId: thread.id },
      });
      expect(likeCountAfter).toBe(0);
    } finally {
      await db.cleanup();
    }
  });

  test("Favorite upsert is idempotent (thread)", async () => {
    const db = await createTestDb();
    db.pushSchema();

    try {
      const user = await db.prisma.user.create({
        data: { email: "u2@example.com", passwordHash: "x", role: "user", isBanned: false },
        select: { id: true },
      });
      const board = await db.prisma.board.create({
        data: { name: "B", description: "", isActive: true, sortOrder: 0 },
        select: { id: true },
      });
      const thread = await db.prisma.thread.create({
        data: {
          boardId: board.id,
          authorId: user.id,
          title: "T",
          content: "",
          status: "published",
          publishedAt: new Date(),
        },
        select: { id: true },
      });

      const actor: Actor = {
        authenticated: true,
        user: { id: user.id, role: "user" },
        moderatorBoards: [],
      };

      await setFavorite(db.prisma, actor, { threadId: thread.id, desired: true });
      await setFavorite(db.prisma, actor, { threadId: thread.id, desired: true });

      const favCount = await db.prisma.favorite.count({
        where: { userId: user.id, threadId: thread.id },
      });
      expect(favCount).toBe(1);

      await setFavorite(db.prisma, actor, { threadId: thread.id, desired: false });
      await setFavorite(db.prisma, actor, { threadId: thread.id, desired: false });

      const favCountAfter = await db.prisma.favorite.count({
        where: { userId: user.id, threadId: thread.id },
      });
      expect(favCountAfter).toBe(0);
    } finally {
      await db.cleanup();
    }
  });
});
