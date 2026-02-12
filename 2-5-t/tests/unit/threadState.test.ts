import { describe, expect, it } from "vitest";
import { canTransitionThread, transitionThread } from "@/src/domain/state-machines/threadState";

describe("thread state machine", () => {
  it("allows draft -> published", () => {
    expect(canTransitionThread("draft", "published")).toBe(true);
    expect(transitionThread("draft", "published")).toBe("published");
  });

  it("rejects published -> draft", () => {
    expect(canTransitionThread("published", "draft")).toBe(false);
    expect(() => transitionThread("published", "draft")).toThrow();
  });

  it("rejects hidden -> locked", () => {
    expect(canTransitionThread("hidden", "locked")).toBe(false);
    expect(() => transitionThread("hidden", "locked")).toThrow();
  });

  it("allows locked -> published", () => {
    expect(transitionThread("locked", "published")).toBe("published");
  });
});
