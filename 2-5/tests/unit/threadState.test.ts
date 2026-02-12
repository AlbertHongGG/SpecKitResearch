import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors/apiError";
import { assertThreadStatusTransitionAllowed } from "@/server/domain/threadState";

describe("US2 thread state transitions", () => {
  it("allows draft -> published", () => {
    expect(() => assertThreadStatusTransitionAllowed("draft", "published")).not.toThrow();
  });

  it("forbids published -> draft", () => {
    expect(() => assertThreadStatusTransitionAllowed("published", "draft")).toThrowError(ApiError);
    try {
      assertThreadStatusTransitionAllowed("published", "draft");
    } catch (err) {
      expect(err).toMatchObject({ code: "CONFLICT" });
    }
  });
});
