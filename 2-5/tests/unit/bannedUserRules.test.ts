import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { ApiError } from "@/lib/errors/apiError";
import { authLogin } from "@/server/usecases/authLogin";
import { threadsCreate } from "@/server/usecases/threadsCreate";
import { makeViewer } from "./testUtils";

function uniq(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe("US4: banned user rules", () => {
  const createdUserEmails: string[] = [];
  const createdBoardIds: string[] = [];

  afterAll(async () => {
    // Best-effort cleanup
    await prisma.session.deleteMany({ where: { user: { email: { in: createdUserEmails } } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } }).catch(() => {});
    await prisma.board.deleteMany({ where: { id: { in: createdBoardIds } } }).catch(() => {});
  });

  it("banned user cannot login", async () => {
    const email = `${uniq("banned") }@example.com`;
    const password = "password-123";
    const passwordHash = await hashPassword(password);
    createdUserEmails.push(email);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "user",
        isBanned: true,
      },
    });

    await expect(authLogin({ email, password })).rejects.toBeInstanceOf(ApiError);
    await authLogin({ email, password }).catch((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(403);
      expect((err as ApiError).code).toBe("FORBIDDEN");
    });
  });

  it("banned user cannot create thread", async () => {
    const board = await prisma.board.create({
      data: {
        name: uniq("unit_board"),
        description: "unit test board",
        isActive: true,
        sortOrder: 999,
      },
    });
    createdBoardIds.push(board.id);

    const viewer = makeViewer({ isBanned: true });
    const req = new Request("http://localhost/api/threads", { method: "POST" });

    await expect(
      threadsCreate({
        req,
        viewer,
        boardId: board.id,
        title: "hello",
        content: "world",
        intent: "publish",
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await threadsCreate({
      req,
      viewer,
      boardId: board.id,
      title: "hello",
      content: "world",
      intent: "publish",
    }).catch((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(403);
      expect((err as ApiError).code).toBe("FORBIDDEN");
    });
  });
});
