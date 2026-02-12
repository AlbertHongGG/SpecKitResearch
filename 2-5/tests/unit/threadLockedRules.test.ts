import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors/apiError";
import { assertThreadNotLocked } from "@/server/domain/threadState";

describe("US2 locked rules", () => {
  it("allows actions when published", () => {
    expect(() => assertThreadNotLocked("published")).not.toThrow();
  });

  it("forbids actions when locked", () => {
    expect(() => assertThreadNotLocked("locked")).toThrowError(ApiError);
    try {
      assertThreadNotLocked("locked");
    } catch (err) {
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    }
  });
});
