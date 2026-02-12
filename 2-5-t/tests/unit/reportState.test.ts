import { describe, expect, it } from "vitest";
import { resolveReport } from "@/src/domain/state-machines/reportState";

describe("report state machine", () => {
  it("pending -> accepted hides target", () => {
    const effect = resolveReport("pending", "accepted");
    expect(effect.status).toBe("accepted");
    expect(effect.shouldHideTarget).toBe(true);
  });

  it("pending -> rejected does not hide target", () => {
    const effect = resolveReport("pending", "rejected");
    expect(effect.status).toBe("rejected");
    expect(effect.shouldHideTarget).toBe(false);
  });

  it("rejects resolving non-pending", () => {
    expect(() => resolveReport("accepted", "rejected")).toThrow();
  });
});
