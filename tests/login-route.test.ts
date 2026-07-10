import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/api/errors";
import type { RateLimitStore } from "@/lib/auth/rate-limit";
import { createLoginHandler } from "@/lib/auth/login-handler";

function createRateLimitStoreSpy() {
  const isBlocked = vi.fn((_key: string) => ({ blocked: false, retryAfterMs: 0 }));
  const recordFailure = vi.fn((_key: string) => ({ blocked: false, retryAfterMs: 0 }));
  const clear = vi.fn((_key: string) => undefined);
  const store: RateLimitStore = { isBlocked, recordFailure, clear };

  return { store, isBlocked, recordFailure, clear };
}

function loginRequest(email: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "ValidPassword123!" }),
  });
}

describe("createLoginHandler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["不存在用户", "missing-route-user@example.com"],
    ["错误密码", "wrong-route-password@example.com"],
  ])("maps %s to the same safe 401 response", async (_label, email) => {
    const login = vi.fn().mockRejectedValue(
      new AppError("邮箱或密码错误", "INVALID_CREDENTIALS", 401)
    );
    const rateLimit = createRateLimitStoreSpy();
    const logger = { error: vi.fn() };
    const handler = createLoginHandler({
      login,
      rateLimitStore: rateLimit.store,
      logger,
    });

    const response = await handler(loginRequest(email));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "邮箱或密码错误",
      code: "INVALID_CREDENTIALS",
    });
    expect(rateLimit.recordFailure).toHaveBeenCalledOnce();
    expect(rateLimit.clear).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("maps an unknown database error to a safe 500 response", async () => {
    const databaseError = new Error("database connection failed");
    const login = vi.fn().mockRejectedValue(databaseError);
    const rateLimit = createRateLimitStoreSpy();
    const logger = { error: vi.fn() };
    const handler = createLoginHandler({
      login,
      rateLimitStore: rateLimit.store,
      logger,
    });

    const response = await handler(loginRequest("database-error@example.com"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "登录服务暂时不可用，请稍后再试",
      code: "INTERNAL_ERROR",
    });
    expect(rateLimit.recordFailure).not.toHaveBeenCalled();
    expect(rateLimit.clear).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("Login failed", databaseError);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("clears failures and sets the session cookie after a successful login", async () => {
    const login = vi.fn().mockResolvedValue({
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        email: "successful-login@example.com",
        nickname: "Successful User",
        avatarUrl: null,
        storageLimit: "10737418240",
        storageUsed: "0",
      },
      sessionToken: "signed-session-token",
      cookieName: "photo_session",
    });
    const rateLimit = createRateLimitStoreSpy();
    const logger = { error: vi.fn() };
    const handler = createLoginHandler({
      login,
      rateLimitStore: rateLimit.store,
      logger,
    });

    const response = await handler(loginRequest("successful-login@example.com"));

    expect(response.status).toBe(200);
    expect(rateLimit.clear).toHaveBeenCalledOnce();
    expect(rateLimit.recordFailure).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain("photo_session");
  });
});
