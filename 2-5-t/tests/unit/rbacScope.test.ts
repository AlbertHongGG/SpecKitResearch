import { describe, expect, it } from "vitest";
import { requireModerationScope } from "@/src/domain/policies/moderatorScope";

describe("rbac + moderator scope", () => {
  it("admin passes any board", () => {
    expect(() =>
      requireModerationScope(
        {
          authenticated: true,
          user: { id: "u1", role: "admin" },
          moderatorBoards: [],
        },
        "b1",
      ),
    ).not.toThrow();
  });

  it("moderator passes assigned board", () => {
    expect(() =>
      requireModerationScope(
        {
          authenticated: true,
          user: { id: "u1", role: "user" },
          moderatorBoards: ["b1"],
        },
        "b1",
      ),
    ).not.toThrow();
  });

  it("moderator fails other board", () => {
    expect(() =>
      requireModerationScope(
        {
          authenticated: true,
          user: { id: "u1", role: "user" },
          moderatorBoards: ["b1"],
        },
        "b2",
      ),
    ).toThrow();
  });

  it("guest fails", () => {
    expect(() => requireModerationScope({ authenticated: false }, "b1")).toThrow();
  });
});
