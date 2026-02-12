import type { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ensureDbReady } from "@/src/infra/db/prisma";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { getActiveSession, SESSION_COOKIE_NAME } from "./sessionRepo";

export type AuthContext =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      user: {
        id: string;
        email: string;
        role: "user" | "admin";
        isBanned: boolean;
      };
      moderatorBoards: string[];
      sessionId: string;
    };

export async function getAuthContext(req: NextRequest, prisma: PrismaClient): Promise<AuthContext> {
  await ensureDbReady();

  const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return { authenticated: false };

  const session = await getActiveSession(prisma, sessionId);
  if (!session) return { authenticated: false };

  const user = session.user;
  if (user.isBanned) {
    throw new AppError(ErrorCodes.Forbidden, "User is banned");
  }

  const assignments = await prisma.moderatorAssignment.findMany({
    where: { userId: user.id },
    select: { boardId: true },
  });

  return {
    authenticated: true,
    sessionId,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
    },
    moderatorBoards: assignments.map((a) => a.boardId),
  };
}
