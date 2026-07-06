import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("session tokens", () => {
  it("round-trips a user id", () => {
    const token = createSessionToken("user-123", "x".repeat(32));
    expect(verifySessionToken(token, "x".repeat(32))).toEqual({
      userId: "user-123"
    });
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken("user-123", "x".repeat(32));
    const tampered = `${token.slice(0, -1)}a`;

    expect(() => verifySessionToken(tampered, "x".repeat(32))).toThrow();
  });
});
