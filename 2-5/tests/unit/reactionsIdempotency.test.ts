import { describe, expect, it } from "vitest";
import { idempotentCreate } from "@/server/domain/idempotency";

describe("US2 reactions idempotency", () => {
  it("treats unique constraint (P2002) as success", async () => {
    const res = await idempotentCreate(async () => {
      const err: any = new Error("Unique constraint");
      err.code = "P2002";
      throw err;
    });

    expect(res).toEqual({ created: false });
  });

  it("rethrows non-unique errors", async () => {
    await expect(
      idempotentCreate(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
