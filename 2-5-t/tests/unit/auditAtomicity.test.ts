import { describe, expect, it } from "vitest";
import { createTestDb } from "@/tests/helpers/testDb";

// This test asserts the key invariant: if audit write fails inside a transaction,
// the domain write must be rolled back.

describe("audit atomicity", () => {
  it("rolls back domain write when audit fails", async () => {
    const db = await createTestDb();
    db.pushSchema();

    try {
      await expect(
        db.prisma.$transaction(async (tx) => {
          await tx.board.create({
            data: {
              id: "b1",
              name: "Board 1",
              description: "test",
              isActive: true,
              sortOrder: 0,
            },
          });

          // Force an audit failure by violating a required field.
          await tx.auditLog.create({
            data: {
              actorId: null,
              action: null as any,
              targetType: "board",
              targetId: "b1",
            },
          });
        }),
      ).rejects.toBeTruthy();

      const board = await db.prisma.board.findUnique({ where: { id: "b1" } });
      expect(board).toBeNull();
    } finally {
      await db.cleanup();
    }
  });
});
