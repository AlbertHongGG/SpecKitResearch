import { describe, expect, it } from "vitest";
import { validateReturnTo } from "@/src/infra/auth/returnTo";

describe("returnTo validation", () => {
  it("defaults to /", () => {
    expect(validateReturnTo(undefined)).toBe("/");
  });

  it("accepts in-site paths", () => {
    expect(validateReturnTo("/boards/123")).toBe("/boards/123");
  });

  it("rejects external URLs", () => {
    expect(() => validateReturnTo("https://evil.com")).toThrow();
  });

  it("rejects scheme-relative", () => {
    expect(() => validateReturnTo("//evil.com")).toThrow();
  });
});
