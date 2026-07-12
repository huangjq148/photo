import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

const TEST_SECRET = "x".repeat(32);

describe("session tokens", () => {
  it("round-trips user id and session version", () => {
    const token = createSessionToken("user-123", 1, TEST_SECRET);
    const result = verifySessionToken(token, 1, TEST_SECRET);
    expect(result.userId).toBe("user-123");
    expect(result.sessionVersion).toBe(1);
  });

  it("includes version, issuedAt and expiresAt in payload", () => {
    const token = createSessionToken("user-456", 3, TEST_SECRET);
    const [encoded] = token.split(".");
    const raw = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(Buffer.from(encoded, "base64url"))
      )
    );
    expect(raw.v).toBe(1); // version
    expect(raw.uid).toBe("user-456");
    expect(raw.sv).toBe(3); // sessionVersion
    expect(typeof raw.iat).toBe("number");
    expect(typeof raw.exp).toBe("number");
  });

  it("expires after 7 days", () => {
    const token = createSessionToken("user-789", 1, TEST_SECRET);
    const [encoded] = token.split(".");
    const raw = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(Buffer.from(encoded, "base64url"))
      )
    );
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(raw.exp - raw.iat).toBe(sevenDaysMs);
  });

  it("rejects expired token", () => {
    // Create a token that expires 1 second ago
    const pastPayload = {
      v: 1,
      uid: "expired-user",
      sv: 1,
      iat: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      exp: Date.now() - 1000, // 1 second ago
    };
    const encodedPast = Buffer.from(JSON.stringify(pastPayload)).toString("base64url");
    const sig = Buffer.from(
      createHmac("sha256", TEST_SECRET).update(encodedPast).digest()
    ).toString("base64url");
    const expiredToken = `${encodedPast}.${sig}`;

    expect(() => verifySessionToken(expiredToken, 1, TEST_SECRET)).toThrow(/过期/);
  });

  it("rejects token with mismatched session version", () => {
    const token = createSessionToken("user-abc", 1, TEST_SECRET);
    // Verify with a different session version
    expect(() => verifySessionToken(token, 2, TEST_SECRET)).toThrow(/版本不匹配/);
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken("user-123", 1, TEST_SECRET);
    const [encoded, signature] = token.split(".");
    const tamperedEncoded = `${encoded.slice(0, -1)}${encoded.slice(-1) === "a" ? "b" : "a"}`;
    const tampered = `${tamperedEncoded}.${signature}`;
    expect(() => verifySessionToken(tampered, 1, TEST_SECRET)).toThrow();
  });

  it("rejects token with wrong version number", () => {
    const wrongPayload = {
      v: 999,
      uid: "bad-version",
      sv: 1,
      iat: Date.now(),
      exp: Date.now() + 100000,
    };
    const encodedWrong = Buffer.from(JSON.stringify(wrongPayload)).toString("base64url");
    const sig = Buffer.from(
      createHmac("sha256", TEST_SECRET).update(encodedWrong).digest()
    ).toString("base64url");

    expect(() => verifySessionToken(`${encodedWrong}.${sig}`, 1, TEST_SECRET)).toThrow();
  });

  it("rejects malformed token", () => {
    expect(() => verifySessionToken("not-a-token", 1, TEST_SECRET)).toThrow();
    expect(() => verifySessionToken("a.b.c", 1, TEST_SECRET)).toThrow();
  });

  it("rejects token with missing fields", () => {
    const incompletePayload = {
      v: 1,
      uid: "incomplete",
      // missing sv, iat, exp
    };
    const encodedInc = Buffer.from(JSON.stringify(incompletePayload)).toString("base64url");
    const sig = Buffer.from(
      createHmac("sha256", TEST_SECRET).update(encodedInc).digest()
    ).toString("base64url");

    expect(() => verifySessionToken(`${encodedInc}.${sig}`, 1, TEST_SECRET)).toThrow();
  });
});
