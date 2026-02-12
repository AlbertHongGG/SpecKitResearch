import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";

export function listModeratorBoards(userId: string) {
  return withDbRetry(() =>
    prisma.moderatorAssignment.findMany({
      where: { userId },
      select: { boardId: true },
    }),
  );
}

export function setModeratorAssignment(data: { boardId: string; userId: string; action: "assign" | "remove" }) {
  if (data.action === "assign") {
    return withDbRetry(() =>
      prisma.moderatorAssignment.create({
        data: {
          boardId: data.boardId,
          userId: data.userId,
        },
      }),
    );
  }
  return withDbRetry(() =>
    prisma.moderatorAssignment.deleteMany({
      where: {
        boardId: data.boardId,
        userId: data.userId,
      },
    }),
  );
}
