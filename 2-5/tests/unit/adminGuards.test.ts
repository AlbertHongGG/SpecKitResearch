import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors/apiError";
import { requireAdmin } from "@/lib/rbac/guards";
import { makeViewer } from "./testUtils";

describe("US4: admin guards", () => {
  it("rejects unauthenticated viewer", () => {
    expect(() => requireAdmin(null)).toThrowError(ApiError);
    expect(() => requireAdmin(null)).toThrowError(/需要登入/);
  });

  it("rejects banned admin", () => {
    const viewer = makeViewer({ role: "admin", isBanned: true });
    expect(() => requireAdmin(viewer)).toThrowError(ApiError);
  });

  it("rejects non-admin", () => {
    const viewer = makeViewer({ role: "user" });
    expect(() => requireAdmin(viewer)).toThrowError(ApiError);
  });

  it("accepts admin", () => {
    const viewer = makeViewer({ role: "admin" });
    expect(requireAdmin(viewer)).toEqual(viewer);
  });
});
