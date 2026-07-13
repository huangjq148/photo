import { describe, expect, it } from "vitest";
import {
  clearAdminSession,
  createAdminSessionToken,
  getAdminSessionCookieName,
  isAdminSessionTokenValid,
  registerAdminSession,
  revokeAdminSession,
  verifyAdminSessionToken,
} from "@/lib/auth/admin-session";

const TEST_SECRET = "y".repeat(32);

describe("admin session", () => {
  it("round-trips a signed admin session and stays valid until revoked", () => {
    const issued = createAdminSessionToken({
      adminPassword: "qwerty123",
      secret: TEST_SECRET,
      now: 1_000,
    });

    const parsed = verifyAdminSessionToken(issued.token, TEST_SECRET, 2_000);

    expect(parsed.sessionId).toBe(issued.sessionId);
    expect(parsed.expiresAt).toBeGreaterThan(2_000);
    expect(getAdminSessionCookieName()).toBe("photo_admin_session");
    expect(isAdminSessionTokenValid(issued.token, TEST_SECRET, 2_000)).toBe(true);

    registerAdminSession(issued.sessionId);
    expect(isAdminSessionTokenValid(issued.token, TEST_SECRET, 2_000)).toBe(true);

    revokeAdminSession(issued.sessionId);
    expect(isAdminSessionTokenValid(issued.token, TEST_SECRET, 2_000)).toBe(true);
  });

  it("creates a clear-cookie header that expires the admin session", () => {
    const header = clearAdminSession();
    expect(header).toContain("photo_admin_session=");
    expect(header).toContain("Max-Age=0");
  });
});
