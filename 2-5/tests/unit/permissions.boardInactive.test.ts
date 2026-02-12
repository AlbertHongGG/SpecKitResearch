import { describe, expect, it } from "vitest";
import { canPostToBoard, canReplyToThread } from "@/lib/rbac/permissions";
import { canViewThread } from "@/server/domain/visibility";
import { makeViewer } from "../unit/testUtils";

function makeBoard(params?: { id?: string; isActive?: boolean }) {
  return {
    id: params?.id ?? "b1",
    name: "Board",
    description: "",
    isActive: params?.isActive ?? true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeThread(params: { status: string; boardId?: string; authorId?: string }) {
  return {
    id: "t1",
    boardId: params.boardId ?? "b1",
    authorId: params.authorId ?? "u1",
    title: "Title",
    content: "Content",
    status: params.status,
    isPinned: false,
    isFeatured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Board inactive rules", () => {
  it("inactive board is readable but no interactions", () => {
    const viewer = makeViewer();
    const board = makeBoard({ isActive: false });
    const thread = makeThread({ status: "published", boardId: board.id });

    expect(canViewThread(null, board as any, thread as any)).toBe(true);
    expect(canViewThread(viewer as any, board as any, thread as any)).toBe(true);

    expect(canPostToBoard(viewer as any, board as any)).toBe(false);
    expect(canReplyToThread(viewer as any, board as any, thread as any)).toBe(false);
  });
});
