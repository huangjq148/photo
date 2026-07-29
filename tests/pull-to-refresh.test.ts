import { describe, expect, it } from "vitest";
import { getPullDistance } from "@/components/layout/pull-to-refresh";

describe("getPullDistance", () => {
  it("adds resistance to the pull gesture", () => {
    expect(getPullDistance(100)).toBe(42);
  });

  it("does not return a negative distance", () => {
    expect(getPullDistance(-100)).toBe(0);
  });

  it("caps very long pulls", () => {
    expect(getPullDistance(1000)).toBe(88);
  });
});
