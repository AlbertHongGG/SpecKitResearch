import { describe, expect, it } from "vitest";
import { makeViewer } from "./testUtils";
import { canModerateBoard } from "@/lib/rbac/permissions";

describe("US3 moderator board scope", () => {
  it("allows admin to moderate any board", () => {
    const admin = makeViewer({ role: "admin", moderatorBoards: [] });
    expect(canModerateBoard(admin, "b1")).toBe(true);
    expect(canModerateBoard(admin, "b2")).toBe(true);
  });

  it("allows moderator to moderate assigned boards only", () => {
    const mod = makeViewer({ role: "user", moderatorBoards: ["b1"] });
    expect(canModerateBoard(mod, "b1")).toBe(true);
    expect(canModerateBoard(mod, "b2")).toBe(false);
  });

  it("denies guests", () => {
    expect(canModerateBoard(null, "b1")).toBe(false);
  });
});
