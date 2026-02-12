import { describe, expect, test } from "vitest";

import { createTestDb } from "@/tests/helpers/testDb";
import { hashPassword } from "@/src/infra/auth/password";
import { login } from "@/src/usecases/auth/login";
import { createSession, SESSION_COOKIE_NAME } from "@/src/infra/auth/sessionRepo";
import { getAuthContext } from "@/src/infra/auth/getAuthContext";
import { banUser } from "@/src/usecases/admin/users/banUser";
import type { Actor } from "@/src/domain/policies/rbac";

describe("Banned user auth", () => {
  test("banned user cannot login", async () => {
    const db = await createTestDb();
    db.pushSchema();

    try {
      const passwordHash = await hashPassword("password123");
      await db.prisma.user.create({
        data: { email: "banned@example.com", passwordHash, role: "user", isBanned: true },
      });

      await expect(
        login(db.prisma, { email: "banned@example.com", password: "password123" }),
      ).rejects.toMatchObject({ code: "Forbidden" });
    } finally {
      await db.cleanup();
    }
  });

  test("ban revokes sessions (cannot operate)", async () => {
    const db = await createTestDb();
    db.pushSchema();

    try {
      const passwordHash = await hashPassword("password123");
      const user = await db.prisma.user.create({
        data: { email: "u@example.com", passwordHash, role: "user", isBanned: false },
        select: { id: true },
      });

      const admin = await db.prisma.user.create({
        data: { email: "a@example.com", passwordHash: "x", role: "admin", isBanned: false },
        select: { id: true },
      });

      const session = await createSession(db.prisma, { userId: user.id });

      const reqBefore = {
        cookies: {
          get: (name: string) => (name === SESSION_COOKIE_NAME ? { value: session.id } : undefined),
        },
      } as any;

      const before = await getAuthContext(reqBefore, db.prisma);
      expect(before.authenticated).toBe(true);

      const actor: Actor = {
        authenticated: true,
        user: { id: admin.id, role: "admin" },
        moderatorBoards: [],
      };

      await banUser(db.prisma, actor, user.id, { reason: "violation" });

      const reqAfter = {
        cookies: {
          get: (name: string) => (name === SESSION_COOKIE_NAME ? { value: session.id } : undefined),
        },
      } as any;

      const after = await getAuthContext(reqAfter, db.prisma);
      expect(after.authenticated).toBe(false);

      await expect(
        login(db.prisma, { email: "u@example.com", password: "password123" }),
      ).rejects.toMatchObject({ code: "Forbidden" });
    } finally {
      await db.cleanup();
    }
  });
});
