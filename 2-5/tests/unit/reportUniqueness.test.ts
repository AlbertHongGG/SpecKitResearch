import { describe, expect, it } from "vitest";
import { idempotentCreateWithFallback } from "@/server/domain/idempotency";

describe("US3 report uniqueness", () => {
  it("treats unique constraint (P2002) as idempotent and returns existing", async () => {
    const res = await idempotentCreateWithFallback({
      create: async () => {
        const err: any = new Error("Unique constraint");
        err.code = "P2002";
        throw err;
      },
      getExisting: async () => ({ id: "r1", status: "pending" } as const),
    });

    expect(res.created).toBe(false);
    expect(res.value).toEqual({ id: "r1", status: "pending" });
  });

  it("returns created entity when no conflict", async () => {
    const res = await idempotentCreateWithFallback({
      create: async () => ({ id: "r2", status: "pending" } as const),
      getExisting: async () => null,
    });

    expect(res).toEqual({ created: true, value: { id: "r2", status: "pending" } });
  });
});
