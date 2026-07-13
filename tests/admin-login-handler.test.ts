import { describe, expect, it, vi } from "vitest";
import type { RateLimitStore } from "@/lib/auth/rate-limit";
import { createAdminLoginHandler } from "@/lib/admin/login-handler";

function createRateLimitStoreSpy() {
  const isBlocked = vi.fn(() => ({ blocked: false, retryAfterMs: 0 }));
  const recordFailure = vi.fn(() => ({ blocked: false, retryAfterMs: 0 }));
  const clear = vi.fn();
  return { store: { isBlocked, recordFailure, clear } as RateLimitStore, isBlocked, recordFailure, clear };
}

describe("createAdminLoginHandler", () => {
  it("rejects an empty password", async () => {
    const rateLimit = createRateLimitStoreSpy();
    const handler = createAdminLoginHandler({
      adminPassword: "qwerty123",
      secret: "z".repeat(32),
      rateLimitStore: rateLimit.store,
      logger: { error: vi.fn() },
    });

    const response = await handler(new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "请输入管理员密码" });
  });

  it("returns a session cookie when the password is correct", async () => {
    const rateLimit = createRateLimitStoreSpy();
    const handler = createAdminLoginHandler({
      adminPassword: "qwerty123",
      secret: "z".repeat(32),
      rateLimitStore: rateLimit.store,
      logger: { error: vi.fn() },
    });

    const response = await handler(new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "qwerty123" }),
    }));

    expect(response.status).toBe(200);
    expect(rateLimit.clear).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("photo_admin_session=");
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("blocks repeated failures through the rate limit store", async () => {
    const rateLimit = createRateLimitStoreSpy();
    rateLimit.store.isBlocked = vi.fn(() => ({ blocked: true, retryAfterMs: 42_000 }));
    const handler = createAdminLoginHandler({
      adminPassword: "qwerty123",
      secret: "z".repeat(32),
      rateLimitStore: rateLimit.store,
      logger: { error: vi.fn() },
    });

    const response = await handler(new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    }));

    expect(response.status).toBe(429);
    expect(rateLimit.recordFailure).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ code: "RATE_LIMITED" });
  });
});
