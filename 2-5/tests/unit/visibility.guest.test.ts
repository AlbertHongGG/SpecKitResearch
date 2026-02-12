import { describe, expect, it } from "vitest";
import { canViewThread } from "@/server/domain/visibility";

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

describe("US1 Guest visibility", () => {
  it("guest can view published/locked, cannot view draft/hidden", () => {
    const board = makeBoard();

    expect(canViewThread(null, board, makeThread({ status: "published" }))).toBe(true);
    expect(canViewThread(null, board, makeThread({ status: "locked" }))).toBe(true);

    expect(canViewThread(null, board, makeThread({ status: "draft" }))).toBe(false);
    expect(canViewThread(null, board, makeThread({ status: "hidden" }))).toBe(false);
  });
});
