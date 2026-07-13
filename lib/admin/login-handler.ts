import { NextResponse } from "next/server";
import type { RateLimitStore } from "@/lib/auth/rate-limit";
import { adminRateLimitKey } from "@/lib/auth/admin-rate-limit";
import {
  createAdminSessionCookie,
  createAdminSessionToken,
  registerAdminSession,
} from "@/lib/auth/admin-session";

type LoginInput = {
  password?: string;
};

type LoginHandlerDependencies = {
  adminPassword: string;
  secret: string;
  rateLimitStore: RateLimitStore;
  logger: Pick<Console, "error">;
};

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

export function createAdminLoginHandler({
  adminPassword,
  secret,
  rateLimitStore,
  logger,
}: LoginHandlerDependencies) {
  return async function adminLoginHandler(request: Request) {
    let body: LoginInput;
    try {
      body = (await request.json()) as LoginInput;
    } catch {
      return NextResponse.json({ error: "请求参数无效" }, { status: 400 });
    }

    const password = body.password?.trim() ?? "";
    if (!password) {
      return NextResponse.json({ error: "请输入管理员密码" }, { status: 400 });
    }

    const key = adminRateLimitKey(getClientIp(request));
    const blocked = rateLimitStore.isBlocked(key);
    if (blocked.blocked) {
      return NextResponse.json(
        { error: "登录尝试过于频繁，请稍后再试", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(blocked.retryAfterMs / 1000)) } }
      );
    }

    if (password !== adminPassword) {
      rateLimitStore.recordFailure(key);
      return NextResponse.json(
        { error: "密码错误", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    try {
      const session = createAdminSessionToken({ adminPassword, secret });
      registerAdminSession(session.sessionId);
      rateLimitStore.clear(key);

      const response = NextResponse.json({ ok: true });
      response.headers.set("Set-Cookie", createAdminSessionCookie(session.token));
      return response;
    } catch (error) {
      logger.error("Admin login failed", error);
      return NextResponse.json(
        { error: "登录失败，请稍后重试", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}
